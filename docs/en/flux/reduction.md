<span id="reductionによる集約"></span>

# Aggregation with reduction

FluxReduction combines Buffer elements in stages and writes a single result to another Buffer. The reduction shader defines the operation, such as sum or maximum.

<span id="集約の流れ"></span>

## Reduction stages

Reduction Factor is the number of input elements combined per output element in one pass. For 250 inputs and a factor of 4:

<div class="development-figure">
  <a class="diagram-light" href="../../diagrams/flux-reduction-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/flux-reduction-en-light.svg" alt="Reduce Source Count 250 through Workspace A 63, Workspace B 16, Workspace A 4, then write one result to Destination" width="480" height="632" /></a>
  <a class="diagram-dark" href="../../diagrams/flux-reduction-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/flux-reduction-en-dark.svg" alt="Reduce Source Count 250 through Workspace A 63, Workspace B 16, Workspace A 4, then write one result to Destination" width="480" height="632" /></a>
</div>

Each stage uses `ceil(input Count / Reduction Factor)`. Partial groups still produce one element. FluxReduction changes intermediate counts, swaps workspaces, and sets destination Count to 1 for the final pass.

<span id="コンポーネントを準備する"></span>

## Prepare the components

For a sum of 250 elements:

| Component | Setting |
| --- | --- |
| Source | FluxBuffer, Initial Count 250 |
| Destination | FluxBuffer, Initial Count 1 |
| Workspace A | FluxBuffer, Initial Count 63 |
| Workspace B | FluxBuffer, Initial Count 63 |
| Reduction Kernel | FluxKernel using FluxSum4.shader below |
| FluxReduction | Assign the Kernel and both workspaces; set Reduction Factor to 4 |

All four Buffers must be separate components. Workspaces need no initial upload because the passes write their required regions.

<span id="作業用bufferの容量"></span>

### Workspace capacity

Both workspaces need Capacity of at least `ceil(Source.Count / Reduction Factor)`. Here that is 63; Initial Count 63 allocates an 8×8 texture with Capacity 64.

Both workspace references and capacity checks are required even when one is unused, including when Source.Count is at most Reduction Factor.

Allocate for the largest source count you plan to process. Reduction changes workspace Count, not capacity.

<span id="_4要素ずつ合計するシェーダー"></span>

## Sum four elements per pass

Create FluxSum4.shader in Assets. This shader sums each of the four components independently.

```hlsl
Shader "Flux/Examples/Sum4"
{
    Properties
    {
        _MainTex ("Source", 2D) = "black" {}
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

            float4 frag(v2f_img i) : SV_Target
            {
                uint destinationIndex = FluxGetDestinationIndex(i.uv);
                if (!FluxIsDestinationValid(destinationIndex))
                    return 0;

                uint sourceIndex = destinationIndex * 4;
                float4 result = 0;
                for (uint j = 0; j < 4; j++)
                {
                    uint index = sourceIndex + j;
                    if (FluxIsSourceValid(index))
                    {
                        result += tex2D(_MainTex, FluxGetSourceUV(index));
                    }
                }
                return result;
            }
            ENDHLSL
        }
    }
}
```

Output index 0 reads inputs 0–3, output index 1 reads inputs 4–7, and so on. FluxIsSourceValid excludes invalid elements in the final partial group.

**The shader's group size must match Reduction Factor.** This shader requires 4. Changing the Inspector factor to 8 also requires changing the shader's starting-index multiplier and loop limit. FluxReduction does not send its factor as a shader parameter.

<span id="合計を求めて読み戻す"></span>

## Sum and read back

Prepare [FluxUpload](./upload.md), its Kernel, and [FluxReadback](./readback.md). Create FluxReductionExample as a UdonSharp script, attach it, and assign all references.

```csharp
using TpLab.Flux.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxReductionExample : UdonSharpBehaviour
{
    [SerializeField]
    FluxBuffer source;

    [SerializeField]
    FluxBuffer destination;

    [SerializeField]
    FluxUpload upload;

    [SerializeField]
    FluxReduction reduction;

    [SerializeField]
    FluxReadback readback;

    void Start()
    {
        if (source == null || destination == null || upload == null ||
            reduction == null || readback == null || source == destination)
        {
            Debug.LogError("Assign all references and separate input and output Buffers.");
            return;
        }
        if (source.Count != 250)
        {
            Debug.LogError("Set Source Initial Count to 250.");
            return;
        }

        var values = new Vector4[250];
        for (var i = 0; i < values.Length; i++)
        {
            values[i] = new Vector4(i + 1, 0, 0, 0);
        }
        upload.Upload(values, source);
        reduction.Reduce(source, destination);
        if (!readback.TryRequest(destination, this))
        {
            Debug.LogError("Readback request was rejected.");
        }
    }

    public void _OnFluxReadbackComplete()
    {
        if (!readback.Succeeded || readback.Count != 1)
        {
            Debug.LogError("Could not retrieve the reduction result.");
            return;
        }

        var sum = readback.Data[0].r;
        if (Mathf.Abs(sum - 31375f) <= 0.01f)
        {
            Debug.Log("PASS: The sum from 1 to 250 is 31375.");
        }
        else
        {
            Debug.LogError($"Expected 31375, got {sum}.");
        }
    }
}
```

Run with normal scene reload enabled and check the Console PASS message. The expected result is `(31375, 0, 0, 0)`.

Reduce has no return value or completion callback. Readback can succeed even if an earlier configuration error stopped reduction. Check Console errors as well as the returned data.

<span id="最大値や平均値へ応用する"></span>

## Compute a maximum or average

For a maximum, replace addition with component-wise max. Initialize from the first valid element, not zero; zero would be wrong if every input is negative.

Replace the shader's `float4 result = 0;` through the loop with this, keeping Reduction Factor at 4. With the correct output Count, every valid output group has at least one valid input.

```hlsl
float4 result = tex2D(_MainTex, FluxGetSourceUV(sourceIndex));
for (uint j = 1; j < 4; j++)
{
    uint index = sourceIndex + j;
    if (FluxIsSourceValid(index))
    {
        result = max(result, tex2D(_MainTex, FluxGetSourceUV(index)));
    }
}
```

This compares components independently. It does not select the entire Vector4 whose X component is greatest.

For an average, sum first and divide by the original element count. Averaging at each intermediate stage gives partial groups the wrong weight. Save the original Count before reduction if you may change it later.

Floating-point sums can differ from a sequential CPU sum because the operation order changes. Compare using a suitable tolerance.

<span id="実行条件と注意点"></span>

## Requirements and precautions

| Requirement | Value |
| --- | --- |
| Source.Count | At least 1 |
| Reduction Factor | At least 2, matching the shader |
| Destination.Capacity | At least 1 |
| Each workspace Capacity | At least `ceil(Source.Count / Reduction Factor)` |
| Separation | Source, destination, and both workspaces must all be distinct |
| References | Assign all Buffers, the Kernel, and Shader |

Null references are not comprehensively validated. The final Kernel runs even for one source element; it is not a simple copy, so the shader must handle that case.

Source.Count is unchanged. Used workspace counts and contents are modified, so do not use them to store unrelated data. The destination result can be passed directly to another GPU computation.
