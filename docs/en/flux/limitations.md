<span id="制約"></span>

# Limitations

This page describes limits in Flux. See [Installation](./installation.md) for setup and [Troubleshooting](./troubleshooting.md) for errors.

<span id="bufferの形式と容量"></span>

## Buffer format and capacity

A Buffer is a square ARGBFloat RenderTexture. One element holds four floating-point components; there is no API for storing arbitrary structures or variable-length records directly. Assign data to these components or use multiple Buffers.

The side length is `ceil(sqrt(Initial Count))`. The texture can contain pixels beyond the valid Count.

| Operation | Limitation |
| --- | --- |
| Initial Count | Set at least 1 in the Inspector |
| SetCount | Accepts 0 through Capacity; changes only the valid count |
| Resizing | No dynamic expansion API; allocate enough capacity beforehand |
| Increasing Count | Does not initialize newly valid elements |
| Reuse after Release | Reallocates from initial settings; old contents and modified Count are lost |

Flux defines no independent maximum Buffer element count. Actual allocation depends on texture support and GPU memory. It does not split large allocations or switch to a fallback format on failure.

<span id="cpuからのアップロード"></span>

## CPU uploads

Standard FluxUpload has the following limitations:

- At most 512 elements per upload.
- Array length matching destination Count.
- No offset, partial update, or append operation.
- No return value or upload-completion callback.

512 is the upload limit, not a Buffer or Kernel capacity limit. A Kernel without primary input can generate initial data on the GPU.

The upload shader writes zero outside Count. Consecutive uploads of array chunks to the same Buffer do not concatenate the chunks.

<span id="kernelの実行"></span>

## Kernel execution

Kernels execute shaders through VRCGraphics.Blit. There are no API arguments for thread-group count or pass number. The output texture determines the rendered dimensions; the shader must handle valid ranges.

| Concern | Caller responsibility |
| --- | --- |
| References | Check nulls and keep inputs separate from output |
| Output Count | Set it explicitly; Dispatch does not change it |
| Pixels outside Count | Exclude or initialize them in the shader |
| Additional inputs | SetBuffer passes only a Texture; pass extra dimensions and counts when needed |
| No-input Dispatch | Primary-input metadata is not set or reset |
| Parameters | Values remain on the Material; update them when reusing it |

Material generation depends on SceneFlow's FluxBuildPass. FluxKernel does not create an unprepared Material at runtime.

<span id="非同期読み戻し"></span>

## Asynchronous readback

One FluxReadback processes one request at a time. Further requests are rejected, not queued. There is no public automatic retry, cancellation, or timeout API.

TryRequest returning true means acceptance only. Use the data in the completion callback after checking that Succeeded is true. The number of frames until completion is not guaranteed.

The result array length corresponds to Capacity at request time; readback.Count identifies the valid portion. Lowering Count does not reduce the texture requested. There is no partial-region API.

The array is reused by later requests. Copy results that must persist. Data is null on failure, and there is no property exposing a detailed failure reason.

## Reduction

Source.Count must be at least 1 and Reduction Factor at least 2. Source, destination, and both workspaces must be distinct. Each workspace needs at least `ceil(Source.Count / Reduction Factor)` capacity.

The shader defines aggregation. Its group size is not automatically checked against Reduction Factor. The final Kernel runs even with one source element, so handle short inputs and partial groups.

Destination.Count becomes 1. Used workspace counts and contents change. Reduce has no success return value; check errors and the computed result.

<span id="ネットワーク同期と数値の扱い"></span>

## Networking and numerical behavior

Flux's Udon components operate without synchronization. Buffer contents, Kernel parameters, and results are not automatically distributed to other clients. Design input or result synchronization in the caller when needed.

Do not assume GPU results are bit-for-bit identical across environments. In particular, reduction changes addition order and can differ from a sequential CPU calculation. Use suitable numerical tolerances.

<span id="実行環境と性能"></span>

## Execution environment and performance

Flux uses ARGBFloat RenderTextures, shader rendering, and VRCAsyncGPUReadback when reading data back. It has no platform-specific fallback or CPU computation path. Verify transfers, computation, and readback on the target environment.

Source code alone cannot establish how many elements will sustain a particular frame rate. Evaluate capacity, Buffer count, Dispatch count, shader cost, and readback frequency together. Lowering Count does not shrink allocated textures; avoid excessive initial capacity.

Flux is in early development. Check API, package structure, and sample assumptions when upgrading.
