# Custom modules {#custom-modules}

Custom modules let you add your own particle processing through **Add Module** in the Inspector. This chapter uses the `CustomLift` example from the FluxFX implementation to add acceleration whose strength changes over time. This chapter is intended for module authors. Read [Module basics](./modules.md) and [Runtime parameters](./runtime-parameters.md) first.

## How to use this chapter {#reading-guide}

First read [FluxFX architecture](./architecture.md) to understand processing generation in the Editor and runtime responsibilities. This chapter adds custom processing to that system.

See [Data and execution model](./data-and-execution.md) for choosing Phases and stored values, using Providers, and designing Parameter change policies when adapting the sample.

Prepare a project where you can place and preview a FluxParticleSystem following the [Quick start](./quickstart.md). This chapter builds CustomLift, which you can add in the Inspector and control from UdonSharp by changing its strength, direction, and enabled state.

1. Read the [overview](#overview) to understand how settings, contracts, processing, and handles connect.
2. Create the code in order from [Required files](#structure) through [Add it in the Inspector and verify](#try-it).
3. When adapting the example, consult the [Value ID reference](./custom-module-reference.md#standard-value-ids) and [Operation IDs and execution order](./custom-module-reference.md#standard-operation-ids) in the reference.

Code examples are separated by file. Some reference classes you have not created yet, so create all required files before checking compilation results.

## How custom modules work {#overview}

A custom module adds your own calculation to FluxFX's particle processing using settings saved in the Inspector. In this chapter's CustomLift example, the user sets Strength and Direction, and the GPU applies acceleration to particle velocity on each update. UdonSharp can change that strength and direction at runtime.

You provide separate parts for stored settings, Editor code that assembles the processing, HLSL that runs on the GPU, and a handle for UdonSharp control. Each part has the following role.

<div class="development-figure">
  <a class="diagram-light" href="../../diagrams/fluxfx-module-parts-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-module-parts-en-light.svg" alt="Definition binds Module settings to Contract rules and registers HLSL. After generation, Handles change runtime Parameters." width="480" height="738" /></a>
  <a class="diagram-dark" href="../../diagrams/fluxfx-module-parts-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-module-parts-en-dark.svg" alt="Definition binds Module settings to Contract rules and registers HLSL. After generation, Handles change runtime Parameters." width="480" height="738" /></a>
</div>

The diagram shows CustomLift, separating Editor registration and generation from runtime Parameter changes. A Handle changes generated Parameters, not the Module or Definition.

| Part | Purpose |
| --- | --- |
| Module | Inspector settings in an ordinary C# class derived from `FluxParticleModule` |
| Contract | Parameter IDs, types, change policies, and handle slot assignments |
| Definition | Editor code registering parameters, value reads/writes, and operations from Module settings |
| HLSL | GPU particle processing |
| Handle and extension methods | Access to parameters from UdonSharp |

The Module is neither a UdonSharpBehaviour nor a Component to attach to a GameObject. Its settings live in the Inspector module list and are compiled into GPU processing. An HLSL file alone does not register a module.

### From settings to execution {#lifecycle}

For this example, the Definition binds the saved Strength and Direction, and generated HLSL adds acceleration to velocity. The Handle changes those runtime Parameters. See [Architecture](./architecture.md#compilation) for the shared compilation and execution flow.

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

A Module ID identifies a module type, a Parameter ID a setting, a Value ID calculation data, and an Operation ID a processing operation. In CustomLift, examples are `custom.fluxfx.lift`, `custom-lift.strength`, `particle.velocity`, and `custom-lift`, respectively. Similar names serve different purposes.

The CustomLift Operation runs during Update, reads velocity and time, and writes velocity. Declaring the Values read and written and the dependencies between operations lets FluxFX determine execution order alongside other modules. This is separate from Stage, which determines the Inspector display group.

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

Save as `Editor/CustomLiftDefinition.cs`. Inherit from `FluxParticleModuleDefinition<CustomLiftModule>` and override `ModuleId` and the typed `Contribute` method. The base class derives `ModuleType` from the type argument and passes settings as `CustomLiftModule`, so no manual cast is needed.

```csharp
using TpLab.Flux.FX.Editor.Compilation.Definitions;
using TpLab.Flux.FX.Editor.Modules;
using TpLab.Flux.FX.Editor.Modules.Shared;

namespace TpLab.Flux.FX.CustomModules.Editor
{
    public sealed class CustomLiftDefinition : FluxParticleModuleDefinition<CustomLiftModule>
    {
        public override string ModuleId => CustomLiftContract.Module.Id;

        public override void Contribute(CustomLiftModule lift, FluxParticleProgramContribution context)
        {
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
| `FluxParticleModuleDefinition<CustomLiftModule>` | Specifies the settings class. The base class provides `ModuleType` |
| `ModuleId` | Returns the Contract's Module ID |
| `Contribute(CustomLiftModule lift, ...)` | Receives typed settings and registers processing |
| `Bind` | Assigns Inspector initial values to parameter contracts |
| `reads` | Reads velocity, elapsed update seconds, and simulation time |
| `writes` | Modifies `particle.velocity` |
| `hlslPath` / `entryPoint` | HLSL file and function name |
| `switchable: true` | Allows Enabled to switch the operation on and off |
| `Complete()` | Validates parameter assignments and finalizes the runtime handle binding |

Register the `step.time` Uniform Provider only if it is not already present. When adding a parameter to the contract, add its Bind call too. Use `UnavailableParameter` for a slot intentionally unused by the current configuration.

The base class implements `IFluxParticleModuleDefinition`, so the Editor automatically discovers derived Definitions too. A registered class must be nonabstract, have no unbound type parameters, and have a public parameterless constructor. This example's `CustomLiftDefinition` meets those requirements. No manual registration menu or package edits are needed.

### Pay attention to execution order {#execution-order}

This example's `optionalDependencies` places it after the standard writers present in the [velocity pipeline](./custom-module-reference.md#operation-pipelines). It accelerates after Gravity, Force, Noise, Vortex, Drag, and Limit Velocity, and also works without those standard modules.

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

## Adapt the example into your own module {#adapt-example}

Once CustomLift works, update the following parts according to what you want to change.

| Change | Parts to update |
| --- | --- |
| Add a distinct module | Use unique class names, namespaces, Module IDs, Parameter IDs, and Operation IDs. Update Definition and Handle references, plus the HLSL Context name, function name, and path |
| Add a setting | Add a stored Module field, Contract and enum entry, Definition Bind and Parameter usage, and Handle getter and setter |
| Change the particle calculation | Edit HLSL. If the values used change, also update the Definition's reads, writes, and parameters |
| Combine with other modules | Declare order relative to Operations writing the same Value, and check configurations with and without the other modules |

For example, changing only the formula using Strength does not require changing IDs or the handle. To use a new Parameter in HLSL, include it in the Operation's `parameters` as well as declaring its Contract and Bind. The HLSL Context fields are generated from that Operation's declarations.

<span id="standard-value-ids"></span>
<span id="core-values"></span>
<span id="conditional-values"></span>
<span id="value-read-versions"></span>
<span id="standard-operation-ids"></span>
<span id="core-operations"></span>
<span id="module-operations"></span>
<span id="operation-dependencies"></span>
<span id="operation-pipelines"></span>
<span id="custom-operation-order"></span>

## Reference

Standard [Value IDs](./custom-module-reference.md#standard-value-ids), [Operation IDs and execution order](./custom-module-reference.md#standard-operation-ids), and [HLSL conventions](./custom-module-reference.md#hlsl-conventions) are collected in the reference.

## Troubleshooting {#troubleshooting}

See [Validation and performance](./validation-and-performance.md) for isolating failures by stage and checking cost.

| Symptom | Check |
| --- | --- |
| Missing from Add Module | Definition compilation, the Module type supplied to the base class, Serializable, and parameterless constructors. An already-added type is excluded from the menu |
| `Duplicate Module ID` / `Duplicate Module type` | Duplicate installations of the sample or definition |
| `Unassigned Module handle slot` | Bind or mark every contract parameter unavailable, then call Complete |
| Missing HLSL or shader compilation failure | File path, entryPoint, Context name, field names, and types |
| Writer ordering or dependency errors | Explicit ordering between operations writing the same value; no cycles |
| Handle unavailable to UdonSharp | U# Assembly Definition Source Assembly, assembly references, and compilation branches |
| `CustomLift()` returns null | Module included in the target system and runtime configuration generated |
| Disabling does not fix build errors | Disabled definitions are still collected; fix the definition or remove the module |

FluxFX is in early development. Check Module, Contract, Definition, and Handle APIs together when upgrading.
