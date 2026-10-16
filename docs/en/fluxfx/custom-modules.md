# Custom modules {#custom-modules}

Custom modules let you add your own particle processing through **Add Module** in the Inspector. This chapter uses the `CustomLift` example from the FluxFX 0.0.3 implementation to add acceleration whose strength changes over time. This chapter is intended for module authors. Read [Module basics](./modules.md) and [Runtime parameters](./runtime-parameters.md) first.

## How custom modules work {#overview}

A custom module adds your own calculation to FluxFX's particle processing using settings saved in the Inspector. In this chapter's CustomLift example, the user sets Strength and Direction, and the GPU applies acceleration to particle velocity on each update. UdonSharp can change that strength and direction at runtime.

You provide separate parts for stored settings, Editor code that assembles the processing, HLSL that runs on the GPU, and a handle for UdonSharp control. Each part has the following role.

| Part | Purpose |
| --- | --- |
| Module | Inspector settings in an ordinary C# class derived from `FluxParticleModule` |
| Contract | Parameter IDs, types, change policies, and handle slot assignments |
| Definition | Editor code registering parameters, value reads/writes, and operations from Module settings |
| HLSL | GPU particle processing |
| Handle and extension methods | Access to parameters from UdonSharp |

The Module is neither a UdonSharpBehaviour nor a Component to attach to a GameObject. Its settings live in the Inspector module list and are compiled into GPU processing. An HLSL file alone does not register a module.

### From settings to execution {#lifecycle}

1. **Configure in the Inspector**: The Module stores values such as Strength and Direction. A Module with a registered Definition is available through Add Module.
2. **Assemble processing in the Editor**: When generating a preview or runtime configuration, the Definition reads Module values and registers initial values according to the Contract. It also specifies which particle data to read and write and which HLSL function to call.
3. **FluxFX generates runtime data**: It resolves execution order from the registrations and generates shaders, parameters, and mappings for handles.
4. **Update particles on the GPU**: The generated processing calls the HLSL function, which uses the supplied values to calculate particle velocity or other data.
5. **Change values from UdonSharp**: The Handle updates runtime parameters. `Live` values are used in subsequent calculations. This does not modify the Module fields saved in the Inspector.

### Contract versus Definition {#contract-and-definition}

**A Contract specifies the rules for parameters.** For Strength, it declares the ID `custom-lift.strength`, the float type, and permission to change the value at runtime. It also assigns the parameter to a handle slot. The Contract does not specify how to accelerate particles or store the value chosen in the Inspector.

**A Definition registers processing using those rules.** It uses `Bind` to associate the Strength read from the Module with the Contract, and specifies calculation inputs, outputs, and HLSL. The actual formula that adds direction × strength × update interval to velocity belongs in HLSL.

For Strength, the parts connect as follows:

| Part | How it handles Strength |
| --- | --- |
| Module | Stores the value chosen in the Inspector, with a default of 2 |
| Contract | Declares `custom-lift.strength` as a float with the `Live` policy and assigns it to the `CustomLiftParameter.Strength` slot |
| Definition | Uses `Bind` to register the Module value as the initial value and includes it in the Operation's parameters |
| HLSL | Receives `ctx.parameterCustomLiftStrength` and uses it to calculate acceleration |
| Handle | Maps calls such as `SetStrength(5f)` to changes to the corresponding runtime parameter |

### Terms used to register GPU processing {#processing-terms}

| Term | Meaning and use in this example |
| --- | --- |
| Parameter | A setting supplied to processing, such as Strength or Direction. It does not hold a separate value for each particle |
| Value | Data read or written by a calculation. `particle.velocity` is per-particle velocity; `step.time` is time shared by the system |
| Provider | A mechanism that supplies a Value. Here it supplies `step.time` to the GPU as a Uniform |
| Operation | A processing registration that specifies the Phase, Values read and written, Parameters used, HLSL function, and dependencies |
| Context | A struct passed to the HLSL function. FluxFX generates it from the Operation's declarations, with fields for the required Values and Parameters |

