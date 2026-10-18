# Validation and performance {#validation-and-performance}

Validate custom modules in separate steps: definitions register correctly, GPU calculations are correct, and cost is acceptable in the intended environment. Building on [Architecture](./architecture.md) and [Data and execution model](./data-and-execution.md), this page explains how to isolate problems.

## Start with a minimal configuration {#workflow}

1. Add only the module under development to a bundled Prefab and start with a small Particle Count. Simplify initial speed and emission, and define the expected change.
2. Resolve the first C# error in Unity's Console and confirm that the module appears in Add Module.
3. Check generation and HLSL compilation errors in Editor preview. Once visible, compare Enabled states and input values.
4. In Play Mode, verify configuration generation and UdonSharp compilation, then change values through the Handle. Check both Set return values and the visible result.
5. Add supported conditions one at a time: standard modules, Local/World space, stopping and resuming, and others.
6. Compare cost at the intended particle capacity, rendering mode, and target environment.

Change one condition at a time. For CustomLift, start with Start Speed 0 and expectations such as zero Direction causing no acceleration, upward Direction causing upward acceleration, and negative Strength reversing acceleration.

## Identify the failing stage {#debugging}

| Stage or symptom | Main checks |
| --- | --- |
| C# compilation fails | using directives, asmdef references, Runtime/Editor placement, typed Definition overrides |
| Missing from Add Module | Definition registration, Module Serializable attribute and public parameterless constructor, whether that type is already added |
| Exception during configuration generation | Match Module, Value, and Operation IDs in the first error to the Definition |
| Shader compilation fails | HLSL path, entryPoint, Context name, types, input/output/Parameter declarations |
| Only preview succeeds | U# Assembly Definition, SceneFlow generation, Prefab runtime connections |
| Handle retrieval or Set fails | Module inclusion, enum slots, types, policies, and input constraints |
| Unexpected appearance | Simulation space, update interval, read versions, execution order, Culling Bounds |

See [Installation](./installation.md) for SceneFlow checks. You can inspect generated shaders and configuration, but make fixes in Module, Contract, Definition, or HLSL sources. Editing generated output alone will not survive regeneration.

### Declaration and layout errors {#compiler-errors}

| Error | Meaning and action |
| --- | --- |
| `Missing Spawn initializer` | A state Value lacks Spawn initialization |
| `Value cannot have both State writer and Provider` | The same Value is supplied through state and a Provider; separate their roles |
| `Modify requires an explicit read` | Explicitly read the Value being modified |
| `Multiple read versions in one Context are not supported` | One Operation requests multiple versions of the same Value; revise processing or data design |
| `Update operation cannot fit in one RGBA Page` | Combined Update outputs exceed four components; review outputs across the related writers |
| `Intermediate cross-Page version is not materialized` | A different page requests an intermediate writer result that is not stored; consume the final result or design separate state for the intermediate result |
| `UInt State requires an exact float32 storage bound` | UInt state needs an exactly representable bound; `MaximumUIntValue` must be at most 16,777,216 |

Simply splitting output into separate Operations may not resolve a constraint: writes to shared Values can still merge pages. First clarify which state is independent and which version of a result is needed. See the [reference](./custom-module-reference.md) for ID collisions and dependencies.

## Behavior checks {#behavior-checks}

| Area | What to check |
| --- | --- |
| Spawn and reuse | Initial values, custom state when expired slots are reused, appearance immediately after spawn |
| Time | Intended behavior at different update intervals; Spawn versus Update; particle age versus shared time |
| Coordinates | Supported Local/World modes and direction/position when the emitter moves or rotates |
| Enabled | Initially on/off, runtime switching, and values preserved while disabled |
| Parameters | Zero, permitted negative values, bounds and out-of-range values, NaN/Infinity; old values retained after rejection |
| Policies | Static before/after updates begin, Live effects on existing particles, SpawnLocked behavior for old/new particles |
| Combinations | Order with standard/custom writers of the same Value, and missing optional dependencies |
| Playback | Before and after Play, Pause, Stop, Restart, and Clear, according to each API's contract |

The implementation's CustomLift tests check initial Enabled preservation, handle reuse, acceptance of finite values, rejection of NaN/Infinity, and velocity with Enabled off and on. For your own module, separate Parameter validation and expected particle state from visual checks to isolate causes.

GPU tests in the Editor do not replace UdonSharp verification. Also check Play Mode and the target environment.

## Inspect generated cost {#generated-cost}

Calling `FluxParticleBuildPipeline.Build(authoring)` from Editor code returns a `FluxParticleBuildResult`. This compiles the configuration and generates shader source; it does not configure runtime Prefabs or measure performance.

| Inspection target | What to inspect |
| --- | --- |
| Computation passes | `result.Shaders.Passes`; compare count and contents before/after adding the module |
| State layout | `result.Shaders.Compilation.StateLayout`; pages and components assigned to custom Values |
| Initial values and exposed controls | `result.InitialValues` and `result.ModuleBindings` |
| Rendering processing | `result.RendererSource`; check that custom Render processing is included |

Runtime configuration generation also logs `Program Backend assigned: ... (N Passes)`. This is the generated computation pass count, not total GPU cost including rendering, Trails, and auxiliary processing. Cost can increase with HLSL work or texture reads even when pass count stays unchanged.

## Performance considerations {#performance}

Combine generated-output inspection with measurements on the target; computation pass count alone does not describe total cost.

### State Values and pages {#state-cost}

State pages pack data into four RGBA components and use two Buffers for alternating reads and writes. Adding custom Values may increase page count, memory, and update traffic. Spawn-only state can sometimes fit into unused components of existing pages, so Value count alone does not determine the increase.

ARGBFloat data occupies 16 bytes per texel. For texture width W and P state pages, state Buffer data is approximately `W × W × 16 × 2 × P` bytes. Spawn inputs, aggregation Buffers, lookup textures, Meshes, Trails, and other resources are additional. See [Limitations and performance](./limitations.md#buffers-and-memory-estimates) for capacity and estimates.

Values that do not need storage can instead be calculated by Providers. This trades storage cost for computation and is not always faster.

### Operations and HLSL {#operation-cost}

One module or Operation does not equal one pass. Output pages and dependencies between pages determine the execution plan. Complex loops, repeated texture reads, and calculations can increase cost without increasing pass count.

Render calculations are evaluated during rendering. Include Mesh vertex count, rendering frequency, and screen overlap in comparisons instead of considering simulation cost alone. Trails also require history state and dedicated update/rendering processing.

### Disabling, capacity, and readback {#runtime-cost}

Turning Enabled off does not remove included state pages or Parameters. Distinguish disabling a module from removing it and regenerating the configuration.

Lowering Rate does not shrink allocated Particle Count or rendering Meshes. Executor skips spawn-only passes when there are no spawn requests, but not all processing scales down with alive count. Updates continue after Stop; Pause retains rendering and allocated memory.

Adding GPU readback every frame for measurement introduces its own cost. Standard alive-count retrieval is asynchronous with request interval and concurrency limits. See [Status and particle counts](./state-and-count.md).

## Record comparisons {#measurements}

Compare absent, enabled, and disabled module configurations with the same capacity, emission, rendering mode, camera position, and execution environment. Measure generation/initialization time separately from ongoing CPU/GPU cost. Also check with readback and verbose logging disabled.

Record package versions, GPU and execution environment, reproduction settings, the first error, expected and actual results, state page/pass counts, and measurement conditions. Do not treat a fixed particle or pass count as a universal performance target; evaluate the actual use case.
