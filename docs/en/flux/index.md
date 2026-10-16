<span id="fluxの概要"></span>

# About Flux

Flux is a GPU computing framework for VRChat. It stores data in RenderTextures, processes it with shaders, and lets you control transfers and computation from UdonSharp.

<span id="主な構成要素"></span>

## Main components

| Component | Purpose |
| --- | --- |
| `FluxBuffer` | Stores GPU data and tracks the number of valid elements |
| `FluxKernel` | Sets shader parameters and writes computation results to a Buffer |
| `FluxUpload` | Transfers a CPU-side `Vector4[]` to a Buffer |
| `FluxReadback` | Asynchronously reads GPU data back to the CPU |
| `FluxReduction` | Aggregates Buffer data into one element over multiple passes |

Each Buffer element is a texture pixel containing four floating-point components. Kernels execute shaders through `VRCGraphics.Blit`.

<span id="使用する環境"></span>

## Environment

Flux uses Unity 2022.3, the VRChat Worlds SDK, and SceneFlow. See [Installation](./installation.md) for required versions and setup.

Flux is in early development. Its API and package structure may change.

<span id="次に読む"></span>

## Next steps

Follow [Installation](./installation.md), then try transferring and reading back data in the [Quick start](./quickstart.md). See the [guide contents](./guide.md) for all topics.
