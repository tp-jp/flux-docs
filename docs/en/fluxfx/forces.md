<span id="力と速度"></span>

# Forces and velocity

Add Gravity, Force, Drag, and Limit Velocity under **MODULES → Velocity Update**. They change the velocity stored by each particle, which is then used to update position.

## Gravity

Gravity specifies constant XYZ acceleration, initially `(0, -1, 0)`. Each update adds acceleration × elapsed seconds to velocity.

Without other velocity changes, `(0, -1, 0)` decreases Y velocity by about 1 per second. It does not read Unity Physics gravity settings automatically.

Combine it with upward initial velocity for rising and falling motion. Its Y direction is local Y in Local mode and world Y in World mode.

## Force

Force also adds a constant acceleration vector. Its default is `(0, 0, 0)`, so adding it alone does not change movement.

It currently uses the same addition as Gravity, with no division by mass. Separate downward acceleration into Gravity and effects such as wind into Force for easier tuning.

For example, Gravity `(0, -1, 0)` and Force `(0.5, 0, 0)` accelerate downward and along X. Force changes velocity over time rather than fixing it to a constant value.

## Drag

Drag is a nonnegative damping coefficient, initially 0.5.

It multiplies velocity by `exp(-Drag × elapsed seconds)`. Without other acceleration or limits, Drag 1 leaves about 37% of the speed after one second, and Drag 0.5 leaves about 61%. Zero disables damping.

It reduces magnitude without reversing direction. Velocity added by Gravity or Force in that update is also damped.

## Limit Velocity

Max Speed caps the magnitude of stored velocity. It is nonnegative and defaults to 1. Above the limit, the vector is scaled down without changing direction.

This is not an independent limit per axis. Velocity `(3, 4, 0)` with Max Speed 2 becomes `(1.2, 1.6, 0)`.

Max Speed 0 makes the stored velocity zero after this operation, but does not stop displacement from Velocity over Lifetime.

<span id="組み合わせて試す"></span>

## Try combinations

Start from the [Quick start](./quickstart.md), with Start Speed 1 and a lifetime around three seconds.

| Step | Example | Observe |
| --- | --- | --- |
| 1 | Gravity `(0, -1, 0)` | Paths curve downward |
| 2 | Add Force `(0.5, 0, 0)` | Additional sideways acceleration |
| 3 | Add Drag `0.5` | Different acceleration and travel distance |
| 4 | Set Limit Velocity Max Speed to `1` | Stored speed stays within the limit |

Restart preview for each comparison and compare the same elapsed time. Temporarily disable individual modules to isolate their effects.

<span id="期待どおりに動かない場合"></span>

## Unexpected motion

| Symptom | Check |
| --- | --- |
| Force has no effect | Its default is zero; check vector and enabled state |
| Weak acceleration | Drag too strong or Max Speed too low |
| Wrong gravity direction | Local/World mode and emitter rotation |
| Appears faster than the limit | Velocity over Lifetime, emitter movement, or Local scale |
| Particles disappear far away | Lifetime and Culling Bounds |

Values are in simulation space. World-space motion also includes Transform effects and other position updates.
