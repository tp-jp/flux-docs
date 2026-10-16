<span id="kernelとシェーダー"></span>

# Kernels and shaders

FluxKernel executes a shader to write computation results to a Buffer. Set parameters from UdonSharp, then call Dispatch.

<span id="kernelを準備する"></span>

## Prepare a Kernel

1. Add FluxKernel to a GameObject.
2. Assign your computation Shader asset to **Shader** in the Inspector.
3. Prepare separate input and output FluxBuffers.

[SceneFlow](./installation.md#preparation-by-sceneflow) generates the Material. Set parameters and dispatch only after this preparation has completed at runtime.

<span id="dispatchで実行する"></span>

## Execute with Dispatch

| Call | Purpose |
| --- | --- |
| `kernel.Dispatch(destination)` | Generate values without a primary input Buffer, such as initialization or upload |
| `kernel.Dispatch(source, destination)` | Read source and write results to destination |

With an input Buffer, its texture is passed as `_MainTex`. Internally, VRCGraphics.Blit runs the shader, and fragment return values are written to output pixels.

Use different input and output Buffers. Do not read from and write to the same texture. For repeated computation, alternate the roles of two Buffers.

<span id="出力先のcountを設定する"></span>

### Set the output Count

Dispatch does not change destination Count or Capacity. For one-to-one processing, allocate enough capacity and match the counts. This example assumes the component references are assigned.

```csharp
if (destination.Capacity < source.Count)
{
    Debug.LogError("Insufficient output capacity.");
    return;
}

destination.SetCount(source.Count);
kernel.SetFloat("_Scale", 2f);
kernel.Dispatch(source, destination);
```

Dispatch does not validate null references, input/output overlap, or matching counts. Check references and counts in the caller and valid ranges in the shader.

## A shader that doubles each element {#scale-shader}

Create `FluxScale.shader` in your project's Assets folder. This example multiplies all four components by `_Scale`.

```hlsl
Shader "Flux/Examples/Scale"
{
    Properties
    {
        _MainTex ("Input", 2D) = "black" {}
        _Scale ("Scale", Float) = 1
    }

    SubShader
    {
        Cull Off
        ZWrite Off
        ZTest Always

        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag

            #include "UnityCG.cginc"
            #include "Packages/com.tplab.flux/Runtime/Shaders/FluxCommon.hlsl"

            sampler2D_float _MainTex;
            float _Scale;

            float4 frag(v2f_img i) : SV_Target
            {
                uint index = FluxGetDestinationIndex(i.uv);
                if (!FluxIsDestinationValid(index))
                    return 0;
                if (!FluxIsSourceValid(index))
                    return 0;

                float4 value = tex2D(_MainTex, FluxGetSourceUV(index));
                return value * _Scale;
            }
            ENDHLSL
        }
    }
}
```

Cull Off, ZWrite Off, and ZTest Always keep data writes independent of face orientation and depth. This example uses one pass. FluxKernel has no argument for selecting a pass number.

<span id="クイックスタートで試す"></span>

### Try it in the quick start

Extend the [Quick start](./quickstart.md):

1. Create a Result GameObject with FluxBuffer and set Initial Count to 4.
2. Create ScaleKernel with FluxKernel and assign FluxScale.shader.
3. Add these two fields to FluxQuickStart and assign their references in the Inspector.

```csharp
[SerializeField]
FluxBuffer result;

[SerializeField]
FluxKernel scaleKernel;
```

Keep `upload.Upload(_expected, buffer);` in Start. Replace the code after it, through the readback request, with:

```csharp
if (result == null || scaleKernel == null || result == buffer)
{
    Debug.LogError("Assign the compute Kernel and an output Buffer separate from the input.");
    return;
}
if (result.Capacity < buffer.Count)
{
    Debug.LogError("Insufficient output Buffer capacity.");
    return;
}

result.SetCount(buffer.Count);
scaleKernel.SetFloat("_Scale", 2f);
scaleKernel.Dispatch(buffer, result);

// Also double the expected values used for comparison on completion
for (var i = 0; i < _expected.Length; i++)
{
    _expected[i] = _expected[i] * 2f;
}

if (!readback.TryRequest(result, this))
{
    Debug.LogError("Readback request was rejected.");
}
```

Keep the completion comparison unchanged. Change the final success message to `PASS: All four doubled values match.` In Play Mode, expect `(0, 0, 0, 0)`, `(2, 4, 6, 8)`, `(4, 8, 12, 16)`, and `(6, 12, 18, 24)`.

## Indices and valid ranges {#indices-and-bounds}

FluxCommon.hlsl provides these helpers:

| Function | Purpose |
| --- | --- |
| `FluxGetDestinationIndex(uv)` | Convert destination UV to an element index |
| `FluxGetDestinationUV(index)` | Get destination pixel-center UV |
| `FluxIsDestinationValid(index)` | Check whether the index is within destination Count |
| `FluxGetSourceUV(index)` | Get primary-input pixel-center UV |
| `FluxIsSourceValid(index)` | Check whether the index is within source Count |

UV conversion functions do not validate ranges. Check before reading. Pixels outside destination Count are still rendered; this example writes zero to them.

Dispatch automatically supplies the following parameters. Do not overwrite them with application parameters.

| Parameter | Value |
| --- | --- |
| `_FluxDestinationCount` | Valid destination element count |
| `_FluxDestinationWidth`, `_FluxDestinationHeight` | Destination texture dimensions |
| `_FluxSourceCount` | Valid primary-input element count |
| `_FluxSourceWidth`, `_FluxSourceHeight` | Primary-input texture dimensions |

Source metadata updates only with Dispatch(source, destination). Dispatch(destination) does not set or reset it, so use a shader that does not depend on primary-input helpers or `_MainTex`.

<span id="パラメーターを渡す"></span>

## Pass parameters

| Method | Value |
| --- | --- |
| `SetFloat(name, value)` | float |
| `SetVector(name, value)` | Vector4 |
| `SetVectorArray(name, values)` | Vector4 array |
| `SetTexture(name, texture)` | Texture |
| `SetBuffer(name, buffer)` | The Buffer's Texture |

Use the shader's internal name, such as `_Scale`, not its Inspector display label. Values remain on the Kernel's Material; update them as needed when reusing a Kernel.

SetVectorArray requires a matching shader array declaration. For ordinary array-to-Buffer transfers, FluxUpload includes the upload shader workflow and count validation.

<span id="追加のbufferを入力にする"></span>

## Use an additional input Buffer

To add two Buffers, pass the primary input through Dispatch and assign the other with SetBuffer:

```csharp
addKernel.SetBuffer("_InputB", bufferB);
addKernel.Dispatch(bufferA, destination);
```

Declare the `_InputB` Texture property and `sampler2D_float _InputB;` in the shader. With matching widths, heights, and counts, use this after checking the valid range:

```hlsl
float2 uv = FluxGetSourceUV(index);
float4 a = tex2D(_MainTex, uv);
float4 b = tex2D(_InputB, uv);
return a + b;
```

SetBuffer assigns only the texture. It does not send B's dimensions or Count, and FluxGetSourceUV uses A's dimensions. For differently sized inputs, pass B's dimensions and valid count explicitly and implement its UV and range checks. Additional inputs must also be separate from the output.

<span id="結果を確認する"></span>

## Check the result

Results remain on the GPU. Pass the output to another Kernel or read it back when the CPU needs it. See [Uploading data](./upload.md) and [Asynchronous readback](./readback.md).
