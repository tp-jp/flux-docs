# Custom modules {#custom-modules}

Custom modules let you add your own particle processing through **Add Module** in the Inspector. This chapter uses the `CustomLift` example from the FluxFX 0.0.3 implementation to add acceleration whose strength changes over time. This chapter is intended for module authors. Read [Module basics](./modules.md) and [Runtime parameters](./runtime-parameters.md) first.

## Required structure {#structure}

| Part | Purpose |
| --- | --- |
| Module | Inspector settings in an ordinary C# class derived from `FluxParticleModule` |
| Contract | Parameter IDs, types, change policies, and handle slot assignments |
| Definition | Editor code registering parameters, value reads/writes, and operations from Module settings |
| HLSL | GPU particle processing |
| Handle and extension methods | Access to parameters from UdonSharp |

The Module is neither a UdonSharpBehaviour nor a Component to attach to a GameObject. Its settings live in the Inspector module list and are compiled into GPU processing. An HLSL file alone does not register a module.

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

`optionalDependencies` places the operation after each listed operation that exists. This example accelerates after Gravity, Force, Noise, Vortex, Drag, and Limit Velocity. It also works without those standard modules.

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
            Debug.LogWarning("Some CustomLift settings were rejected.");
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