The CustomLift Operation runs during Update, reads velocity and time, and writes velocity. Declaring the Values read and written and the dependencies between operations lets FluxFX determine execution order alongside other modules. This is separate from Stage, which determines the Inspector display group.

## Standard Value IDs {#standard-value-ids}

`step.time` and `particle.velocity` are **Value IDs** defined by FluxFX. They are separate from **Parameter IDs**, such as `custom-lift.strength`, declared in a Contract. Reference Values in an Operation's `reads` and `writes`, and specify Parameters in `parameters`. The same string can exist in different categories: for example, `render.size` is both a Value ID and a Parameter ID.

Do not reuse the standard IDs below for your own values. To read a standard Value, reference its existing definition rather than registering it again with `AddValue`. The implementation rejects duplicate IDs within each category; it does not reserve entire prefixes as keywords. Give custom IDs a unique prefix.

### Values defined by Core {#core-values}

FluxFX 0.0.3 Core defines the following 13 Values. Types are members of `FluxParticleValueType`. “Writable” means `SharedMutable`; writes still require an Operation declaration and appropriate execution order.

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

A Value definition and a Provider supplying that Value are separate registrations. Standard construction registers Providers for `step.delta-time`, `spawn.key`, lifetime, initial color, and initial size. **A module that needs `step.time` must register its Provider.** As in CustomLift below, check `context.Providers.ContainsKey("step.time")` before adding a Uniform Provider to avoid duplicates.

### Values added conditionally {#conditional-values}

The following Values are not present in every configuration.

| Value ID | Type and write policy | Condition and purpose |
| --- | --- | --- |
| `emitter.row0`, `emitter.row1`, `emitter.row2` | Float4, ReadOnly | World Simulation Space. The first three rows of the emitter's local-to-world matrix |
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

An Operation ID identifies a processing operation. It is separate from a Value ID or Module ID, and is the ID used in dependencies. For example, Gravity's Operation ID is `gravity`. Duplicate Operation IDs are rejected. The following operations are registered by standard FluxFX 0.0.3 configurations.

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
| `render.intensity` | Render | Applies Renderer Intensity to rendering color, after other rendering color writers |

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

| Declaration | Meaning and use |
| --- | --- |
| `dependencies: new[] { "motion" }` | A required predecessor. Specifies order only; declare Value reads separately. A missing target is an error |
| `new FluxParticleValueRead("particle.position", FluxParticleReadVersion.AfterOperation, "motion")` | Reads position written by `motion`. `contribution.Operation` also adds a required dependency from this read |
| `optionalDependencies: new[] { "gravity", "force" }` | Writer ordering constraints for targets that exist. Currently resolved only in the velocity and rendering color pipelines described below |

For `AfterOperation`, the named operation must write the Value being read. Naming a custom Operation alone does not establish its order. Declare the required dependencies instead of relying on Inspector insertion order, Stage, or alphabetical ID order.

### Pipelines connected automatically {#operation-pipelines}

The standard build resolves writer order for **`particle.velocity` in Update** and **`render.color` in Render**. An `optionalDependencies` constraint is used only when both operations write the Value in that pipeline. It does not establish order when either operation writes a different Value or belongs to another Phase.

With all standard modules present, the main sequences are as follows. Omitted modules drop out of the sequence.

```text
Update: gravity → force → noise → vortex → drag → limit-velocity → motion → velocity-over-lifetime
Render: render.start → render.color → render.blink → render.intensity
```

The final velocity writer feeds `motion`. With no velocity writers, the sequence is `velocity.identity → motion`. Rendering size, rotation, and UV operations use required dependencies on their respective `render.*-start` operations. There is no universal order between these and the rendering color pipeline.

In the velocity and rendering color pipelines, each writer's input is reconnected to the preceding writer's result. For example, Blink declares a read from `render.start`, but receives Color over Lifetime's result when that module is present. This automatic reconnection does not apply to arbitrary Values.

### Ordering custom operations {#custom-operation-order}

