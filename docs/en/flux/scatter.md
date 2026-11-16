# Accumulating into a grid with Scatter

`FluxScatter` distributes cell coordinates, signed float4 values, and a valid flag to eight neighboring cells using interpolation weights. Input semantics, selection, coordinate conversion, density units, and resolution compensation belong to the caller. Unlike [Reduction](./reduction.md), it does not reduce all inputs to one element.

## Setup and supported environment {#setup}

1. Prepare a [FluxGrid3D](./grid3d.md) and an output Buffer matching its atlas dimensions and Count.
2. Assign `Flux/Scatter` to a FluxKernel's Shader.
3. Assign the **Grid** and **Kernel** references on FluxScatter.
4. Prepare the Material through the normal SceneFlow / FluxBuildPass process.

The standard Shader uses **D3D11, Shader Model 5 tessellation, and a Geometry Shader**. This limits the standard Scatter backend, not Flux as a whole. Udon cannot detect Shader support, so restrict and verify the target environment.

## Standard Shader input {#input}

| Shader property | Data |
| --- | --- |
| `_FluxScatterPositions` | XYZ cell coordinates; W > 0 means valid |
| `_FluxScatterValues` | Signed float4 to accumulate |

Both Textures are loaded as row-major arrays. Their dimensions may differ. Filtering does not affect these loads. An index outside either Texture's capacity is ignored, but Buffer Count is not passed to the Shader. Specify a range within **both inputs' valid counts**. Keep input Textures separate from the output.

## Clear once, accumulate chunks {#accumulate}

| API | Contract |
| --- | --- |
| `TryClear(destination, pass)` | Run one clear pass; standard Shader Pass 0 |
| `TryAccumulate(destination, inputStart, inputCount, pass)` | Accumulate a range in one dispatch; standard Shader Pass 1 |
| `MaxInputCountPerDispatch` | 131,072 inputs; no automatic splitting |

Clear once, then accumulate each range into the same output. Clearing between ranges discards earlier contributions. Run this example after assigning references, initializing input data, and preparing the Material.

```csharp
scatterKernel.SetBuffer("_FluxScatterPositions", positions);
scatterKernel.SetBuffer("_FluxScatterValues", values);
if (!scatter.TryClear(destination, 0)) return;

var total = Mathf.Min(positions.Count, values.Count);
if (total > 16777216) return;
for (var start = 0; start < total;)
{
    var count = Mathf.Min(FluxScatter.MaxInputCountPerDispatch, total - start);
    if (!scatter.TryAccumulate(destination, start, count, 1)) return;
    start += count;
}
```

Ranges require `inputStart >= 0`, `0 <= inputCount <= 131072`, and `inputStart + inputCount <= 16777216`. Invalid ranges log an error and return false. A valid zero-count range returns true without validating the destination or Pass, allocating Textures, or drawing. Positive counts validate the layout, Pass, and output dimensions and Count. The Inspector's Grid and Kernel references are required.

Accumulation neither clears automatically nor changes output Count. True indicates validation and submission, not GPU completion or correct results. Floating-point rounding can depend on accumulation order.

## Boundaries and values {#boundary}

Integer coordinates represent cell centers. Contributions go to the floor cell and its next neighbor on each axis. For example, `(1.5, 1.5, 1.5)` distributes 1/8 to each of eight cells.

Out-of-bounds contributions are discarded without renormalizing remaining weights. NaN or infinite coordinates are ignored. Supply finite float4 values. Negative values are retained, with no color correction, averaging, or value clamping. Define any averaging or density conversion in your own processing.

## Read existing GPU data directly {#custom-reader}

`FluxScatter.hlsl` does not fix the input Texture layout. Starting from the standard Shader, implement `FluxScatterInput FluxScatterRead(uint index)` after the include, returning `cellPosition`, `value`, and `valid` from existing GPU data. A separate packing pass is not required.

```hlsl
#include "Packages/com.tplab.flux/Runtime/Shaders/FluxScatter.hlsl"
Texture2D<float4> _ExistingData;

FluxScatterInput FluxScatterRead(uint index)
{
    FluxScatterInput result = (FluxScatterInput)0;
    uint width, height;
    _ExistingData.GetDimensions(width, height);
    if (index >= width * height) return result;
    float4 item = _ExistingData.Load(int3(index % width, index / width, 0));
    result.cellPosition = item.xyz;
    result.value = float4(item.w, 0, 0, 0);
    result.valid = true;
    return result;
}
```

This is an **illustrative example** treating XYZ as cell coordinates and W as the accumulated value. Adapt units and selection to your data. Never read the destination atlas.

For the accumulation Pass, use `#pragma target 5.0` and the standard Shader's D3D11 restriction. Set vertex / hull / domain / geometry / fragment to `FluxScatterVertex` / `FluxScatterHull` / `FluxScatterDomain` / `FluxScatterGeometry` / `FluxScatterFragment`. Use `Cull Off ZWrite Off ZTest Always Blend One One`. Provide a separate clear Pass that writes zero to all pixels with `Blend Off`.

TryAccumulate sets `_FluxGridSize`, `_FluxGridLayout`, and `_FluxScatterRange`. Bind custom Textures and parameters yourself. See the [grid workflow example](./grid-workflow.md) for subsequent filtering and Buffer swaps.
