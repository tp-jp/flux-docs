# Main

Main in the FluxParticleAuthoring Inspector controls particle capacity, System following, playback, and initial values. Particle Count and Play On Awake are saved on Authoring and baked into System on entering Play Mode or building a world. Set emission frequency in [Emission](./emission.md), and spawn regions and directions in [Shape](./shape.md).

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

## System Follow {#system-follow}

System Follow moves the FluxParticleSystem GameObject to follow a target. Use it for effects such as snow or rain that keep emitting around the local player. It is a common System setting under **FluxParticleAuthoring → Main → System Follow**, not a Module.

| Setting | Meaning | Default |
| --- | --- | --- |
| System Follow | Select the follow target | OFF |
| Follow Transform | Target Transform; shown for Specified Transform | Unassigned |
| Follow Offset | Position offset from the target | `(0, 0, 0)` |
| Follow Offset Space | Coordinate system for the offset | World |
| Follow Rotation | How to follow the target's rotation | None |

| Target | Behavior |
| --- | --- |
| OFF | Do not follow. Data created before System Follow was added also uses this setting |
| Local Player Position | Follow the local player's base position |
| Local Player Head | Follow the local player's tracked head position |
| Specified Transform | Follow the assigned Follow Transform. System itself and its descendants are not valid targets |

Specified Transform requires Main's Follow Transform to be assigned. Leaving it unassigned or choosing System itself or a descendant causes configuration generation for Preview, Play Mode, and builds to fail. Choosing a preview-only target does not replace this setting.

### Offset and rotation {#follow-offset-and-rotation}

With Follow Offset Space set to **World**, the offset is added along world axes. **Target Rotation** rotates the offset with the target's orientation. The target's Scale is not applied to the offset.

| Follow Rotation | Behavior |
| --- | --- |
| None | Keep System's rotation |
| Horizontal Only | Follow only the horizontal heading |
| Full Rotation | Follow the full rotation, including tilt |

Offset space and rotation following are independent. For example, Target Rotation offset space with Follow Rotation set to None uses an offset relative to the target's orientation while keeping System's rotation.

### Runtime behavior {#follow-runtime}

- Following moves the System GameObject and its children. It does not copy the target's Scale.
- In **World** Simulation Space, existing particles do not move along with System. In **Local** space, existing particles move with System.
- After runtime starts, emission and simulation wait until a target is first acquired. Losing the target after that does not itself stop simulation: System retains its last position and rotation and its current playback state.
- `Pause()` stops particle emission and simulation, but System continues following. See [Architecture](./architecture.md#runtime) for update order.
- Local player following runs on each client. System Follow itself adds no network synchronization.

Configure following on Authoring before entering Play Mode. There is no Udon Runtime API for changing follow settings.

**Culling Bounds moves with System.** Set bounds in [Renderer](./renderer.md#set-rendering-bounds) that cover particles and Trails left behind in World space. Bounds are not expanded automatically, and particles are not wrapped or repositioned around the target.

### Example: snow around the player {#follow-snow-example}

1. Prepare a System that emits falling snow. If you are new to FluxFX, start with the [Quick start](./quickstart.md).
2. Set Main's Simulation Space to **World**.
3. Set System Follow to **Local Player Position**.
4. Set Follow Offset Space to **World** and adjust Follow Offset Y to place the emitter above the player. Set Follow Rotation to **None**.
5. [Play the preview](./inspector-preview.md#preview-follow) and first adjust the spawn region with **Fixed at Placement**.
6. Switch to **Follow Scene Camera** and move the Scene camera to check emission while moving.
7. Click **Freeze Follow Position** and move the camera away to inspect particles and Trails.
8. Adjust Culling Bounds to include particles emitted before System moved.

Adjust the effect for the spawn region, lifetime, falling speed, and player movement speed.

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