CustomLift below lists all standard velocity writers in `optionalDependencies`. The result is `… → limit-velocity → custom-lift → motion`, so the added velocity contributes to position updates. However, Drag and Limit Velocity do not affect that addition in the same update.

To place another custom velocity writer after CustomLift, give that Operation `dependencies: new[] { "custom-lift" }`. This makes CustomLift required. To support configurations without CustomLift, add `custom-lift` to `optionalDependencies` and also specify order relative to the standard velocity writers.

To modify position after `motion`, use the `AfterOperation` read of `particle.position` shown above and write the same Value. If Velocity over Lifetime is also used, specify order relative to that operation too. Position operations do not receive automatic connections through `optionalDependencies`.

Multiple operations writing the same Value in the same Phase need an order between them. Ambiguous ordering, dependency cycles, and missing required targets produce errors. In particular, `render.intensity` runs after other rendering color writers, so making a custom rendering color writer depend on `render.intensity` creates a cycle.

## Required files {#structure}

Create the following files in your project's Assets. This tutorial does not assume that a VCC installation includes the sample folder. If you already have CustomLift, use that definition instead of adding a duplicate.

```text
Assets/FluxFX/Samples/CustomLift/
├─ Runtime/
│  ├─ CustomLiftModule.cs
│  ├─ CustomLiftIds.cs
│  ├─ CustomLiftParameter.cs
│  ├─ CustomLiftHandle.cs
│  ├─ TpLab.Flux.FX.Samples.CustomLift.asmdef
│  └─ TpLab.Flux.FX.Samples.CustomLift.asset  ← U# Assembly Definition
└─ Editor/
   ├─ CustomLiftContract.cs
   ├─ CustomLiftDefinition.cs
   └─ CustomLift.hlsl
```

## Prepare the assemblies {#assemblies}

Create this asmdef in Runtime. Because it contains UdonSharp-compatible handles, it needs a U# Assembly Definition as well as the ordinary Unity assembly definition.

```json
{
  "name": "TpLab.Flux.FX.Samples.CustomLift",
  "rootNamespace": "TpLab.Flux.FX.CustomModules",
  "references": [
    "VRC.Udon",
    "UdonSharp.Runtime",
    "TpLab.Flux.FX.Udon",
    "TpLab.Flux.FX.Scripts"
  ],
  "autoReferenced": true
}
```

Select the asmdef in Unity and choose **Assets → Create → U# Assembly Definition**. Confirm that the resulting asset's **Source Assembly** references this asmdef.

Here, Editor is outside the Runtime asmdef. Place the folder outside any existing custom parent asmdef so Editor code compiles in Unity's default Editor assembly. When integrating into an existing assembly setup, use a separate Editor-only assembly referencing your Runtime assembly, `TpLab.Flux.FX.Editor`, `TpLab.Flux.FX.Editor.Contracts`, and `TpLab.Flux.FX.Scripts`. Runtime code must not reference Editor code.

## Create the Inspector settings class {#module-settings}

Save as `Runtime/CustomLiftModule.cs`. Defaults are Strength 2 and an upward Direction.

```csharp
using System;
using TpLab.Flux.FX.Scripts.Modules;
using UnityEngine;

namespace TpLab.Flux.FX.CustomModules
{
    [Serializable]
    public sealed class CustomLiftModule : FluxParticleModule
    {
        [SerializeField]
        float strength = 2.0f;

        [SerializeField]
        Vector3 direction = Vector3.up;

        public float Strength => strength;

        public Vector3 Direction => direction;

        public override FluxParticleExecutionStage Stage => FluxParticleExecutionStage.VelocityUpdate;

        public override FluxParticleAttribute ReadAttributes => FluxParticleAttribute.Velocity;

        public override FluxParticleAttribute WriteAttributes => FluxParticleAttribute.Velocity;
    }
}
```

The class needs `[Serializable]` and a public parameterless constructor. Omitting a constructor here provides one automatically. `[SerializeField]` fields store settings. Enabled is inherited from the base class; do not add a second enabled flag.

Stage determines the Inspector group. Declare the attributes read and written, but these declarations alone do not register HLSL inputs, outputs, or execution order. The Definition below registers the actual operation.

