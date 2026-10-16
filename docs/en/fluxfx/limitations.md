<span id="制約と性能"></span>

# Limitations and performance

This page describes the FluxFX 0.0.3 implementation. Technical limits are not practical performance targets. Cost depends on capacity, meshes, modules, trails, screen overlap, and the target environment.

<span id="粒子の容量"></span>

## Particle capacity

Particle Count reserves slots before execution. Capacity does not automatically resize to match living particles. Emission uses free slots; excess requests are dropped.

| Constraint | Implementation |
| --- | --- |
| Numeric precision | At most 16,777,216 slots for exact particle indices |
| State texture | Side length `ceil(sqrt(Particle Count))`, within the GPU maximum texture size |
| Render mesh | Capacity × vertices/indices per particle must fit array and GPU buffer limits |
| 32-bit indices | Without support, total vertices are limited to 65,535 |
| Memory | Passing numeric validation does not guarantee allocation succeeds |

16,777,216 is not a recommended capacity. Combined constraints reduce the usable maximum. Generation validates GPU information, but success on the development GPU does not guarantee allocation on another GPU.

The standard public API does not resize Particle Count and rebuild all render meshes and state buffers at runtime. Choose capacity in the Inspector.

<span id="生存数を減らしても残る負荷"></span>

## Cost that remains with fewer living particles

State is stored in Flux RenderTextures, with shader passes over allocated areas. Render meshes are also built from capacity rather than alive count. Lowering Rate does not shrink textures or meshes.

Stop ends new emission but keeps simulation updating, including after all particles die. Pause stops simulation updates but does not remove existing rendering or allocated memory.

Culling Bounds control rendering visibility; being off-camera does not automatically stop FluxParticleSystem Update.

<span id="bufferとメモリの目安"></span>

## Buffers and memory estimates

FluxBuffer uses ARGBFloat: four 32-bit components, or 16 bytes per texel. A texture of side `W` contains approximately `W × W × 16` bytes of data.

Each state page has two textures for alternating reads and writes. Emission input, free-slot aggregation, lookup textures, and trails add resources. Page count depends on configuration, so one fixed bytes-per-particle value cannot describe total usage.

For 65,536 slots, a state texture is 256×256: about 1 MiB per texture and 2 MiB per paired page. This excludes meshes, auxiliary buffers, and driver overhead.

<span id="billboardとmeshの描画"></span>

## Billboard and mesh rendering

Billboard uses four vertices and six indices per particle. Mesh mode duplicates the source mesh vertices and indices for every slot. Complex meshes increase initialization work, memory, and vertex processing.

The source mesh must be readable, contain vertices and triangles, and use Triangles topology for every submesh. Rendering uses FluxFX's generated material rather than reproducing the source material configuration per particle.

Alpha and Additive do not write depth. Large overlapping particles or ribbons increase overdraw. Particles are not individually depth-sorted, so Alpha overlap may look incorrect.

Billboard supports only Z rotation; Mesh supports XYZ. Culling Bounds use Renderer local coordinates and must include World-space particles and trail history too.

<span id="モジュールと実行時変更"></span>

## Modules and runtime changes

Modules are incorporated during generation. Each type can be added only once, and definition dependencies determine processing order. Runtime APIs do not add previously absent modules.

Disabling retains module configuration and parameters; it does not necessarily save the same resources as removal. Remove unused modules in the Inspector and regenerate.

Static parameters Start Lifetime, Start Color, Start Size, Start Rotation, and Texture Sheet Animation Tiles lock after the first simulation update. Clear and Restart do not unlock them. See [runtime parameters](./runtime-parameters.md) for timing and supported changes.

Curves are sampled at 128 points over normalized lifetime 0–1. Gradient Blend also uses 128 samples; Fixed uses values based on key intervals. Check fine detail in the rendered result. Public runtime APIs do not edit the curves or gradients themselves.

<span id="trailsの負荷と制約"></span>

## Trail cost and constraints

Tracked count is `min(Particle Count, Max Trails)`. With `P` Points Per Trail, there are `P + 2` history/management buffers and `P − 1` rendering segments. Each segment has a material and MeshRenderer, so more points increase rendering as well as memory.

| Setting/aspect | Constraint |
| --- | --- |
| Points Per Trail | At least 2 |
| Duration | Positive and finite, with a valid derived recording interval |
| Recording | At most one point per simulation update; no intermediate interpolation |
| Tracked slots | Distributed across capacity, not dynamically selected from living particles |
| Particle death | Trail disappears too; Duration is not persistence after death |
| Coordinates | World-space history even with Local simulation |
| Appearance | Dedicated color, width, and alpha blend; does not inherit particle color, texture, or Blink settings |

Start with small Max Trails and Points Per Trail, increasing only for the required smoothness. See [Trails](./trails.md).

<span id="読み戻し・実行環境・同期"></span>

## Readback, environments, and synchronization

Alive counts require GPU aggregation and asynchronous readback. Requests are at least 0.2 seconds apart and cannot overlap. Delayed results are not exact per-frame counts; request only as often as the display needs.

FluxFX uses Flux ARGBFloat RenderTextures and shaders, plus VRCAsyncGPUReadback for counts. There is no automatic CPU simulation fallback. Verify GPU features, shader compilation, rendering, and readback in the target environment; implementation inspection alone does not establish support for every platform.

Each client runs its own simulation. Playback, parameters, and particle states are not automatically synchronized. Even shared playback commands do not guarantee identical update intervals or GPU results. Avoid designs that require particle positions to match exactly across clients.

<span id="負荷を比較する手順"></span>

## Compare performance

1. Compare on the target environment with identical camera position, resolution, and playback time.
2. Lower Particle Count to assess capacity-related simulation and rendering cost.
3. Use a simpler mesh or Billboard to assess vertex cost.
4. Reduce particle size and overlap to assess overdraw.
5. Lower Max Trails and Points Per Trail.
6. Compare configurations with unused modules removed, and reduce count-request frequency where possible.

Change one setting at a time. Distinguish lowering Rate from lowering capacity, and Stop from Pause. Measure initialization separately from ongoing playback.

Implementation alone cannot predict frame rate for a specific particle count. After preview tuning, evaluate the actual world alongside its other rendering and logic. For failures, see [troubleshooting](./troubleshooting.md).
