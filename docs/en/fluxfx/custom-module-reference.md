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
| `render.brightness` | Render | Brightness: rendering color |
| `brightness.initialize` | Spawn | Brightness: initializes audio state; only with Audio Enabled on and Independent Response |
| `brightness.update` | Update | Brightness: independent audio response; only with Audio Enabled on and Independent Response |
| `audio-input.initialize` | Spawn | Audio Input: initializes input freshness and response |
| `audio-input.update-freshness` | Update | Audio Input: input freshness |
| `audio-input.update-response` | Update | Audio Input: existing Float3 response |
| `audio-input.channel.{id}.response.initialize` | Spawn | Audio Input: initializes a channel response to zero |
| `audio-input.channel.{id}.response.update` | Update | Audio Input: updates a channel response after freshness |
| `render.distance-fade` | Render | Distance Fade: rendering color |
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
  <a class="diagram-light" href="../../diagrams/fluxfx-standard-pipelines-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-standard-pipelines-en-light.svg" alt="In Update, standard velocity writers feed motion, followed by Velocity over Lifetime. Separately in Render, color flows from render.start through render.color to render.brightness." width="480" height="662" /></a>
  <a class="diagram-dark" href="../../diagrams/fluxfx-standard-pipelines-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-standard-pipelines-en-dark.svg" alt="In Update, standard velocity writers feed motion, followed by Velocity over Lifetime. Separately in Render, color flows from render.start through render.color to render.brightness." width="480" height="662" /></a>
</div>

The final velocity writer feeds `motion`. With no velocity writers, the sequence is `velocity.identity → motion`. Rendering size, rotation, and UV operations use required dependencies on their respective `render.*-start` operations. There is no universal order between these and the rendering color pipeline.

In the velocity and rendering color pipelines, each writer's input is reconnected to the preceding writer's result. For example, Brightness declares a read from `render.start`, but receives Color over Lifetime's result when that module is present. This automatic reconnection does not apply to arbitrary Values.

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


## Connecting Audio Input and Distance Fade {#input-appearance}

### Additional IDs {#input-appearance-ids}

| Kind | ID | Type, phase, and purpose |
| --- | --- | --- |
| Module | `tplab.fluxfx.audio-input` | Audio Input |
| Module | `tplab.fluxfx.distance-fade` | Distance Fade |
| Value | `audio-input.raw-bands` | Float4, ReadOnly; raw AudioLink bands shared internally |
| Value | `audio-input.frame` | Float, ReadOnly; update counter, -1 when unavailable |
| Value | `audio-input.bands` | Float4, ReadOnly; four bands after common processing, before smoothing |
| Value | `audio-input.sample` | Float3, ReadOnly; input and update counter supplied by a Derived Provider |
| Value | `audio-input.freshness` | Float2, OwnerManaged; previous counter and time without updates |
| Value | `audio-input.response` | Float3, OwnerManaged; smoothed response read by consumer modules |
| Operation | `audio-input.initialize` | Spawn; initializes freshness to (-1, 0) and response to 0 |
| Operation | `audio-input.update-freshness` | Update; computes input freshness |
| Operation | `audio-input.update-response` | Update; computes response after freshness |
| Operation | `render.distance-fade` | Render; multiplies render.color RGB or Alpha by a distance factor |

These exist only when the corresponding modules are included. Consumers must not write Audio Input's owned state. Use Read / ReadChannel for smoothed responses, or the public ReadBands / ReadSample / ReadFreshness contracts for an independent response.

Distance Fade Parameter IDs are `distance-fade.start-distance`, `distance-fade.end-distance`, `distance-fade.target`, and `distance-fade.enabled`. Audio Input uses the prefix `audio-input.` with band, gain, noise-floor, strength, attack, release, slow-response, average-gain, timeout, and enabled. All are Live. See [Distance Fade](./distance-fade.md) and [Audio Input](./audio-input.md) for ranges.

### Read the audio response {#audio-response-read}

Use `FluxParticleAudioInputOutputs` from `TpLab.Flux.FX.Editor.Modules.AudioInput` in the consumer Definition. Consumers normally do not need to read the AudioLink texture again directly.

| Contract | Type and content | Read version |
| --- | --- | --- |
| `ReadBands()` | Float4; xyzw = Bass / Low Mid / High Mid / Treble, after common processing but before smoothing | Provided |
| `ReadSample()` | Float3; x = Band selection, y = four-band average, z = update counter (-1 when unavailable) | Provided |
| `ReadFreshness()` | Float2; x = last counter, y = seconds without a change | AfterOperation for audio-input.update-freshness in Update |
| `ReadChannel(id, phase)` | Smoothed Float response for the fixed channel ID | AfterOperation for ChannelUpdate(id) in Update; Committed in Render |
| `Read(phase)` | Existing Float3 response: fast selected band, slow selected band, average response | AfterOperation for audio-input.update-response in Update; Committed in Render |