## Define IDs and parameter contracts {#parameter-contract}

Save the Module ID in `Runtime/CustomLiftIds.cs`.

```csharp
namespace TpLab.Flux.FX.CustomModules
{
    public static class CustomLiftIds
    {
        public const string Module = "custom.fluxfx.lift";
    }
}
```

Save the slot keys shared by the Contract and Handle in `Runtime/CustomLiftParameter.cs`.

```csharp
namespace TpLab.Flux.FX.CustomModules
{
    public enum CustomLiftParameter
    {
        Strength,
        Direction
    }
}
```

Save this as `Editor/CustomLiftContract.cs`.

```csharp
using TpLab.Flux.FX.Editor.Contracts;
using UnityEngine;

namespace TpLab.Flux.FX.CustomModules.Editor
{
    public static class CustomLiftContract
    {
        public static FluxParticleParameterContract<float> Strength { get; } =
            FluxParticleParameter.Float("custom-lift.strength")
                .ApiName("Strength")
                .Policy(FluxParticleParameterPolicy.Live)
                .Build();
        public static FluxParticleParameterContract<Vector3> Direction { get; } =
            FluxParticleParameter.Vector3("custom-lift.direction")
                .ApiName("Direction")
                .Policy(FluxParticleParameterPolicy.Live)
                .Build();
        public static FluxParticleModuleContract Module { get; } =
            new FluxParticleModuleContractBuilder(CustomLiftIds.Module)
                .Handle("CustomLiftHandle")
                .Accessor("CustomLift")
                .Enabled("custom-lift.enabled")
                .Parameter(CustomLiftParameter.Strength, Strength)
                .Parameter(CustomLiftParameter.Direction, Direction)
                .Build();
    }
}
```

Strength is a float and Direction a Vector3. Both use `Live`, allowing runtime changes. This contract accepts negative Strength, but rejects NaN and Infinity. A `Static` policy restricts changes after the first simulation update.

Enum values must be contiguous from zero, with matching assignments in Contract and Handle. Module IDs, Parameter IDs, and Operation IDs must not collide with other modules. For your own module, use your own namespace or unique prefix and update references consistently.

`.Handle()` and `.Accessor()` declare names in the contract. They do not automatically create the C# handle class or accessor method; provide the implementation below too.

## Register GPU processing {#definition}

Save as `Editor/CustomLiftDefinition.cs`.

```csharp
using System;
using TpLab.Flux.FX.Editor.Compilation.Definitions;
using TpLab.Flux.FX.Editor.Modules;
using TpLab.Flux.FX.Editor.Modules.Shared;
using TpLab.Flux.FX.Scripts.Modules;

namespace TpLab.Flux.FX.CustomModules.Editor
{
    public sealed class CustomLiftDefinition : IFluxParticleModuleDefinition
    {
        public Type ModuleType => typeof(CustomLiftModule);

        public string ModuleId => CustomLiftContract.Module.Id;

        public void Contribute(FluxParticleModule module, FluxParticleProgramContribution context)
        {
            var lift = (CustomLiftModule)module;
            var contribution = new FluxParticleModuleContribution(context, CustomLiftContract.Module, lift.Enabled);
            var strength = contribution.Bind(CustomLiftContract.Strength, lift.Strength);
            var direction = contribution.Bind(CustomLiftContract.Direction, lift.Direction);
            if (!context.Providers.ContainsKey("step.time"))
            {
                context.AddProvider(new FluxParticleValueProvider("step.time", FluxParticleProviderKind.Uniform));
            }
            contribution.Operation("custom-lift", FluxParticlePhase.Update,
                reads: new[]
                {
                    new FluxParticleValueRead("particle.velocity", FluxParticleReadVersion.StepPrevious),
                    new FluxParticleValueRead("step.delta-time", FluxParticleReadVersion.Provided),
                    new FluxParticleValueRead("step.time", FluxParticleReadVersion.Provided)
                },
                writes: new[] { new FluxParticleValueWrite("particle.velocity", FluxParticleWriteKind.Modify) },
                hlslPath: "Assets/FluxFX/Samples/CustomLift/Editor/CustomLift.hlsl", entryPoint: "FluxFX_CustomLift",
                switchable: true, parameters: new[] { strength, direction },
                optionalDependencies: new[] { "gravity", "force", "noise", "vortex", "drag", "limit-velocity" });
            contribution.Complete();
        }
    }
}
```

