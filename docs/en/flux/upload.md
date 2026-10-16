<span id="アップロード"></span>

# Uploading data

FluxUpload transfers a CPU-side Vector4 array to a FluxBuffer, providing input data or initial state for GPU computation.

<span id="コンポーネントを準備する"></span>

## Prepare the components

| Component | Setting |
| --- | --- |
| FluxBuffer | Set Initial Count to the number of elements |
| FluxKernel | Assign `Runtime/Shaders/FluxUpload.shader` from Flux |
| FluxUpload | Assign that Kernel to Upload Kernel |

The shader is named Flux/Upload. [SceneFlow](./installation.md#preparation-by-sceneflow) generates its Material, so upload after runtime preparation is complete.

<span id="配列を転送する"></span>

## Upload an array

Create the following UdonSharp script and attach it to a GameObject. Assign Buffer and Upload, and set the Buffer's Initial Count to 4.

```csharp
using TpLab.Flux.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxUploadExample : UdonSharpBehaviour
{
    [SerializeField]
    FluxBuffer buffer;

    [SerializeField]
    FluxUpload upload;

    void Start()
    {
        if (buffer == null || upload == null)
        {
            Debug.LogError("Assign Buffer and Upload.");
            return;
        }

        var values = new Vector4[4];
        for (var i = 0; i < values.Length; i++)
        {
            values[i] = new Vector4(i, i * 2f, i * 3f, 1f);
        }

        if (buffer.Count != values.Length)
        {
            Debug.LogError("Match the array length to Buffer Count.");
            return;
        }

        upload.Upload(values, buffer);
    }
}
```

Array indices map directly to Buffer indices. This writes `(0, 0, 0, 1)`, `(1, 2, 3, 1)`, `(2, 4, 6, 1)`, and `(3, 6, 9, 1)`.

<span id="転送できる条件"></span>

## Upload requirements

| Requirement | Value |
| --- | --- |
| Array length | Must match destination Count |
| Per-upload limit | At most 512 elements |
| References | Array, destination, Upload Kernel, and Kernel Shader must be assigned |

Upload checks array length and the upper limit. On failure it logs an error and returns without dispatching. It does not check null references.

Upload has no return value or completion event. To verify the data, use [readback](./readback.md).

<span id="countと容量を混同しない"></span>

### Count is not capacity

Initial Count 5 produces Count 5 and Capacity 9. Upload a five-element array, not a nine-element array.

To change the valid count, call SetCount before upload. This snippet assumes buffer, upload, and values are prepared:

```csharp
if (values.Length > 512 || values.Length > buffer.Capacity)
{
    Debug.LogError("Upload limit or Buffer capacity exceeded.");
    return;
}

buffer.SetCount(values.Length);
upload.Upload(values, buffer);
```

SetCount cannot expand capacity; see [Buffers](./buffers.md#count-and-capacity). The 512-element limit applies to FluxUpload, not to FluxBuffer capacity in general.

<span id="書き込まれる範囲"></span>

## Which pixels are written

Upload sets `_FluxUploadData` on the Kernel and dispatches it. The standard shader writes array values inside Count and zero outside Count.

There is no offset, partial update, or append argument. Uploading a shorter array after reducing Count does not preserve the remaining contents; without adjusting Count, the array is rejected. Splitting a larger array into consecutive uploads to the same Buffer does not append the chunks.

<span id="転送後に計算する"></span>

## Compute after uploading

Pass the uploaded Buffer to the next Kernel. Here source and destination are separate Buffers with suitable counts and capacities:

```csharp
upload.Upload(values, source);
kernel.Dispatch(source, destination);
```

No intermediate readback is needed if computation stays on the GPU. If the CPU needs the result, request readback from the final output. The [Quick start](./quickstart.md) provides a complete setup and comparison example.
