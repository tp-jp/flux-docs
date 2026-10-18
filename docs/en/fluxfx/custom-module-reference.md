# Custom module reference {#reference}

See [Validation and performance](./validation-and-performance.md) for generation errors, behavior checks, and cost comparisons.

Use this page to look up standard Value and Operation IDs, dependencies, and HLSL conventions. For design concepts, see [Data and execution model](./data-and-execution.md); for a complete implementation, see [Custom modules](./custom-modules.md).

## HLSL conventions {#hlsl-conventions}

### Registering files and functions {#hlsl-registration}

Set an Operation's `hlslPath` to a Unity-project-accessible HLSL path and `entryPoint` to its function name. Update the registration when moving the file. The generator emits Context types before including HLSL, so do not redefine the Context yourself.

Give entry points, helper functions, and include guards unique names. Distinct Operation IDs do not automatically rename HLSL functions.

### Operation function signature {#operation-hlsl}

An Operation returns `void` and receives its generated Context as `inout`. This example is used with the CustomLift Definition.

```hlsl
#ifndef FLUXFX_CUSTOM_LIFT_INCLUDED
#define FLUXFX_CUSTOM_LIFT_INCLUDED

void FluxFX_CustomLift(inout FluxCustomLiftContext ctx)
{
    float strength = ctx.parameterCustomLiftStrength * (0.5 + 0.5 * sin(ctx.valueStepTime * 2.0));
    ctx.valueParticleVelocity += ctx.parameterCustomLiftDirection * strength * ctx.valueStepDeltaTime;
}

#endif
```

The Context contains the union of Values in `reads` and `writes`, plus Parameters in `parameters`. Inputs and Parameters are assigned before the call. Write outputs into Context Value fields and declare them in the Definition's `writes`. Assigning an input field or Parameter alone does not persist state or change a setting.

Explicitly assign outputs for `Replace` and `Initialize`. For `Modify`, include the source value in `reads` and write the calculation. With `switchable: true`, generated code checks Enabled and preserves inputs without calling the function when disabled.

### Context and field names and types {#hlsl-names}

| Source ID | Generated name |
| --- | --- |
| Operation `custom-lift` | `FluxCustomLiftContext` |
| Value `particle.velocity` | `valueParticleVelocity` |
| Value `step.delta-time` | `valueStepDeltaTime` |
| Parameter `custom-lift.strength` | `parameterCustomLiftStrength` |

The conversion removes `.`, `-`, and `_` separators and capitalizes each part's first character. Context names add `Flux` and `Context`; fields add a `value` or `parameter` prefix. Other characters are converted using their UTF-16 codes.

`custom-lift` and `custom.lift` produce the same Context name. Distinct IDs can still cause generation errors if their transformed Context or Value/Parameter field names collide. Check exact conversions with the Editor-side `FluxParticleHlslNames.Context`, `Value`, and `Parameter` methods.

Float, Float2, Float3, and Float4 map to HLSL float, float2, float3, and float4; UInt maps to uint. Contract Bool and Enum values are passed as float, with semantic constraints validated by the Contract. Material Property names use a separate encoding scheme; do not confuse them with Context fields.

### Derived Provider function signature {#derived-hlsl}

A Derived Provider does not receive a Context. It receives Values in `inputs` declaration order, followed by Parameters in `parameters` declaration order, and returns a result matching the Value's type. For example, squaring a Float input has this function shape:

```hlsl
float Example_Square(float value)
{
    return value * value;
}
```

