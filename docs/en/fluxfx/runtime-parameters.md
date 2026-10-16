<span id="実行時のパラメーター変更"></span>

# Runtime parameters

Get handles for Main, Emission, Shape, and modules from `FluxParticleSystem`, then use typed methods to adjust the configuration prepared in the Inspector.

<span id="操作の入口"></span>

## API entry points

| Entry point | Example methods | Namespace |
| --- | --- | --- |
| `target.Main` | `SetStartSpeed`, `SetDuration` | `TpLab.Flux.FX.Udon.Parameters` |
| `target.Emission` | `SetRate`, `SetBursts` | `TpLab.Flux.FX.Udon.Parameters` |
| `target.Shape` | `SetRadius`, `SetPosition` | `TpLab.Flux.FX.Udon.Parameters` |
| `target.Modules.Gravity`, etc. | `SetGravity`, `SetEnabled` | `TpLab.Flux.FX.Udon.Modules` |
| `target` | `SetRenderIntensity` | `TpLab.Flux.FX.Udon` |

Obtain handles from the target; do not construct them with `new` or edit internal lists. Unconfigured Main/Shape or absent modules can be null; check each handle before using it. Modules included but disabled remain accessible and can be enabled with `SetEnabled(true)`.

<span id="反映されるタイミング"></span>

## When changes take effect

| Category | Examples | Timing |
| --- | --- | --- |
| Emission rate | Emission Rate | Next emission calculation |
| Spawn values | Start Speed, Shape position/radius | Newly spawned particles; existing initial velocity and spawn positions are unchanged |
| Update/render values | Gravity, module enabled state, Intensity, Blink | Subsequent updates/rendering |
| Emission schedule | Start Delay, Duration, Loop, Bursts | Next Restart |
| Static | Start Lifetime, Start Color, Start Size, Start Rotation, and their ranges; Texture Sheet Animation Tiles | Locked after the first simulation update |

Static values lock on the first simulation update, even if no particle has spawned. Turning off Play On Awake does not prevent simulation updates. Pause, Stop, Clear, and Restart do not unlock these values.

<span id="発生頻度と重力を変える例"></span>

## Change rate and gravity

Add Gravity in the Inspector first. Create the following U# Script as described in [playback controls](./playback.md), assign the Prefab root to Target, and call `ApplySettings` after startup.

```csharp
using TpLab.Flux.FX.Udon;
using TpLab.Flux.FX.Udon.Modules;
using TpLab.Flux.FX.Udon.Parameters;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxRuntimeSettings : UdonSharpBehaviour
{
    [SerializeField]
    FluxParticleSystem target;

    public void ApplySettings()
    {
        if (target == null || target.Emission == null || target.Modules == null)
            return;

        var gravity = target.Modules.Gravity;
        if (gravity == null)
        {
            Debug.LogWarning("Add Gravity in the Inspector.");
            return;
        }

        bool accepted = target.Emission.SetRate(16f);
        accepted &= gravity.SetGravity(new Vector3(0f, -0.5f, 0f));
        accepted &= gravity.SetEnabled(true);
        accepted &= target.SetRenderIntensity(1.5f);

        if (!accepted)
            Debug.LogWarning("Some settings were rejected.");
    }
}
```

Multiple Set calls are not an atomic transaction. If one fails, earlier successful changes remain applied.

<span id="対応する項目を確認する"></span>

## Check available parameters

Generated parameters depend on Constant versus Random Between Two Constants, Shape type, and module Mode. Use `SetStartSpeedRange` for a range and `SetStartSpeed` for Constant.

```csharp
var main = target.Main;
if (main != null)
{
    if (main.HasStartSpeed())
        main.SetStartSpeed(2f);
    else if (main.HasStartSpeedRange())
        main.SetStartSpeedRange(new Vector2(1f, 2f));
}
```

`HasStartSpeed()` and `Shape.HasRadius()` report whether the configuration includes a parameter, not whether it is currently writable or enabled. Use `GetEnabled()` for module state and the Set return value for acceptance. Unsupported Get calls may return zero-like values, so zero alone does not establish availability.

When Start Rotation is Constant zero and no module changes rotation, rotation processing and parameters are omitted. `HasStartRotation()` is then false, and reinitialization does not make SetStartRotation available. Prepare rotation support in the Inspector beforehand.

<span id="スケジュールを変更する"></span>

## Change the schedule

After checking Main and Emission are non-null, this example configures a non-looping burst of 8 at time 0 and 4 at 0.5 seconds.

```csharp
bool accepted = target.Main.SetStartDelay(0f);
accepted &= target.Main.SetDuration(2f);
target.Main.SetLoop(false);
accepted &= target.Emission.SetRate(0f);
accepted &= target.Emission.SetBursts(
    new float[] { 0f, 0.5f },
    new int[] { 8, 4 });

if (accepted)
{
    target.Clear();
    target.Restart();
}
```

Burst times must be nonnegative and sorted, counts at least 1, and arrays equal in length. Pass two empty arrays to remove bursts. Array contents are copied; later edits to the originals do not change settings. Duration must be at least 0.01 seconds.

Get methods for Start Delay, Duration, Loop, and Bursts return settings for the next Restart, not proof they are active in the current cycle.

<span id="staticの値を再設定する場合"></span>

## Reset Static values

Normally configure these in the Inspector. If runtime changes are necessary, Pause simulation and Release/Initialize the Executor before setting values. This discards particles and history and is unsuitable for every-frame use.

The following changes only Start Lifetime. Call it after startup on a successfully initialized system.

```csharp
target.Pause();
target.Executor.Release();
if (!target.Executor.Initialize(target.ParticleCount))
{
    Debug.LogError("FluxFX reinitialization failed.");
    return;
}

if (!target.Main.SetStartLifetime(2f))
{
    Debug.LogWarning("Could not change Start Lifetime.");
    return;
}

target.Restart();
```

Pass the existing `ParticleCount` to Initialize. This reinitializes GPU execution for the same configuration; it does not regenerate shaders or structure. Add modules or change Shape type, Simulation Space, Renderer type, curves, gradients, or trail point counts in the Inspector.

<span id="変更が拒否される場合"></span>

## Rejected changes

Set methods returning bool reject unsupported parameters, locked Static values, invalid types, and out-of-range values. Check the result rather than assuming automatic clamping. NaN and Infinity are rejected too.

Inspector constraints still apply: Billboard supports only Z rotation, sizes/rates are nonnegative, and Trails Duration must be positive. Changing Duration on enabled Trails or re-enabling Trails clears history.

Runtime edits do not modify the saved Prefab or synchronize over the network. See [Status and particle counts](./state-and-count.md) for status display.
