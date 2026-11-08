<span id="inspectorとプレビュー"></span>

# Inspector and preview

Edit FluxFX settings in the custom `FluxParticleAuthoring` Inspector (**Flux FX Settings**). Select the root of the Prefab placed in the [Quick start](./quickstart.md). You normally do not need to edit internal child components.

<span id="設定画面を使う"></span>

## Use the settings panel

Language / 言語 switches between English and Japanese. This guide uses the English field names.

Custom modules can provide their own translations for headings and fields. Module authors can follow [Inspector language switching](./custom-modules.md#localization).

| Section | Contents |
| --- | --- |
| [Main](./main.md) | Capacity, playback, and initial lifetime/speed values |
| [Emission](./emission.md) | Rate and bursts |
| [Shape](./shape.md) | Spawn positions and velocity directions |
| [Modules](./modules.md) | Movement and appearance effects |
| [Renderer](./renderer.md) | Rendering, textures, blending, and bounds |
| Backend | Generated configuration, capacity, and memory estimates |

Expand the relevant section to edit it. A `FluxParticleSystem` must be on the same GameObject. Compare missing components against the included Prefab. If the Inspector requests migration, [migrate legacy data](./migration.md) before editing.

### Authoring and System roles {#authoring-and-system}

| Component | Role |
| --- | --- |
| `FluxParticleAuthoring` | Stores all editable settings, including Particle Count and Play On Awake, curves, gradients, and standard/custom Modules |
| `FluxParticleSystem` | Runtime entry point referenced by external Udon scripts for playback and parameter changes |

System uses the standard UdonSharp Inspector. Its settings SerializeFields are hidden. Edit effects on Authoring and assign System references to external control scripts.

### Copy settings {#copy-settings}

1. Exit Play Mode and [migrate](./migration.md) the source and destination if needed.
2. Open the source **FluxParticleAuthoring** component menu and choose **Copy Component**.
3. Open the destination Prefab root's **FluxParticleAuthoring** menu and choose **Paste Component Values**.
4. Check Particle Count, Play On Awake, curves, gradients, and Module settings, then save the Scene or Prefab.

Standard component copying copies the complete editable settings. You do not need to copy settings on System. Use an existing FluxFX Prefab as the destination to preserve its children and Runtime connections.

<span id="sceneビューで確認する"></span>

## Preview in the Scene view

In Edit Mode, display the target Authoring Inspector and enable the FluxFX Preview overlay. Inactive GameObjects and objects hidden in the Scene view are not drawn in the preview.

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

## Baking and Live editing in Play Mode {#baking-and-live-editing}

On entering Play Mode or building a world, Authoring settings generate the Runtime configuration, including baking Particle Count and Play On Awake into System. Edit Authoring outside Play Mode to save initial settings.

Continue using the Authoring Inspector during Play Mode. Supported Live fields appear in their original sections and read/write Runtime values. The display also follows changes made by external Udon through Runtime APIs. **Play Mode changes are discarded when Play Mode ends.**

Fields requiring regeneration or lacking Inspector update support are read-only, as are Scene view shape handles. Unbuilt or uninitialized Live fields are also read-only; do not bypass disabled fields by editing System directly. A Live API policy alone does not make a field editable without Inspector support.

External Udon continues to use the [FluxParticleSystem Runtime API](./runtime-parameters.md).

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