Passing Read / ReadChannel to an Operation's `reads` also declares the dependency on the current Step's response update. Render reads committed responses; do not put an Update Operation in Render dependencies. Passing Spawn throws; the response state itself is initialized to zero at Spawn.

Add Audio Input to the same System and create the corresponding channel for ReadChannel. Declaring reads does not add either automatically. An unknown ID causes a build error and is not replaced by another channel.

To compute an independent response in Update, use unsmoothed ReadBands / ReadSample with ReadFreshness, checking Audio Input Enabled, counter >= 0, and time without updates < Timeout together. Bands already includes Gain, Noise Floor, and Strength; the Sample average also includes Average Gain. The average is formed from raw bands before common processing, so averaging the four Bands components does not generally produce the same value.

Generated HLSL exposes the existing response as `ctx.valueAudioInputResponse` and the four bands as `ctx.valueAudioInputBands`. Consumers must also declare target Value reads/writes and order against other writers. Do not write Audio Input's owned state; own any independent response state in the consumer.

### Per-channel IDs {#audio-channel-ids}

`{id}` is the full Channel ID shown in the Inspector, not a display name or array index. Empty or duplicate IDs, or IDs containing characters other than lowercase ASCII letters and digits, are rejected.

| Kind | ID or factory API | Meaning |
| --- | --- | --- |
| Parameter | `audio-input.channel.{id}.source` / `.gain` / `.attack` / `.release` | All Live; contracts are provided by FluxParticleAudioChannelContract(id) |
| Value | `ChannelSample(id)` → `audio-input.channel.{id}.sample` | Float, ReadOnly; input after channel Gain, before smoothing |
| Value | `ChannelResponse(id)` → `audio-input.channel.{id}.response` | Float, OwnerManaged; smoothed response owned by Audio Input |
| Operation | `audio-input.channel.{id}.response.initialize` | Spawn; initializes the channel response to zero |
| Operation | `ChannelUpdate(id)` → `audio-input.channel.{id}.response.update` | Update; updates the response after freshness |

ChannelSample / ChannelResponse / ChannelUpdate are methods on FluxParticleAudioInputOutputs. Each channel updates independently after freshness, without ordering against the existing response or other channels. Consumers that need the updated response should use ReadChannel. See [Audio Input](./audio-input.md#runtime) for ranges and runtime APIs.

### Distance fade and color order {#distance-fade-order}

Distance Fade collects existing Render-phase render.color writers at registration time, plus `render.color`, as optional predecessors. Register custom color processing before Distance Fade and verify order. Writers registered later are not automatically discovered.

The standard pipeline diagram above shows the basic chain. With Distance Fade, `render.distance-fade` follows the color operations registered before it. Audio Input runs a separate sequence: update input freshness, update the response, then run Update operations that use the response. It does not modify velocity or position itself.

When using the generated Render program for custom density captures or similar purposes, defining `FLUXFX_INTRINSIC_RENDER` before inclusion skips distance fading. If another renderer calls the shared `Runtime/Shaders/DistanceFade.hlsl`, pass the source System's origin and uniform scale, not the destination renderer's transform.

## Brightness contracts {#brightness}

Module ID is `tplab.fluxfx.brightness`. Parameter IDs use `brightness.` followed by base-minimum, base-maximum, waveform, period, period-minimum, period-maximum, random-phase, time-mode, minimum, maximum, duty, smoothness, target, audio-boost, audio-attack, audio-release, audio-source, and enabled. Audio Enabled and Audio Channel are Authoring build-time settings, not runtime Parameter switches.

`brightness.audio` is a Float Value whose ownership and Provider depend on the selected audio mode.

| Configuration | brightness.audio | Spawn / Update | Render read |
| --- | --- | --- | --- |
| Audio Enabled on, Independent Response | OwnerManaged | Adds brightness.initialize / brightness.update | Committed |
| Audio Enabled on, channel selected | ReadOnly; Derived Provider returning the channel response | No audio state or update owned by Brightness | Provided |
| Audio Enabled off | ReadOnly; Derived Provider returning zero | No audio state or update owned by Brightness | Provided |

Independent responses use [ReadSample, ReadBands, and ReadFreshness](#audio-response-read). Average reads sample.y; other Audio Source choices read the corresponding bands component, then update using Brightness Audio Attack / Release. brightness.initialize sets zero at Spawn; brightness.update executes after freshness updates, with no declared order relative to the existing audio-input.update-response. Disabling Brightness retains Update processing that decays its independent response.

With a channel selected, a Derived Provider returns the specified ChannelResponse directly, without reapplying Brightness Audio Attack / Release. Audio Input owns the channel update, which continues while Brightness is disabled.

`render.brightness` applies the multiplier in Render. It gathers existing Render color writers and render.color as optional predecessors at registration time, so register custom color processing first. Legacy render.blink no longer exists; see [migration](./brightness.md#migration).
