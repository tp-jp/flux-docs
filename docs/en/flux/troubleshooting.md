<span id="トラブルシューティング"></span>

# Troubleshooting

Start with the first Console error. An Upload or Reduction failure may not stop later operations. Fix preceding errors rather than judging success only by the final readback.

<span id="最初に確認すること"></span>

## First checks

1. Resolve compilation errors before running. Check [Flux and its dependencies](./installation.md).
2. Check Buffer, Kernel, Shader, and other Inspector references.
3. Search the Console for `[Flux]`, but also check other messages: reference and SceneFlow errors may not contain that prefix.
4. Reduce to a [Quick start](./quickstart.md)-sized input and isolate Upload, Kernel, and Readback in order.

<span id="コンパイルやmaterial生成で止まる"></span>

## Compilation or Material generation fails

<span id="fluxやsceneflowの型が見つからない"></span>

### Flux or SceneFlow types are missing

Check installed packages in VCC. For missing TpLab.Flux.Udon types, check Flux; for TpLab.SceneFlow.Editor, check SceneFlow. Resolve earlier compilation errors as well.

<span id="kernelのパラメーター設定やdispatchで参照エラーになる"></span>

### Kernel parameter calls or Dispatch produce reference errors

SceneFlow's FluxBuildPass generates the Material. Check:

1. The Kernel's Shader reference.
2. FluxBuildPass in **Tools → SceneFlow → Debug Window**.
3. Console messages such as `Error in pass FluxBuildPass` or `SceneFlow Pipeline failed`.
4. Normal Play Mode with scene reload enabled.

Detection of the pass does not prove generation succeeded; an earlier pass can stop processing. Enable **Tools → SceneFlow → Enable Logging** for more detail.

FluxBuildPass includes Kernels on inactive GameObjects, so check their Shader references too.

<span id="bufferやuploadのエラー"></span>

## Buffer or Upload errors

Numeric portions of these messages vary at runtime.

| Message | Cause and action |
| --- | --- |
| `Count must be between 0 and Capacity` | SetCount is out of range. Use 0 through Capacity, or increase Initial Count before running |
| `Upload count must match the destination count` | Array length differs from Count. Match Count, not Capacity |
| `Upload count exceeds the maximum of 512` | Keep the upload within 512 elements |

An invalid SetCount leaves Count unchanged. Ignoring its error can cause the following Upload to fail too.

<span id="uploadで参照エラーになる"></span>

### Upload produces reference errors

Check the array, destination Buffer, Upload Kernel, and that Kernel's Shader. Standard uploads use Flux/Upload. Upload does not validate null references.

<span id="再利用したbufferのデータが消える"></span>

### Reused Buffer data disappears

After Release, the next access reallocates using Initial Count. Initialize the data again. Reassign SetBuffer on any Kernel that held the old texture.

<span id="kernelの結果が期待と違う"></span>

## Unexpected Kernel results

| Symptom | Check |
| --- | --- |
| Only part of the data changes | Destination Count; Dispatch does not copy the input count |
| Extra values at the end | Shader range checks and a readback loop limited to readback.Count |
| Additional Buffer values are misaligned | SetBuffer does not pass dimensions; match sizes or calculate separate UVs |
| Parameter changes have no effect | Use internal names such as `_Scale`, not display labels |
| No-input Dispatch is unstable | Ensure the shader does not depend on primary-input metadata |
| Iteration is one pass behind | Swap references and read the latest ping-pong Buffer |

Keep all inputs, including additional inputs, separate from the output. See [Kernels](./kernels.md) and [Ping-pong](./ping-pong.md).

<span id="読み戻しができない"></span>

## Readback does not work

<span id="tryrequestがfalseを返す"></span>

### TryRequest returns false

The Readback may be busy, or the Buffer or receiver may be null. Rejected requests are not queued and do not receive callbacks. Wait for the current request and try again.

Request does not return acceptance status; use TryRequest when you need it.

<span id="dataがnullになる"></span>

### Data is null

Data is null before a request, during a request, and on failure. Check Succeeded in the completion callback. HasError being false alone is insufficient.

<span id="haserrorがtrueになる"></span>

### HasError is true

Either the GPU request failed or retrieving the result array failed. Both appear as the same failure state. Check GPU/rendering errors and whether the Buffer was released during the request.

There is no automatic retry. If the caller retries, record failures and avoid an unbounded stream of requests.

<span id="完了通知が届かない"></span>

### The completion callback does not arrive

Check request acceptance and the exact `public void _OnFluxReadbackComplete()` signature with no arguments. Keep both receiver and Readback alive until completion.

<span id="保存した結果が後から変わる"></span>

### A saved result changes later

Readback reuses its array. Keeping the Data reference is not a snapshot. [Copy the required elements](./readback.md#save-a-result) after successful completion.

<span id="reductionのエラー"></span>

## Reduction errors

| Message | Action |
| --- | --- |
| `Reduction source must contain at least one element` | Use Source.Count of at least 1 |
| `Reduction factor must be greater than 1` | Use a factor of at least 2 |
| `Reduction source and destination must be different buffers` | Separate source and destination |
| `Reduction workspaces must be different buffers` | Separate Workspace A and B |
| `Reduction source and destination must not use the reduction workspaces` | Make all four Buffers distinct |
| `Reduction destination must have a capacity of at least 1` | Allocate a valid destination of capacity at least 1 |
| `Reduction workspace capacity is too small. Required:` | Allocate both workspaces with at least the reported capacity |

Both workspace references and capacities are required even for inputs that do not use them. Also check the Kernel and Shader references.

<span id="エラーはないが合計や最大値が違う"></span>

### No error, but the sum or maximum is wrong

- Match Reduction Factor to the shader's input group size.
- Exclude invalid elements in partial groups.
- Initialize a maximum from the first valid element, not zero, to support all-negative data.
- Allow for floating-point differences from addition order.

See [Reduction](./reduction.md) for examples.

<span id="問題を切り分けるときに記録する情報"></span>

## Information to record

Record Flux, Unity, Worlds SDK, and SceneFlow versions; target environment; first error; Buffer counts and capacities; Shader; and operation order. A small input and its expected result help distinguish setup problems from computation errors.
