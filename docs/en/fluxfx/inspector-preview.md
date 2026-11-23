<span id="inspectorとプレビュー"></span>

# Inspector and preview

Edit FluxFX settings in the custom `FluxParticleAuthoring` Inspector (**Flux FX Settings**). Select the root of the Prefab placed in the [Quick start](./quickstart.md). You normally do not need to edit internal child components.

<span id="設定画面を使う"></span>

## Use the settings panel

Language / 言語 switches between English and Japanese. This guide uses the English field names.

Custom modules can provide their own translations for headings and fields. Module authors can follow [Inspector language switching](./custom-modules.md#localization).

| Section | Contents |
| --- | --- |
| [Main](./main.md) | Capacity, System Follow, playback, and initial lifetime/speed values |
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

## Preview Follow controls {#preview-follow}

When [System Follow in Main](./main.md#system-follow) is enabled, the Scene view's **FluxFX Preview → Preview Follow** controls appear. Choose where to display the preview independently of the runtime follow target.

| Control | Behavior |
| --- | --- |
| Fixed at Placement | Default. Use the placement in the Scene without applying the runtime follow target or offset |
| Follow Scene Camera | Follow the camera of the last active Scene view |
| Follow Specified Transform | Follow a Transform assigned specifically for the preview |
| Freeze Follow Position | Keep the current follow position and orientation |
| Release Follow Position | Resume following the current target |

Follow modes use Main's Follow Offset, Follow Offset Space, and Follow Rotation. The Scene camera stands in for the player; it does not automatically reproduce the height difference between Local Player Position and Head.

**Freezing the follow position is separate from pausing particles.** Freeze while playing to keep particles running, then move the camera away to inspect the effect from outside. Changing the mode or assigned Transform releases the freeze. Freeze/release buttons are not shown in placement mode.

An unassigned preview-only Transform does not fall back to the Scene camera or the runtime Follow Transform. After switching to a follow mode, simulation waits until a target is first acquired. If the target is later lost, the preview retains its last position and orientation and its playback state. You cannot newly freeze the position while no target is available. An existing freeze can be released, but following requires an available target to resume.

Changing the preview mode or target, or freezing/releasing the position, does not reset particles or Playback Time. Click **Restart** to compare from an empty state. Restart also preserves the target and frozen state.

If runtime System Follow is set to Specified Transform, [Main's Follow Transform must be valid](./main.md#system-follow) regardless of the preview mode. Unlike an unassigned preview-only Transform, an invalid Main setting causes configuration generation to fail.

Preview controls are temporary Editor state. They do not modify runtime settings, the Scene Transform, or saved Prefab data. Recreating the Inspector, for example by deselecting the object, restores the default placement mode. Rebuilding the preview after module edits preserves the target and frozen state.

The [snow around the player example](./main.md#follow-snow-example) walks through placement, camera following, and freezing the follow position.

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

Use [Generated asset management](./generated-assets.md) to clean up generated shaders and Materials. The cleanup window shows candidates and retention reasons; this operation is separate from Backend inspection.
