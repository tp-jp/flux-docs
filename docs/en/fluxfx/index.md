<span id="fluxfxの概要"></span>

# About FluxFX

FluxFX is a GPU particle and effects system for VRChat. Configure particle emission, movement, and appearance in Unity's Inspector, then simulate and render on the GPU.

<span id="できること"></span>

## Features

| Area | Options |
| --- | --- |
| Initial state | Lifetime, speed, color, size, and rotation |
| Emission | Continuous emission, timed bursts, and looping |
| Spawn shape | Point, Sphere, Hemisphere, Circle, Box, and Cone |
| Movement | Gravity, force, drag, speed limits, Noise, Vortex, and more |
| Appearance | Color, size, and rotation over lifetime; texture animation; blinking; and Trails |
| Rendering | Billboard or Mesh, textures, and blending |
| Runtime control | Playback and supported parameter changes from UdonSharp |

<span id="制作の流れ"></span>

## Workflow

1. Install FluxFX and its dependencies.
2. Add the included FluxParticleSystem Prefab to the scene.
3. Configure it in the Inspector and preview in the Scene view.
4. Verify runtime behavior in Play Mode.

You can create your first effect without writing C# or shaders. Add UdonSharp control when you want to operate it from buttons or other scripts.

<span id="設定する場所"></span>

## Where to configure it

Select FluxParticleSystem on the Prefab root to open its custom Inspector.

| Section | Purpose |
| --- | --- |
| Main | Capacity, playback, and initial values |
| Emission | Continuous emission and bursts |
| Shape | Spawn region |
| Modules | Movement and appearance effects |
| Renderer | Rendering mode, texture, blending, and bounds |

Settings are stored in FluxParticleAuthoring on the same GameObject. SceneFlow generates the runtime configuration. You normally do not need to assemble internal Buffers or Kernels manually.

<span id="利用にあたって"></span>

## Before you start

FluxFX depends on Flux, the Worlds SDK, and SceneFlow. See [Installation](./installation.md). You do not need to learn Flux's GPU API first.

Not every Inspector setting can be changed after simulation starts. Some runtime parameters are fixed, some affect existing particles, and some apply only to newly spawned particles.

FluxFX is in early development. Its API and package structure may change.

<span id="次に読む"></span>

## Next steps

Prepare your environment with [Installation](./installation.md), then display your first particles with the [Quick start](./quickstart.md). See the [guide contents](./guide.md) for the remaining topics.
