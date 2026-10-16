<span id="fluxのクイックスタート"></span>

# Flux quick start

Upload four `Vector4` values to the GPU, read them back asynchronously, and compare them with the originals. This minimal example connects FluxBuffer, FluxKernel, FluxUpload, and FluxReadback.

Complete [Installation](./installation.md) first. Results appear in the Console, so no rendering object is needed.

<span id="シーンにコンポーネントを配置する"></span>

## Add components to the scene

Create four empty GameObjects with these names and components. The scripts are in the Flux package's `Runtime/Udon` folder.

| GameObject | Component | Inspector setting |
| --- | --- | --- |
| `Buffer` | `FluxBuffer` | Set **Initial Count** to `4` |
| `UploadKernel` | `FluxKernel` | Assign `Runtime/Shaders/FluxUpload.shader` to **Shader** |
| `Upload` | `FluxUpload` | Assign UploadKernel's FluxKernel to **Upload Kernel** |
| `Readback` | `FluxReadback` | No additional settings |

The upload shader is named `Flux/Upload`. Assign the Shader asset directly.

Initial Count sets the initial number of valid elements. A value of 4 allocates a 2×2 RenderTexture, with both Count and Capacity equal to 4. The default value of 1 cannot accept this example's array.

<span id="実行用スクリプトを作る"></span>

## Create the script

In your project's Assets folder, choose **Create → U# Script**, name it `FluxQuickStart`, and replace its C# contents with the following. Keep the generated UdonSharp Program Asset, and keep the filename and class name identical.

```csharp
using TpLab.Flux.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxQuickStart : UdonSharpBehaviour
{
    [SerializeField]
    FluxBuffer buffer;

    [SerializeField]
    FluxUpload upload;

    [SerializeField]
    FluxReadback readback;

    Vector4[] _expected;

    void Start()
    {
        if (buffer == null || upload == null || readback == null)
        {
            Debug.LogError("[FluxQuickStart] Assign the Inspector references.");
            return;
        }

        if (buffer.Count != 4)
        {
            Debug.LogError("[FluxQuickStart] Set the Buffer Initial Count to 4.");
            return;
        }

        _expected = new Vector4[4];
        for (var i = 0; i < _expected.Length; i++)
        {
            _expected[i] = new Vector4(i, i * 2f, i * 3f, i * 4f);
        }

        upload.Upload(_expected, buffer);

        if (!readback.TryRequest(buffer, this))
        {
            Debug.LogError("[FluxQuickStart] Readback request was rejected.");
        }
    }

    public void _OnFluxReadbackComplete()
    {
        if (!readback.Succeeded)
        {
            Debug.LogError("[FluxQuickStart] GPU readback failed.");
            return;
        }

        var data = readback.Data;
        if (readback.Count != _expected.Length)
        {
            Debug.LogError("[FluxQuickStart] Readback element count does not match.");
            return;
        }

        for (var i = 0; i < readback.Count; i++)
        {
            var actual = (Vector4)data[i];
            var expected = _expected[i];
            if (!(Mathf.Abs(actual.x - expected.x) <= 0.01f &&
                  Mathf.Abs(actual.y - expected.y) <= 0.01f &&
                  Mathf.Abs(actual.z - expected.z) <= 0.01f &&
                  Mathf.Abs(actual.w - expected.w) <= 0.01f))
            {
                Debug.LogError($"[FluxQuickStart] Index {i}: expected {expected}, actual {actual}");
                return;
            }

            Debug.Log($"[FluxQuickStart] Index {i}: {actual}");
        }

        Debug.Log("[FluxQuickStart] PASS: Upload and readback matched for all four elements.");
    }
}
```

Create an empty GameObject named FluxQuickStart and attach the script. Assign the Buffer, Upload, and Readback components in its Inspector.

Use this Readback exclusively for this example. Do not submit requests to it from another script.

<span id="実行して結果を確認する"></span>

## Run and check the results

1. Save the scene and resolve any Console compilation errors.
2. Enter Play Mode with normal scene reload enabled. SceneFlow prepares the Kernel Material.
3. Search the Console for `[FluxQuickStart]`.
4. Check the four values and the final PASS message.

| Index | Expected value |
| --- | --- |
| 0 | `(0, 0, 0, 0)` |
| 1 | `(1, 2, 3, 4)` |
| 2 | `(2, 4, 6, 8)` |
| 3 | `(3, 6, 9, 12)` |

The Console may show decimal values. Each component is compared with a tolerance of 0.01.

<span id="処理の流れ"></span>

## How it works

Upload assigns the array to the Kernel's `_FluxUploadData` parameter and runs the `Flux/Upload` shader. The array length and destination Count are both 4.

A true result from TryRequest means the request was accepted, not that the data is immediately available. Once readback finishes, `public void _OnFluxReadbackComplete()` is called on the receiver. Use this exact name.

The callback runs on both success and failure. Check Succeeded before reading Data. Data is a `Color[]`; interpret RGBA as the original Vector4's XYZW components.

Data.Length corresponds to Buffer capacity and may exceed the valid element count. Use `readback.Count`, which stores the valid count when the request was accepted.

<span id="うまく動かない場合"></span>

## If it does not work

| Symptom | Check |
| --- | --- |
| `TpLab.Flux.Udon` is missing | Flux, its dependencies, and earlier compilation errors |
| `Upload count must match...` | The array length must match Buffer.Count; set Initial Count to 4 |
| Reference errors in SetVectorArray or Dispatch | Upload Kernel and Shader references, and SceneFlow execution with scene reload |
| Readback request rejected | Another request may be in progress; rejected requests do not send completion callbacks |
| Readback fails | GPU/rendering errors; do not access Data until success |
| Callback does not arrive | Receiver lifetime, exact method name, public visibility, and no arguments |

<span id="要素数を変えるとき"></span>

## Changing the element count

FluxUpload supports at most 512 elements per upload, and the array length must match destination Count.

SetCount changes only the valid count, not capacity. To exceed the initial capacity, exit Play Mode and change Initial Count. Also update the four-element check and array length in this example.

The Buffer holds local data on each client. This example does not synchronize it over the network.

<span id="次に読む"></span>

## Next steps

Read [Buffers and data layout](./buffers.md), then use [Kernels and shaders](./kernels.md) to add a calculation that doubles each element.
