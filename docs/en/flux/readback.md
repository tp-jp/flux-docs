<span id="非同期読み戻し"></span>

# Asynchronous readback

FluxReadback reads FluxBuffer data from GPU to CPU asynchronously. Check success in the completion callback before using the data.

<span id="要求を開始する"></span>

## Start a request

Add FluxReadback to a GameObject. Supply the Buffer and the UdonSharpBehaviour that receives completion notifications.

| Method | Behavior |
| --- | --- |
| `TryRequest(buffer, receiver)` | Returns true if accepted, false if rejected |
| `Request(buffer, receiver)` | No return value; calls TryRequest with the same acceptance rules |

A request is rejected if this Readback is busy, or if the Buffer or receiver is null. Rejected requests are not queued and do not trigger completion callbacks. They do not change the current request or previous result. Rejection is distinct from a GPU transfer failure.

<div class="development-figure">
  <a class="diagram-light" href="../../diagrams/flux-readback-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/flux-readback-en-light.svg" alt="TryRequest false means rejection with no callback. If true, wait for completion and check Succeeded. Consume Count elements of Data only on success." width="480" height="654" /></a>
  <a class="diagram-dark" href="../../diagrams/flux-readback-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/flux-readback-en-dark.svg" alt="TryRequest false means rejection with no callback. If true, wait for completion and check Succeeded. Consume Count elements of Data only on success." width="480" height="654" /></a>
</div>

<span id="完了イベントで結果を読む"></span>

## Read the result in the callback

Create FluxReadbackExample as a UdonSharp script, assign a Buffer that already contains data, and assign a Readback dedicated to this script.

```csharp
using TpLab.Flux.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxReadbackExample : UdonSharpBehaviour
{
    [SerializeField]
    FluxBuffer buffer;

    [SerializeField]
    FluxReadback readback;

    public void Read()
    {
        if (buffer == null || readback == null)
        {
            Debug.LogError("Assign Buffer and Readback.");
            return;
        }

        if (!readback.TryRequest(buffer, this))
        {
            Debug.LogWarning("Readback request was rejected.");
        }
    }

    public void _OnFluxReadbackComplete()
    {
        if (!readback.Succeeded)
        {
            Debug.LogError("GPU readback failed.");
            return;
        }

        var data = readback.Data;
        for (var i = 0; i < readback.Count; i++)
        {
            var value = (Vector4)data[i];
            Debug.Log($"Index {i}: {value}");
        }
    }
}
```

This example does not run automatically. Call Read() from a controlling UdonSharp script after Upload or Kernel execution. Sequence writes and requests explicitly instead of relying on Start order across separate scripts. See the [Quick start](./quickstart.md) for a self-contained example.

The callback must be exactly `public void _OnFluxReadbackComplete()` with no arguments. It runs on both success and failure, so check Succeeded before accessing Data. Keep the receiver alive until completion.

<span id="状態を確認する"></span>

## Check the state

| State | IsRequesting | Succeeded | HasError | Data |
| --- | --- | --- | --- | --- |
| No request yet | false | false | false | null |
| Accepted and pending | true | false | false | null |
| Completed successfully | false | true | false | Color array |
| Completed with failure | false | false | true | null |

An accepted new request resets the previous success/error flags. HasError being false alone does not indicate success: it is also false before a request and while pending.

The GPU error and data retrieval result are checked before notifying the receiver, so the callback sees the completed state.

<span id="countとdataの範囲"></span>

## Count and the Data range

Data is a Color array. Its RGBA components correspond to the original four-component values and can be cast to Vector4.

The array length matches Buffer Capacity at request time. readback.Count stores the valid count at acceptance time.

For Capacity 256 and Count 63, Data.Length is 256, but use only the first 63 elements. Changing Buffer.Count to 32 after requesting does not change this request's readback.Count. Use readback.Count as the loop limit, not the Buffer's current Count or Data.Length.

The entire texture is requested even for a smaller Count. Lowering Count alone does not reduce the transferred texture dimensions.

<span id="結果を保存する"></span>

## Save a result

Readback reuses its internal array for requests with the same capacity. Saving `var saved = readback.Data;` retains a reference, not a snapshot. Later readbacks overwrite the contents.

Copy the required elements to a separate array inside the completion callback, after checking Succeeded. Add this field to the previous class:

```csharp
// Class field
Vector4[] _saved;
```

Then, after checking Succeeded in the callback:

```csharp
// Run inside _OnFluxReadbackComplete after checking Succeeded
var count = readback.Count;
var data = readback.Data;
_saved = new Vector4[count];
for (var i = 0; i < count; i++)
{
    _saved[i] = (Vector4)data[i];
}
```

<span id="続けて読み戻す"></span>

## Make another request

One Readback cannot process multiple requests concurrently. Process the current result before starting the next. IsRequesting is already false when the callback runs, so a callback may submit another request.

Accepting a new request sets Data to null again and replaces Count and status. Finish reading or copying the current result first.

If multiple consumers share a Readback, coordinate requests and receivers in one place. Separate Readback components can serve independent consumers.

<span id="失敗時の扱い"></span>

## Handle failure

On failure, HasError is true and Data is null. Decide whether to stop or retry in your caller. FluxReadback has no automatic retry or cancellation API.

Keep the Buffer, receiver, and Readback alive during a request, and do not release the Buffer. If processing stays on the GPU, skip intermediate readbacks and request only the results needed by the CPU.
