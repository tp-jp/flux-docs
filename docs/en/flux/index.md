<span id="fluxの概要"></span>

# About Flux

Flux is a GPU computing framework for VRChat. It stores data in RenderTextures, processes it with shaders, and lets you control transfers and computation from UdonSharp.

Flux is a general-purpose computation framework, independent of any particular particle system or visual effect data layout. The caller manages value semantics and selection, coordinate conversion, units and resolution compensation, composition formulas, time, and update frequency.

<span id="主な構成要素"></span>

## Main components

| Component | Purpose |
| --- | --- |
| `FluxBuffer` | Stores GPU data and tracks the number of valid elements |
| `FluxKernel` | Sets shader parameters and writes computation results to a Buffer |
| `FluxUpload` | Transfers a CPU-side `Vector4[]` to a Buffer |
| `FluxReadback` | Asynchronously reads GPU data back to the CPU |
| `FluxReduction` | Aggregates Buffer data into one element over multiple passes |
| [`FluxGrid3D`](./grid3d.md) | Maps 3D cells to a 2D atlas |
| [`FluxScatter`](./scatter.md) | Accumulates weighted values into eight neighboring cells |
| [`FluxGridFilter`](./grid-filter.md) | Smooths one grid axis at a time |
| [`FluxPingPong`](./ping-pong.md#component) | Manages two Buffer references and their exchange order |

Each Buffer element is a texture pixel containing four floating-point components. Kernels execute shaders through `VRCGraphics.Blit`.

<span id="使用する環境"></span>

## Environment

Flux uses Unity 2022.3, the VRChat Worlds SDK, and SceneFlow. See [Installation](./installation.md) for required versions and setup.

Flux is in early development. Its API and package structure may change.

<span id="次に読む"></span>

## Next steps

Follow [Installation](./installation.md), then try transferring and reading back data in the [Quick start](./quickstart.md). See the [guide contents](./guide.md) for all topics.
