<span id="モジュールの基本"></span>

# Module basics

Modules add movement or appearance changes to the basic particle settings. Select the Prefab root and open MODULES in the FluxParticleSystem Inspector.

<span id="追加して調整する"></span>

## Add and adjust a module

1. Exit Play Mode and open the target Inspector.
2. Expand a processing group under MODULES.
3. Choose a module from Add Module.
4. Edit it and restart the [preview](./inspector-preview.md) to compare.

You cannot add multiple modules of the same type. Already-added types are removed from the menu. Start with one at a time to understand each effect.

<span id="処理グループ"></span>

## Processing groups

| Group | Standard modules | Purpose |
| --- | --- | --- |
| Velocity Update | Gravity, Force, Noise, Vortex, Drag, Limit Velocity | Update stored velocity |
| Position Update | Velocity over Lifetime | Add displacement after normal motion |
| Rendering | Color, Size, Rotation over Lifetime; Texture Sheet Animation; Blink; Trails | Appearance and trails |

Other groups, such as Spawn, may appear depending on registered modules.

<span id="無効化と削除"></span>

## Disable or remove

Turn off a module to compare its effect while retaining settings. Use Remove Module in its removal menu to delete it.

Disabling retains the module's configuration and parameters. When comparing resource cost, also test a configuration with the module removed.

Disabling a Missing Module or unsupported module does not make the configuration buildable. Supply its definition or remove it.

<span id="組み合わせと処理順序"></span>

## Combining modules and execution order

With all standard motion modules present, execution follows:

```text
Gravity → Force → Noise → Vortex → Drag → Limit Velocity
                                      ↓
                         Normal motion using updated velocity
                                      ↓
                         Velocity over Lifetime displacement
```

Module definition dependencies determine order, not the order in which you add modules.

Gravity adds velocity before Drag attenuates it, and Limit Velocity caps the result. Velocity over Lifetime is a separate position update, so its displacement is not limited by Drag or Limit Velocity.

<span id="座標の基準"></span>

## Coordinate reference

Force, velocity, and center vectors use the particle simulation space: local coordinates in Local mode, world coordinates in World mode. These modules have no independent space selector. Trails records history in world coordinates regardless of Simulation Space.

For example, Vortex Center `(0, 0, 0)` in World mode refers to the world origin, not a center that automatically follows the emitter. Check [Simulation Space](./main.md#capacity-and-simulation-space) alongside module settings.

<span id="次に読む"></span>

## Next steps

- [Forces and velocity](./forces.md): acceleration, drag, and speed limits.
- [Motion effects](./motion.md): noise, vortices, and lifetime-based movement.
- [Appearance over lifetime](./lifetime-appearance.md): color, size, and rotation.
- [Texture animation and blinking](./texture-animation-blink.md): frames and periodic brightness.
- [Trails](./trails.md): recording and rendering movement history.
