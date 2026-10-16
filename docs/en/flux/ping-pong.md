<span id="ping-pongによる反復計算"></span>

# Iterative computation with ping-pong

To use the previous result as the next input, alternate two Buffers between input and output. This is called ping-pong. Flux implements it with Kernel Dispatch and reference swapping, not a dedicated component.

<span id="入力と出力を切り替える"></span>

## Alternate input and output

Do not use the same Buffer as both input and output.

| Stage | Input | Output | Latest result |
| --- | --- | --- | --- |
| Initialize | CPU array or other source | A | A |
| First pass | A | B | B |
| Second pass | B | A | A |
| Third pass | A | B | B |

No CPU readback is necessary between passes. Pass each output directly to the next Dispatch.

<span id="_2倍の計算を3回実行する"></span>

## Double the values three times

This example initializes four elements and doubles every component three times, producing eight times the original values.

<span id="シーンを準備する"></span>

### Prepare the scene

Set up Upload and Readback as in the [Quick start](./quickstart.md).

| Component | Setting |
| --- | --- |
| Buffer A, Buffer B | Two separate FluxBuffers, both with Initial Count 4 |
| Upload Kernel | Flux/Upload shader |
| FluxUpload | Assign the upload Kernel |
| Computation Kernel | Assign [FluxScale.shader](./kernels.md#scale-shader) |
| FluxReadback | Dedicated to this example |

The computation shader writes every valid output element. B does not need an initial upload because it is fully written before being read.

<span id="スクリプトを追加する"></span>

### Add the script

Create FluxPingPongExample as a UdonSharp script, attach it, and assign its references. Run in Play Mode with scene reload enabled.

```csharp
using TpLab.Flux.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxPingPongExample : UdonSharpBehaviour
{
    [SerializeField]
    FluxBuffer bufferA;

    [SerializeField]
    FluxBuffer bufferB;

    [SerializeField]
    FluxUpload upload;

    [SerializeField]
    FluxKernel kernel;

    [SerializeField]
    FluxReadback readback;

    void Start()
    {
        if (bufferA == null || bufferB == null || upload == null ||
            kernel == null || readback == null || bufferA == bufferB)
        {
            Debug.LogError("Assign all references and separate Buffers A and B.");
            return;
        }
        if (bufferA.Capacity < 4 || bufferB.Capacity < 4)
        {
            Debug.LogError("Both Buffers need capacity for four elements.");
            return;
        }

        bufferA.SetCount(4);
        bufferB.SetCount(4);
        var values = new Vector4[4];
        for (var i = 0; i < values.Length; i++)
        {
            values[i] = new Vector4(i, i, i, 1f);
        }
        upload.Upload(values, bufferA);
        kernel.SetFloat("_Scale", 2f);

        var current = bufferA;
        var next = bufferB;
        for (var step = 0; step < 3; step++)
        {
            kernel.Dispatch(current, next);
            var previous = current;
            current = next;
            next = previous;
        }

        if (!readback.TryRequest(current, this))
        {
            Debug.LogError("Readback request was rejected.");
        }
    }

    public void _OnFluxReadbackComplete()
    {
        if (!readback.Succeeded)
        {
            Debug.LogError("Readback failed.");
            return;
        }
        var data = readback.Data;
        for (var i = 0; i < readback.Count; i++)
        {
            Debug.Log($"Index {i}: {(Vector4)data[i]}");
        }
    }
}
```

Expected results, including W doubled to 8:

| Index | Result |
| --- | --- |
| 0 | `(0, 0, 0, 8)` |
| 1 | `(8, 8, 8, 8)` |
| 2 | `(16, 16, 16, 8)` |
| 3 | `(24, 24, 24, 8)` |

<span id="最新の結果を参照する"></span>

## Reference the latest result

Only the C# Buffer references are swapped; this does not copy textures or move data. After each swap, current points to the latest result.

Reading A unconditionally gives the previous result after an odd number of passes. Use current for readback, rendering, or the next Kernel input.

Also reassign additional Kernel inputs with `SetBuffer("_InputB", current)`. Previously assigned texture references do not follow a C# variable swap.

<span id="毎フレーム続ける場合"></span>

## Continue across frames

Store current and next as class fields. Upload initial values once, then dispatch and swap in Update or another repeated operation. Uploading the initial values every frame would discard the iterative state.

Match both capacities and update both counts when changing the valid range. Increasing Count does not initialize new elements; provide valid data for every input the shader reads.

Manage [readback](./readback.md) acceptance and completion instead of submitting a request every frame while one is pending.

<span id="次に読む"></span>

## Next steps

Use [Aggregation with reduction](./reduction.md) to turn many computed values into a sum or maximum.
