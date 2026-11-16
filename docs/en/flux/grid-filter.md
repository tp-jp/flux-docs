# Smoothing one axis with Grid Filter

`FluxGridFilter` smooths one X, Y, or Z axis of a [3D grid](./grid3d.md), using symmetric weights at the center and up to three cells on either side. Each call executes one axis in one Pass.

## Setup and API {#setup}

Assign `Flux/GridFilter` to a FluxKernel's Shader, then assign the **Grid** and **Kernel** references on FluxGridFilter. SceneFlow / FluxBuildPass prepares the Material. Input and output Buffers must match the atlas dimensions with Count = AtlasCapacity and use **different Textures**. No working Buffers are allocated internally.

```csharp
var weights = new Vector4(0.5f, 0.25f, 0f, 0f);
if (!filter.TryFilter(source, destination, FluxGridAxis.X,
    FluxGridBoundaryMode.Zero, weights, 0)) return;
```

`TryFilter(source, destination, axis, boundary, weights, pass)` validates the axis, boundary mode, weights, layout, Material and Pass, Buffer dimensions and counts, and Texture separation. The standard Shader uses Pass 0. On success it overwrites the entire output atlas, writing zero to unused tiles. It does not change Count or perform a separate clear. True means a Dispatch was issued, not that GPU work has completed.

## Weights {#weights}

| Vector4 component | Contribution |
| --- | --- |
| x | Center cell |
| y | Each neighbor at −1 and +1 |
| z | Each neighbor at −2 and +2 |
| w | Each neighbor at −3 and +3 |

Each weight must be finite and nonnegative, and the sum `x + 2 * (y + z + w)` must be finite. All-zero weights are allowed. There is no automatic normalization; choose weights totaling 1 if you want to preserve scale.

| Support | Normalized example |
| --- | --- |
| 3 points | `(1/2, 1/4, 0, 0)` |
| 5 points | `(6/16, 4/16, 1/16, 0)` |
| 7 points | `(20/64, 15/64, 6/64, 1/64)` |

In C#, use floating-point expressions such as `1f / 2f`. The same weights apply to each signed float4 component. No value clamping, density compensation, or application-specific composition is added.

## Boundaries and axis order {#boundary}

- `FluxGridBoundaryMode.Zero`: read zero outside bounds, without renormalizing surviving weights. Even a constant field can decrease near edges.
- `FluxGridBoundaryMode.Clamp`: clamp coordinates to edge cells, without clamping values.

The caller chooses the order of `FluxGridAxis.X`, `Y`, and `Z` and the iteration count. Swap input and output after each axis so the next axis reads the latest result. The [grid workflow example](./grid-workflow.md) uses [FluxPingPong](./ping-pong.md#component).

## Integrate into your Shader {#hlsl}

Use `FluxGridFilterAxis(inputTexture, grid, cell, axis, weights, clampBoundary)` from `Packages/com.tplab.flux/Runtime/Shaders/FluxGridFilter.hlsl` to combine filtering with subsequent calculations in one Pass.

```hlsl
#include "Packages/com.tplab.flux/Runtime/Shaders/FluxGridFilter.hlsl"
Texture2D<float4> _MainTex;
float4 _FluxGridSize;
float4 _FluxGridLayout;
float4 _FluxGridFilterAxis;
float4 _FluxGridFilterWeights;
float _FluxGridFilterBoundary;

float4 FilterCell(int3 cell)
{
    FluxGrid3DLayout grid = FluxGrid3DMakeLayout(_FluxGridSize, _FluxGridLayout);
    return FluxGridFilterAxis(_MainTex, grid, cell, (int3)_FluxGridFilterAxis.xyz,
        _FluxGridFilterWeights, _FluxGridFilterBoundary != 0);
}
```

This is a helper function inside a Shader. In the fragment function, convert the output pixel to a cell with `FluxGrid3DPixelToCell`. The standard Shader uses target 3.5 and `Cull Off ZWrite Off ZTest Always Blend Off`. A custom Shader called through `TryFilter` must keep the same uniform names and meanings. The axis must be exactly `(1,0,0)`, `(0,1,0)`, or `(0,0,1)`.

When calling HLSL helpers directly, validate layout, weights, and other inputs yourself. Integer loads make filtering independent of Texture filter settings. Overlap with additional input Textures is not checked automatically. Measure on the target GPU before concluding that combining work into one Pass improves performance.
