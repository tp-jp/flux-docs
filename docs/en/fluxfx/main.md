# Main

Main controls particle capacity, playback, and initial values. Set emission frequency in [Emission](./emission.md), and spawn regions and directions in [Shape](./shape.md).

<span id="容量とシミュレーション空間"></span>

## Capacity and simulation space

| Setting | Meaning |
| --- | --- |
| Particle Count | Allocated particle slots; at least 1 |
| Simulation Space | Local or World |

Particle Count is neither the alive count nor the rate. For continuous emission with a constant lifetime, `Rate over Time × Start Lifetime` estimates simultaneous particles. Eight per second with a three-second lifetime gives about 24. Allow extra capacity for bursts and varying lifetimes.

Technical capacity depends on GPU and source Mesh. Larger capacities consume more resources; start with what you need.

| Space | Behavior |
| --- | --- |
| Local | Particles use object-local coordinates and follow object movement and rotation |
| World | Spawn positions and velocities are transformed to world space; existing particles continue from their world positions when the emitter moves |

Compare with Scale `(1, 1, 1)` first. Even in World mode, [Culling Bounds](./renderer.md#set-rendering-bounds) is local to the Renderer.

<span id="再生条件"></span>

## Playback settings

| Setting | Meaning |
| --- | --- |
| Play On Awake | Automatically play at runtime startup |
| Start Delay | Initial emission delay in seconds; at least 0 |
| Duration | Emission cycle duration; at least 0.01 seconds |
| Loop | Repeat emission cycles |

Duration is not particle lifetime. With Loop off, emission ends after the cycle, but existing particles continue to age and move.

Start Delay applies at the beginning, not before every loop. See [Emission](./emission.md#cycles-and-start-delay).

<span id="生成時の初期値"></span>

## Initial particle values

| Setting | Meaning |
| --- | --- |
| Start Lifetime | Lifetime in seconds |
| Start Speed | Initial speed magnitude; Shape determines direction |
| Start Color | Initial color and Alpha |
| Start Size | Initial scale multiplier for the rendered shape |
| Start Rotation | Initial rotation in degrees |

Lifetime, Speed, and Size must be nonnegative. Use positive lifetime and size to make the effect visible, such as 3 seconds and 0.1. Speed 0 removes initial velocity, but force modules can still move particles.

Add Color, Size, or Rotation over Lifetime for changes during the particle's life.

Start Size is not a world-space diameter. The base Billboard square has side length 0.1: at Scale `(1, 1, 1)`, Start Size 1 produces side length 0.1, and Start Size 0.1 produces 0.01. Mesh mode scales the source Mesh vertices.

<span id="constantとランダム範囲"></span>

## Constant values and random ranges

| Mode | Behavior |
| --- | --- |
| Constant | Use the same initial value for every particle |
| Random Between Two Constants | Choose a per-particle value between Min and Max |

For example, Start Lifetime Min 1 and Max 3 give particles lifetimes between those values. Random Start Color interpolates between two colors rather than choosing unrelated RGBA components.

Billboard rotation supports only Z. Mesh supports XYZ. When switching to Billboard, set X and Y to zero, including both ends of a random range.

<span id="調整例"></span>

## Adjustment examples

At eight particles per second, shortening lifetime from 3 to 1 second lowers density. Raising speed from 1 to 2 moves particles farther during the same lifetime. To emit more particles, adjust Emission rather than increasing capacity alone.
