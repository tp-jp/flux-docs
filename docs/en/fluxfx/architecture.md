# FluxFX architecture {#architecture}

FluxFX converts Inspector settings into GPU processing in the Editor, while UdonSharp controls playback and parameters at runtime. This page explains how settings, generation, execution, and rendering connect for custom module developers.

Working through the [Quick start](./quickstart.md) first makes it easier to follow each component's role.

## From settings to rendering {#flow}

<div class="architecture-figure">
  <a class="diagram-light" href="../../diagrams/fluxfx-architecture-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-architecture-en-light.svg" alt="FluxFX architecture. The Editor generates runtime configuration from settings; UdonSharp drives GPU particle updates and rendering." width="480" height="780" /></a>
  <a class="diagram-dark" href="../../diagrams/fluxfx-architecture-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-architecture-en-dark.svg" alt="FluxFX architecture. The Editor generates runtime configuration from settings; UdonSharp drives GPU particle updates and rendering." width="480" height="780" /></a>
</div>

| Stage | Main components | Result |
| --- | --- | --- |
| Configuration | `FluxParticleAuthoring`, Modules | Settings edited in the Inspector |
| Processing definitions | Core, Contracts, Definitions | Calculation inputs, outputs, parameters, and dependencies |
| Compilation and generation | `FluxParticleBuildPipeline`, `FluxParticleProgramBuild` | Shaders, execution plans, and Unity runtime configuration |
| Execution | `FluxParticleSystem`, Emitter, Executor | Spawn requests and particle state updates |
| Rendering | `FluxParticleRenderer`, generated rendering shader | Visible particles |

Flux provides GPU computing using RenderTextures and shaders. FluxFX builds particle settings, generated processing, playback control, and rendering on that foundation. Custom modules normally declare processing through Definitions and HLSL instead of manually placing Buffers or Kernels.

## Inspector settings and Modules {#authoring}

`FluxParticleAuthoring` holds settings needed to generate the runtime configuration, including Main, Shape, Renderer, and the module list. Each Module is a settings object stored in that list. For example, CustomLift holds Strength and Direction.

A Module is not an individual UdonSharpBehaviour running every frame. The Editor reads its settings and incorporates its processing through the corresponding Definition. Stage determines the Inspector display group; Operation dependencies determine execution order.

## Assembling processing in the Editor {#compilation}

`FluxParticleBuildPipeline` converts settings into executable calculations in this order:

1. Validate Authoring settings and prepare Core definitions such as particle position, velocity, and lifetime.
2. Collect Parameters, Providers, Operations, and other declarations from each Module's Definition.
3. Resolve writer order for velocity and rendering color, connecting subsequent operations.
4. Validate reads, writes, and dependencies, then determine stored data layout and GPU passes.
5. Generate computation shaders and a rendering shader.

| What module authors provide | Role in generation |
| --- | --- |
| Module | Supplies values saved in the Inspector |
| Contract | Defines Parameter types, change policies, handle slots, and related rules |
| Definition | Binds Module values and registers Value reads/writes, Parameters used, HLSL, and dependencies |
| HLSL | Receives a generated Context and calculates particle behavior |
| Handle and extension methods | Use generated mappings to manipulate Parameters from UdonSharp |

An Operation is a logical processing unit. **One module or Operation does not necessarily correspond to one Buffer or GPU pass.** The compiler creates an execution plan from the required state and its reads and writes.

`FluxParticleProgramBuild` applies the generated result to Unity's runtime configuration, connecting Buffers, Kernels, Materials, initial parameter values, and handle mappings. In SceneFlow, `FluxFXCompileBuildPass` performs this work before Flux's `FluxBuildPass` runs.

## Runtime responsibilities {#runtime}

| Component | Role |
| --- | --- |
| `FluxParticleSystem` | Entry point for playback, stopping, pausing, and advancing updates |
| `FluxParticleEmitter` | Prepares requested spawn counts, keys, and related data from Emission settings and playback state |
| `FluxParticleEmissionScheduler` | Calculates emission schedules using Start Delay, Duration, Loop, Rate, and Burst |
| `FluxParticleExecutor` | Executes generated processing using Flux Buffers and Kernels |
| `FluxParticleRenderer` | Prepares a Mesh for the capacity and rendering mode, and assigns the rendering Material |

During an update, System advances Emitter and passes its spawn requests and the update interval to Executor. Executor allocates spawn destinations and updates particles on the GPU. UdonSharp does not calculate every particle's position in an array and upload it each frame.

`Stop` stops new emission while existing particles continue updating. `Pause` stops simulation progression. See [Playback controls](./playback.md) for API differences.

## GPU state and rendering {#gpu-and-rendering}

Particle state needed across frames is stored in FluxBuffer RenderTextures. Executor separates read and write buffers and uses updated Buffers as the next state. Not every Value is stored: Providers also supply or calculate values.

| Phase | Role and examples |
| --- | --- |
| Spawn | Initializes newly spawned particles, including position, velocity, and spawn key |
| Update | Updates particle state, including acceleration, movement, and age |
| Render | Calculates rendering values such as color, size, rotation, and UVs |

Render operations are incorporated into the rendering shader. They do not all write their results back to state Buffers as Update operations do. The rendering shader reads particle state and displays Billboards or Meshes.

Trails retain history such as positions in addition to particle state, using dedicated update and rendering processing. This is why there is no Trails Operation in the standard module Operation list.

## What can change at runtime {#runtime-changes}

Handles modify generated Parameters. Change policies and value validation in the Contract determine whether and when changes apply. This does not edit fields saved in Authoring or Modules.

Adding modules or changing Value reads/writes, HLSL, or dependencies requires regenerating the runtime configuration in the Editor. `SetEnabled` switches processing already included in the configuration; it does not compile new Definitions at runtime.

## Preview versus runtime execution {#preview}

Editor preview also uses compilation results, but `FluxParticleEditorPreview` and `FluxParticleProgramGpuSession` manage its GPU execution environment. In Play Mode and worlds, UdonSharp executes the configuration generated through SceneFlow.

After checking appearance in preview, verify configuration generation, playback, and Handle changes in Play Mode. A successful preview alone does not verify UdonSharp assembly setup or runtime connections.

## Continue to custom module development {#next-steps}

See [Validation and performance](./validation-and-performance.md) for checking your implementation and investigating cost.

[Data and execution model](./data-and-execution.md) explains Phase targets, state versus Providers, read/write declarations, and Parameter change policies.

[Custom modules](./custom-modules.md) walks through creating each file using CustomLift. Consult the [Value ID reference](./custom-module-reference.md#standard-value-ids) and [Operation IDs and execution order](./custom-module-reference.md#standard-operation-ids) when choosing data and processing. See [Limitations and performance](./limitations.md) for performance constraints.
