<span id="inspectorとプレビュー"></span>

# Inspector and preview

Configure FluxFX through the custom FluxParticleSystem Inspector. Select the root of the Prefab placed in the [Quick start](./quickstart.md). You normally do not need to edit internal child components.

<span id="設定画面を使う"></span>

## Use the settings panel

Language / 言語 switches between English and Japanese. This guide uses the English field names.

| Section | Contents |
| --- | --- |
| [Main](./main.md) | Capacity, playback, and initial lifetime/speed values |
| [Emission](./emission.md) | Rate and bursts |
| [Shape](./shape.md) | Spawn positions and velocity directions |
| [Modules](./modules.md) | Movement and appearance effects |
| [Renderer](./renderer.md) | Rendering, textures, blending, and bounds |
| Backend | Generated configuration, capacity, and memory estimates |

Expand the relevant section to edit it. FluxParticleAuthoring must be on the same GameObject. If an Authoring-required error appears, compare against the included Prefab.

Normally, edit settings outside Play Mode and save the scene. Runtime changes use supported UdonSharp APIs instead.

<span id="sceneビューで確認する"></span>

## Preview in the Scene view

In Edit Mode, display the target Inspector and enable the FluxFX Preview overlay. Inactive GameObjects and objects hidden in the Scene view are not drawn in the preview.

| Button | Behavior |
| --- | --- |
| Play | Resume time progression |
| Pause | Freeze time at the current state |
| Restart | Reset to the initial state and play |
| Stop | Reset to the initial state and stop |

This Stop differs from runtime Stop(), which continues updating existing particles.

Playback Time shows elapsed preview time. Alive particles shows the asynchronously obtained count, not an immediate exact value. Before a result is available, it shows an em dash (—).

<span id="設定変更と再生成"></span>

## Changes and regeneration

Changes to Authoring settings or Particle Count rebuild the preview configuration. Do not expect existing particles to survive; use Restart to compare from the same starting point.

Preview time pauses while Unity is unfocused and does not catch up all the missed time on return. Preview update frequency and time steps are capped, so do not use it to benchmark runtime frame rate.

Entering Play Mode disposes of the Editor preview and switches to runtime rendering. Verify in Play Mode after adjusting the preview.

<span id="backendを見る"></span>

## Inspect the Backend

Backend is optional during normal authoring. Open it to inspect capacity or cost.

| Display | Meaning |
| --- | --- |
| Maximum Particle Count (Current GPU) | Technical limit for the current GPU and Mesh, not a recommended count |
| State Pages / State RenderTextures | State storage pages and texture counts |
| Estimated State Memory | Estimated memory for state textures |
| Estimated Spawn Allocation Memory | Estimated memory for spawn allocation textures |
| Simulation Passes / Clear Passes | Update and initialization pass counts |
| Lookup Tables | Tables for curves, gradients, and similar data |

These estimates are not total effect memory: Meshes and other resources also consume memory.

Generation errors appear in Backend or the overlay. Check Mesh, shape values, and module settings, then retry with Restart.
