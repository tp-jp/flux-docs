<span id="fluxfxガイドの目次"></span>

# FluxFX guide contents

Start with installation and the quick start, then explore Inspector settings, modules, and UdonSharp control. Help covers troubleshooting and performance.

<span id="はじめに"></span>

## Getting started

| Chapter | Topics |
| --- | --- |
| [Overview](./index.md) | Features and workflow |
| [Installation](./installation.md) | VCC, dependencies, and verification |
| [Migration](./migration.md) | Move legacy settings to Authoring; migrate and save Prefabs and Scenes |
| [Quick start](./quickstart.md) | Add a Prefab, display particles, and adjust initial settings |
| [Release notes](./release-notes.md) | Changes and verification scope |

<span id="基本操作"></span>

## Basics

| Chapter | Topics |
| --- | --- |
| [Inspector and preview](./inspector-preview.md) | Authoring and System, copying settings, Preview following and freezing, baking, and Live editing |
| [Main](./main.md) | Capacity, initial values, simulation space, System Follow, and playback |
| [Emission](./emission.md) | Rate, bursts, and playback cycles |
| [Shape](./shape.md) | Spawn shapes and regions |
| [Renderer](./renderer.md) | Billboard, Mesh, textures, blending, and bounds |
| [Generated asset management](./generated-assets.md) | Manual analysis and cleanup, automatic startup cleanup, protection, and extension APIs |

<span id="モジュール"></span>

## Modules

| Chapter | Topics |
| --- | --- |
| [Module basics](./modules.md) | Adding, configuring, and combining modules |
| [Forces and velocity](./forces.md) | Gravity, Force, Drag, and Limit Velocity |
| [Motion effects](./motion.md) | Noise, Vortex, and Velocity over Lifetime |
| [Appearance over lifetime](./lifetime-appearance.md) | Color, Size, and Rotation over Lifetime |
| [Texture Sheet Animation](./texture-animation-blink.md) | Texture Sheet Animation |
| [Distance Fade](./distance-fade.md) | Camera-distance fading and RGB / Alpha targets |
| [Audio Input](./audio-input.md) | AudioLink's four bands and average, channels, and Brightness connections |
| [Brightness](./brightness.md) | Base variation, waveforms, audio input selection, and legacy Blink migration |
| [Trails](./trails.md) | Trail settings and display |

<span id="udonsharpからの制御"></span>

## Controlling FluxFX from UdonSharp

| Chapter | Topics |
| --- | --- |
| [Playback controls](./playback.md) | Play, Stop, Pause, Restart, and Clear |
| [Runtime parameters](./runtime-parameters.md) | Changing values and when they take effect |
| [Status and particle counts](./state-and-count.md) | Playback state, elapsed time, and alive counts |

## Custom module development {#custom-module-development}

| Chapter | Topics |
| --- | --- |
| [Custom module quick start](./custom-module-quickstart.md) | Generate a module, preview it, and change its HLSL (development version) |
| [Architecture](./architecture.md) | Settings, compilation, execution, rendering, and component responsibilities |
| [Custom modules](./custom-modules.md) | Creating custom settings, GPU operations, and UdonSharp handles |
| [Data and execution model](./data-and-execution.md) | Phases, Values, Providers, reads/writes, and Parameter design |
| [Reference](./custom-module-reference.md) | Standard IDs, dependencies, HLSL signatures, and naming rules |
| [Validation and performance](./validation-and-performance.md) | Debugging, behavior checks, generated results, and performance comparisons |

<span id="困ったとき"></span>

## Help

| Chapter | Topics |
| --- | --- |
| [Troubleshooting](./troubleshooting.md) | Display, generation, and runtime parameter problems |
| [Limitations and performance](./limitations.md) | Capacity, Mesh, Trails, environments, and synchronization |