| Registration | Meaning in this example |
| --- | --- |
| `ModuleType` | Associates the definition with its settings class |
| `Bind` | Assigns Inspector initial values to parameter contracts |
| `reads` | Reads velocity, elapsed update seconds, and simulation time |
| `writes` | Modifies `particle.velocity` |
| `hlslPath` / `entryPoint` | HLSL file and function name |
| `switchable: true` | Allows Enabled to switch the operation on and off |
| `Complete()` | Validates parameter assignments and finalizes the runtime handle binding |

Register the `step.time` Uniform Provider only if it is not already present. When adding a parameter to the contract, add its Bind call too. Use `UnavailableParameter` for a slot intentionally unused by the current configuration.

The Editor automatically discovers implementations of `IFluxParticleModuleDefinition`. A definition must be nonabstract, nongeneric, and have a public parameterless constructor. No manual registration menu or package edits are needed.

### Pay attention to execution order {#execution-order}

This example's `optionalDependencies` places it after the standard writers present in the [velocity pipeline](#operation-pipelines). It accelerates after Gravity, Force, Noise, Vortex, Drag, and Limit Velocity, and also works without those standard modules.

Consequently, **velocity added here is not affected by Drag or Limit Velocity in the same update**. To enforce a final speed limit, revise the dependencies between velocity-writing operations. Changing Inspector insertion order or Stage alone does not set execution order.

For the velocity pipeline, the compiler connects reads to the preceding writer's result. Declaring `StepPrevious` does not mean standard module results are always ignored. When multiple custom modules write the same value, explicitly establish their order and avoid dependency cycles.

## Write the HLSL {#hlsl}

Save as `Editor/CustomLift.hlsl`. If you move the folder, also change the Definition's `hlslPath`.

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

`FluxCustomLiftContext` is generated from Operation ID `custom-lift`; do not redefine the struct yourself. Declared values and parameters map to these fields:

| ID | Context field |
| --- | --- |
| `particle.velocity` | `valueParticleVelocity` |
| `step.delta-time` | `valueStepDeltaTime` |
| `step.time` | `valueStepTime` |
| `custom-lift.strength` | `parameterCustomLiftStrength` |
| `custom-lift.direction` | `parameterCustomLiftDirection` |

The factor `0.5 + 0.5 * sin(time * 2)` scales strength by a value between zero and one. Direction × strength × the update interval in seconds is added to velocity. `step.time` is the simulation time shared by the system, not each particle's age. Particles spawned at different times therefore vary their acceleration in sync.

Direction uses the particle simulation space and is not normalized. Doubling its length doubles acceleration, a zero vector produces no acceleration, and negative Strength reverses direction. Turning Enabled off stops adding acceleration but preserves the velocity already accumulated.

## Create the UdonSharp handle {#runtime-handle}

Save as `Runtime/CustomLiftHandle.cs`.

```csharp
using TpLab.Flux.FX.Udon.Parameters;
using TpLab.Flux.FX.Udon;
using TpLab.Flux.FX.Udon.Modules;
using UnityEngine;

namespace TpLab.Flux.FX.CustomModules
{
    public class CustomLiftHandle : FluxParticleModuleHandle
    {
    }

    public static class CustomLiftHandleExtensions
    {
        public static CustomLiftHandle CustomLift(this FluxParticleModules modules)
        {
#if COMPILER_UDONSHARP
            return (CustomLiftHandle)FluxParticleModuleHandleFactory.Get(modules, CustomLiftIds.Module);
#else
            return FluxParticleModuleHandleFactory.Get<CustomLiftHandle>(modules, CustomLiftIds.Module);
#endif
        }
        public static float GetStrength(this CustomLiftHandle handle) => handle.GetValue((int)CustomLiftParameter.Strength).x;
        public static bool SetStrength(this CustomLiftHandle handle, float strength) => handle.SetValue((int)CustomLiftParameter.Strength, FluxParticleValueType.Float, new Vector4(strength, 0, 0, 0));
        public static Vector3 GetDirection(this CustomLiftHandle handle) => handle.GetValue((int)CustomLiftParameter.Direction);
        public static bool SetDirection(this CustomLiftHandle handle, Vector3 direction) => handle.SetValue((int)CustomLiftParameter.Direction, FluxParticleValueType.Float3, direction);
    }
}
```