To use it, register an output Float Value and a Derived Provider with one Float input Value and `Example_Square` as its `entryPoint`. The function alone does not register anything. Context fields being generated in ID order is separate from Provider argument declaration order. See [Providers](./data-and-execution.md#providers) for Phase constraints on inputs and Parameters.

### Coordinates, time, and state access {#hlsl-data}

Contracts validate Parameter inputs. They do not prevent NaN or Infinity produced by division by zero or invalid normalization inside HLSL. Check each formula's valid input domain and handle invalid cases in HLSL where needed.

`particle.position` and `particle.velocity` are in simulation space. Keep Local versus World interpretation consistent. CustomLift does not normalize Direction, so its length affects acceleration.

`step.delta-time` is the update interval in seconds; `step.time` is simulation time shared by the system, also in seconds. Use `particle.age` for per-particle time. When integrating acceleration into velocity, multiply by the update interval as CustomLift does.

The compiler determines state RenderTexture layout and channels. Ordinary particle processing should use Context fields or Provider inputs instead of depending on direct reads from a fixed Buffer layout. See [Data and execution model](./data-and-execution.md#reads-and-writes) for read versions and write permissions.

## Standard Value IDs {#standard-value-ids}

`step.time` and `particle.velocity` are **Value IDs** defined by FluxFX. They are separate from **Parameter IDs**, such as `custom-lift.strength`, declared in a Contract. Reference Values in an Operation's `reads` and `writes`, and specify Parameters in `parameters`. The same string can exist in different categories: for example, `render.size` is both a Value ID and a Parameter ID.

Do not reuse the standard IDs below for your own values. To read a standard Value, reference its existing definition rather than registering it again with `AddValue`. The implementation rejects duplicate IDs within each category; it does not reserve entire prefixes as keywords. Give custom IDs a unique prefix.

### Values defined by Core {#core-values}

FluxFX Core defines the following 13 Values. Types are members of `FluxParticleValueType`. “Writable” means `SharedMutable`; writes still require an Operation declaration and appropriate execution order.

| Value ID | Type | Purpose | Writes from custom Operations |
| --- | --- | --- | --- |
| `particle.position` | Float3 | Particle position in simulation space | Writable |
| `particle.velocity` | Float3 | Particle velocity in simulation space | Writable |
| `particle.age` | Float | Particle age in seconds; also used for liveness checks | Not allowed: SystemManaged |
| `particle.spawn-key` | UInt | Spawn key retained by the particle, used to reproduce random values | Not allowed: SystemManaged |
| `particle.lifetime` | Float | Particle lifetime in seconds | Not allowed: ReadOnly |
| `particle.start-color` | Float4 | Initial color (RGBA) | Not allowed: ReadOnly |
| `particle.start-size` | Float | Initial size | Not allowed: ReadOnly |
| `render.size` | Float | Size for rendering | Writable |
| `render.uv-transform` | Float4 | UV scale (xy) and offset (zw) for rendering | Writable |
| `render.color` | Float4 | Color for rendering (RGBA) | Writable |
| `step.time` | Float | Simulation time shared by the system, in seconds | Not allowed: ReadOnly |
| `step.delta-time` | Float | Current update interval in seconds | Not allowed: ReadOnly |
| `spawn.key` | UInt | Key supplied at spawn time | Not allowed: ReadOnly |

`SystemManaged` Values are managed by Core; custom modules can only read them. `ReadOnly` Values also cannot appear in an Operation's `writes`.

A Value definition and a Provider supplying that Value are separate registrations. Standard construction registers Providers for `step.delta-time`, `spawn.key`, lifetime, initial color, and initial size. **A module that needs `step.time` must register its Provider.** As in the CustomLift example, check `context.Providers.ContainsKey("step.time")` before adding a Uniform Provider to avoid duplicates.

### Values added conditionally {#conditional-values}

The following Values are not present in every configuration.

| Value ID | Type and write policy | Condition and purpose |
| --- | --- | --- |
| `emitter.row0`<br>`emitter.row1`<br>`emitter.row2` | Float4, ReadOnly | World Simulation Space. The first three rows of the emitter's local-to-world matrix |
| `spawn.direction` | Float3, ReadOnly | Sphere, Hemisphere, Circle, or Cone Shape. Supplies the spawn direction |
| `render.rotation` | Float3, SharedMutable | Random Start Rotation, a nonzero constant Start Rotation, or an Operation writing this Value. Rotation for rendering |
| `particle.start-rotation` | Float3, ReadOnly | Random Between Two Constants Start Rotation. Per-particle initial rotation |

Standard modules also add helper Values. These depend on the module and mode, so do not treat them as universally available inputs. All are ReadOnly.

| Value ID | Type | Registering module and condition |
| --- | --- | --- |
| `velocity-over-lifetime.center-offset` | Float3 | Velocity over Lifetime |
| `color.normalized-age`, `color.gradient` | Float, Float4 | Color over Lifetime in Gradient mode |
| `size.normalized-age`, `size.curve` | Float, Float | Size over Lifetime in Curve mode |
| `rotation.normalized-age`, `rotation.curve` | Float, Float | Rotation over Lifetime in Curve mode |

To register your own normalized age, Curve, or Gradient, pass unique IDs to `contribution.NormalizedAge`, `Curve`, or `Gradient`.

### Specify which version of a Value to read {#value-read-versions}

In addition to the Value ID, specify how to read it using the second argument of `FluxParticleValueRead`.

| ReadVersion | Purpose |
| --- | --- |
| `Provided` | A Provider supplies the Value, such as time, lifetime, or initial color. Requires a registered Provider whose inputs are available in that Phase |
| `StepPrevious` | Reads particle state before the update, during Update. In the velocity pipeline, it may be connected to the preceding writer's result |
| `AfterOperation` | Reads the result written by a specified Operation in the same Phase. Pass its Operation ID as the third argument |
| `Committed` | Reads updated particle state during Render |

For example, CustomLift reads `particle.velocity` with `StepPrevious`, and `step.time` and `step.delta-time` with `Provided`. Configuration compilation fails if a Value or Provider is missing, or if the Phase or dependencies are incompatible.

## Standard Operation IDs and execution order {#standard-operation-ids}

An Operation ID identifies a processing operation. It is separate from a Value ID or Module ID, and is the ID used in dependencies. For example, Gravity's Operation ID is `gravity`. Duplicate Operation IDs are rejected. The following operations are registered by standard FluxFX configurations.

### Operations added by Core and settings {#core-operations}

| Operation ID | Phase | Purpose and condition |
| --- | --- | --- |
| `spawn.position` | Spawn | Initializes particle position and age. Implementation varies with Shape and Simulation Space |
| `spawn.velocity` | Spawn | Initializes particle velocity and spawn key. Implementation varies with Start Speed and related settings |
| `velocity.identity` | Update | Carries velocity into the next state unchanged. Added only when no Update Operation writes velocity |
| `motion` | Update | Advances position using the final velocity result and updates age |
| `render.start` | Render | Sets rendering color from initial color |
| `render.uv-start` | Render | Sets UV scale to 1 and offset to 0 |
| `render.size-start` | Render | Sets rendering size from initial size |
| `render.rotation-start` | Render | Sets rendering rotation from initial rotation. Added when the configuration needs `render.rotation` |

### Operations added by standard modules {#module-operations}

These are registered when the corresponding module is included. Turning Enabled off retains the Operation, so Enabled does not determine whether a dependency target exists.

| Operation ID | Phase | Module and main output |
| --- | --- | --- |
| `gravity` | Update | Gravity: velocity |
| `force` | Update | Force: velocity |
| `noise` | Update | Noise: velocity |
| `vortex` | Update | Vortex: velocity |
| `drag` | Update | Drag: velocity |
| `limit-velocity` | Update | Limit Velocity: velocity |
| `velocity-over-lifetime` | Update | Velocity over Lifetime: modifies position after `motion` |
| `render.color` | Render | Color over Lifetime: rendering color |
| `render.blink` | Render | Blink: rendering color |
| `render.size-over-lifetime` | Render | Size over Lifetime: rendering size |
| `render.rotation-over-lifetime` | Render | Rotation over Lifetime: rendering rotation |
| `render.texture-sheet-animation` | Render | Texture Sheet Animation: rendering UV transform |

Trails does not register an Operation in this list. It registers parameters and handle mappings; history updates and rendering use separate processing. The `custom-lift` ID created in this chapter belongs to the sample, not the standard operations.

### Specifying dependencies {#operation-dependencies}

A dependency identifies an operation that must run before yours. If `A` depends on `B`, execution order is `B → A`. Regular `dependencies` and `AfterOperation` must target operations in the same Phase. Dependencies cannot cross Spawn, Update, and Render phases.

<div class="development-figure">
  <a class="diagram-light" href="../../diagrams/fluxfx-dependency-reads-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-dependency-reads-en-light.svg" alt="A custom-position dependency on motion runs motion first. AfterOperation also reads the position written by motion and adds a required dependency." width="480" height="580" /></a>
  <a class="diagram-dark" href="../../diagrams/fluxfx-dependency-reads-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-dependency-reads-en-dark.svg" alt="A custom-position dependency on motion runs motion first. AfterOperation also reads the position written by motion and adds a required dependency." width="480" height="580" /></a>
</div>

The diagram uses `custom-position` as an illustrative Operation ID. Arrows point from predecessor to successor. The lower example also passes a Value; `contribution.Operation` adds the required dependency from `AfterOperation`.

| Declaration | Meaning and use |
| --- | --- |
| `dependencies: new[] { "motion" }` | A required predecessor. Specifies order only; declare Value reads separately. A missing target is an error |
| `new FluxParticleValueRead("particle.position", FluxParticleReadVersion.AfterOperation, "motion")` | Reads position written by `motion`. `contribution.Operation` also adds a required dependency from this read |
| `optionalDependencies: new[] { "gravity", "force" }` | Writer ordering constraints for targets that exist. Currently resolved only in the velocity and rendering color pipelines described below |

For `AfterOperation`, the named operation must write the Value being read. Naming a custom Operation alone does not establish its order. Declare the required dependencies instead of relying on Inspector insertion order, Stage, or alphabetical ID order.

### Pipelines connected automatically {#operation-pipelines}

The standard build resolves writer order for **`particle.velocity` in Update** and **`render.color` in Render**. An `optionalDependencies` constraint is used only when both operations write the Value in that pipeline. It does not establish order when either operation writes a different Value or belongs to another Phase.

With all standard modules present, the main sequences are as follows. Omitted modules drop out of the sequence.

<div class="development-figure">
  <a class="diagram-light" href="../../diagrams/fluxfx-standard-pipelines-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-standard-pipelines-en-light.svg" alt="In Update, standard velocity writers feed motion, followed by Velocity over Lifetime. Separately in Render, color flows from render.start through render.color to render.blink." width="480" height="662" /></a>
  <a class="diagram-dark" href="../../diagrams/fluxfx-standard-pipelines-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-standard-pipelines-en-dark.svg" alt="In Update, standard velocity writers feed motion, followed by Velocity over Lifetime. Separately in Render, color flows from render.start through render.color to render.blink." width="480" height="662" /></a>
</div>

The final velocity writer feeds `motion`. With no velocity writers, the sequence is `velocity.identity → motion`. Rendering size, rotation, and UV operations use required dependencies on their respective `render.*-start` operations. There is no universal order between these and the rendering color pipeline.

In the velocity and rendering color pipelines, each writer's input is reconnected to the preceding writer's result. For example, Blink declares a read from `render.start`, but receives Color over Lifetime's result when that module is present. This automatic reconnection does not apply to arbitrary Values.

### Ordering custom operations {#custom-operation-order}

The CustomLift example lists all standard velocity writers in `optionalDependencies`. The result is `… → limit-velocity → custom-lift → motion`, so the added velocity contributes to position updates. However, Drag and Limit Velocity do not affect that addition in the same update.

<div class="development-figure">
  <a class="diagram-light" href="../../diagrams/fluxfx-custom-order-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-custom-order-en-light.svg" alt="When standard velocity writers exist, CustomLift runs after them and before motion. Without them, CustomLift still feeds velocity to motion." width="480" height="618" /></a>
  <a class="diagram-dark" href="../../diagrams/fluxfx-custom-order-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-custom-order-en-dark.svg" alt="When standard velocity writers exist, CustomLift runs after them and before motion. Without them, CustomLift still feeds velocity to motion." width="480" height="618" /></a>
</div>

The lower case has no velocity writers other than CustomLift. Missing `optionalDependencies` targets do not remove CustomLift. Turning Enabled off does not remove an Operation.

To place another custom velocity writer after CustomLift, give that Operation `dependencies: new[] { "custom-lift" }`. This makes CustomLift required. To support configurations without CustomLift, add `custom-lift` to `optionalDependencies` and also specify order relative to the standard velocity writers.

To modify position after `motion`, use the `AfterOperation` read of `particle.position` shown above and write the same Value. If Velocity over Lifetime is also used, specify order relative to that operation too. Position operations do not receive automatic connections through `optionalDependencies`.

Multiple operations writing the same Value in the same Phase need an order between them. Ambiguous ordering, dependency cycles, and missing required targets produce errors. `render.intensity` is a Parameter, not an Operation dependency target. The rendering shader applies Intensity to RGB according to the [Intensity Mask](./renderer.md#intensity-mask).