Keep the `COMPILER_UDONSHARP` branch because ordinary C# and UdonSharp use different Factory access methods. Udon represents handles as DataLists; do not store state in handle constructors or instance fields.

Get the handle with `target.Modules.CustomLift()`. It returns null when the module is absent, but remains available for an included, disabled module. `SetEnabled` is a shared extension method. Always associate the same handle type with a given Module ID. Handles are reused for the same system; retrieve them again after replacing the system or regenerating its configuration.

The following action is called after startup. Create `CustomLiftControl` as a U# Script and assign the Prefab root to Target. If it is in a custom assembly, reference the CustomLift Runtime assembly.

```csharp
using TpLab.Flux.FX.CustomModules;
using TpLab.Flux.FX.Udon;
using TpLab.Flux.FX.Udon.Modules;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class CustomLiftControl : UdonSharpBehaviour
{
    [SerializeField]
    FluxParticleSystem target;

    public void ApplyLift()
    {
        if (target == null || target.Modules == null) return;
        var lift = target.Modules.CustomLift();
        if (lift == null) return;

        bool accepted = lift.SetStrength(5f);
        accepted &= lift.SetDirection(Vector3.right);
        accepted &= lift.SetEnabled(true);
        if (!accepted)
        {
            Debug.LogWarning("Some CustomLift settings were rejected.");
        }
    }
}
```

Check Set return values. Multiple changes are not atomic; accepted changes remain even if another fails. Use [Playback controls](./playback.md) to change playback state.

## Add it in the Inspector and verify {#try-it}

1. Save the files and resolve Unity C# compilation errors.
2. Place a FluxParticleSystem following the [Quick start](./quickstart.md).
3. Choose **MODULES → Velocity Update → Add Module → Custom → Custom Lift Module**. The display name is generated from the class name.
4. In Main, set **Simulation Space** to Local, Start Speed to 0, and Start Lifetime to 3. In Custom Lift Module, set Strength to 2 and Direction to `(0, 1, 0)`. Remove other movement modules for comparison.
5. Restart the preview and observe upward acceleration. Turn Custom Lift Module's Enabled off and restart again to compare.
6. Enter Play Mode with normal scene reload enabled and check for generation errors. Call `ApplyLift` after startup and verify the change in strength and direction.

Even when declarations and parameter types agree, verify that the HLSL calculation produces the intended result in practice. Set Culling Bounds to include the movement area.

## Troubleshooting {#troubleshooting}

| Symptom | Check |
| --- | --- |
| Missing from Add Module | Definition compilation, ModuleType, Serializable, and parameterless constructors. An already-added type is excluded from the menu |
| `Duplicate Module ID` / `Duplicate Module type` | Duplicate installations of the sample or definition |
| `Unassigned Module handle slot` | Bind or mark every contract parameter unavailable, then call Complete |
| Missing HLSL or shader compilation failure | File path, entryPoint, Context name, field names, and types |
| Writer ordering or dependency errors | Explicit ordering between operations writing the same value; no cycles |
| Handle unavailable to UdonSharp | U# Assembly Definition Source Assembly, assembly references, and compilation branches |
| `CustomLift()` returns null | Module included in the target system and runtime configuration generated |
| Disabling does not fix build errors | Disabled definitions are still collected; fix the definition or remove the module |

FluxFX is in early development. Check Module, Contract, Definition, and Handle APIs together when upgrading.
