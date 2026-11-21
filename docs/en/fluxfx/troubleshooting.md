<span id="トラブルシューティング"></span>

# Troubleshooting

First identify whether the issue occurs in Scene view preview, Play Mode, or the actual world. Resolve generation and initialization errors in the Console before tuning appearance.

<span id="最小構成で切り分ける"></span>

## Isolate with a minimal setup

1. Place a fresh bundled FluxParticleSystem Prefab.
2. Check the [quick start](./quickstart.md) configuration without extra modules.
3. Compare Main, Emission, Shape, and Renderer with the original effect.
4. Add modules one at a time to identify the triggering change.

If the fresh Prefab also fails, check dependencies and generation. If only the original fails, check settings and internal references. Editing generated shaders or internal buffers directly can create a mismatch between settings and runtime configuration.

<span id="inspector・プレビュー・play-mode"></span>

## Inspector, preview, and Play Mode

| Symptom | Check |
| --- | --- |
| Custom Inspector missing | Open FluxParticleAuthoring (Flux FX Settings) on the Prefab root; resolve C# compilation errors. System uses the standard UdonSharp Inspector |
| Migration requested | Follow [migration](./migration.md) before editing settings |
| A field is disabled in Play Mode | Only supported Live fields are editable; edit saved settings after exiting Play Mode |
| Preview overlay missing | Show the target Inspector in Edit Mode and the FluxFX Preview overlay in Scene view |
| Preview preparation fails | Inspect preview errors and Console for invalid values, meshes, or missing module definitions |
| Preview works but Play Mode fails | Check SceneFlow generation, dependencies, and Prefab references |
| Generation does not run on entering Play Mode | Enable normal scene reload and retry |

See [installation](./installation.md). Confirm SceneFlow Debug Window detects `FluxFXCompileBuildPass` and `FluxBuildPass`. Preview success does not guarantee runtime generation succeeds.

<span id="粒子が発生しない・見えない"></span>

## Particles do not spawn or appear

| Setting/area | Action |
| --- | --- |
| Play On Awake / playback API | Call Play if automatic playback is off; check Pause |
| Start Delay | Wait for it or set it to 0 while investigating |
| Rate over Time / Bursts | Rate 0 without bursts emits nothing; try Rate 8 |
| Completed non-looping schedule | Use Restart; Play does not rewind |
| Start Lifetime | Avoid zero or very short values; try 3 seconds |
| Start Size / Start Color / Intensity | Check nonzero size and RGB intensity; check alpha for transparent blends |
| Modules | Temporarily disable size/color changes and Brightness |
| Placement and camera | Check walls/floor, visibility, and layers |
| Culling Bounds | Include the full particle and trail area |

IsEmitting true does not prove particles have spawned. [Request the alive count](./state-and-count.md) to distinguish missing emission from invisible living particles.

<span id="数が増えない・burstが欠ける"></span>

## Counts stop growing or bursts are incomplete

Particle Count is capacity. Requests exceeding free slots are dropped, not deferred until slots become available.

Lower Rate, shorten lifetime, spread bursts out, or increase capacity if appropriate. Review [Limitations and performance](./limitations.md) before increasing capacity. Check that burst times fit within the emission cycle.

<span id="見た目が想定と違う"></span>

## Unexpected appearance

| Symptom | Check |
| --- | --- |
| Entire effect disappears at some angles | Culling Bounds may be too small; they remain Renderer-local even with World simulation |
| Lower alpha does not make particles transparent | Blend Mode must not be Opaque |
| Gradient colors differ | Gradient multiplies Start Color; try white |
| Final rotation differs | End Rotation adds to the initial rotation |
| Texture frames do not change | Check for Tiles 1×1 or Cycles 0 |
| No blinking | Check Brightness Waveform, Period, Minimum / Maximum, Duty, Target, and Blend Mode |
| Transparent overlap looks wrong | No per-particle depth sorting; adjust density, size, or blending |

See [Renderer](./renderer.md), [appearance over lifetime](./lifetime-appearance.md), [texture animation](./texture-animation-blink.md), and [Brightness](./brightness.md).

<span id="trailsが表示されない・途切れる"></span>

## Trails are missing or interrupted

Check positive Width and Color alpha, and moving particles. Two distinct recorded positions are needed, so newly born or short-lived particles may have no visible trail.

Trails disappear with particles. Duration does not preserve them after death. Changing active Trails Duration or re-enabling Trails clears history.

For angular paths, balance Duration against Points Per Trail. At most one position is recorded per update, so increasing points cannot reconstruct movement between updates. See [Trails](./trails.md).

<span id="実行時の設定が変わらない"></span>

## Runtime settings do not change

| Situation | Action |
| --- | --- |
| Handle is null | Check references and generation; add the module in the Inspector first |
| Set returns false | Check parameter availability, numeric constraints, and Static lock |
| Successful Set does not change existing initial velocity | Start Speed and Shape apply to newly spawned particles |
| Duration / Loop / Bursts unchanged | Call Restart after setting them |
| Particles remain after Stop | Stop only stops emission; call Stop then Clear to hide them |
| Old particles remain after Restart | Call Clear then Restart for an empty restart |

Pause, Stop, Clear, and Restart do not unlock Static values. See the categories and reinitialization procedure in [runtime parameters](./runtime-parameters.md).

<span id="生存数が更新されない"></span>

## Alive count does not update

`RequestAliveCount()` returning true means the request started, not that it finished. Pending requests or intervals under 0.2 seconds can return false. Check `Executor.IsAliveCountPending` and `AliveCount` later.

- Treat -1 as unknown or failed, not zero.
- AliveCount is the last result, not a continuously refreshed value.
- Zero after Clear does not include later emission.

Retry periodically. If requests still fail, check initialization errors and target-environment readback support. See [Status and particle counts](./state-and-count.md) for an example.

<span id="consoleのエラーから調べる"></span>

## Investigate Console errors

These are distinctive message fragments; numbers and paths vary.

| Message fragment | Check |
| --- | --- |
| `Readable non-empty render Mesh` / `Render Mesh must be assigned and readable` | Mesh assignment, readability, and vertices |
| `Triangle render Mesh` / `Render Mesh with triangles` | Triangles topology on all submeshes and nonempty triangles |
| `Billboard start rotation around Z only` | Main rotation X/Y must be 0, including both range endpoints |
| `Billboard rotation over lifetime around Z only` | End Rotation X/Y must be 0 |
| `Cone angle in [0, 90) degrees` | Angle must be at least 0 and below 90 |
| `Duration of at least 0.01 seconds` | Main Duration must be at least 0.01 seconds |
| `Finite culling bounds with positive size` | Every Bounds size component must be positive and finite |
| `Module Definition is missing` | Module definitions and compilation errors; remove unsupported modules |
| `Buffer capacity must be in` / `Particle count must be in` | Lower capacity; check mesh and GPU limits |
| `Trail capacity exceeds Texture or Mesh limits` | Max Trails and Particle Count |
| `Particle Buffer RenderTexture allocation failed` | Capacity, memory, and GPU support |
| `Program Shader failed to compile` | Console shader errors; minimize the failing configuration |

`Particle Executor Manifest is invalid`, mismatched Buffer dimensions, and missing Prefab components indicate configuration problems. Before guessing internal references, check dependency versions and reproduce with a fresh bundled Prefab and normal generation.

If the issue persists, record package versions, environment, the first Console error, and a minimal reproducing configuration.

## Audio input and distance fading {#input-appearance}

| Symptom | Check |
| --- | --- |
| Audio Input has no visible effect | Include a response consumer; check AudioLink input, Enabled, Gain, Strength, and alive particles |
| Audio response remains after disabling Audio Input | The existing response decays through common Release / Slow Response; channels use their own Release. Disabling does not reset them instantly |
| Distance Fade has no effect | Check that the camera uses perspective projection, End Distance exceeds Start Distance, and all three axes have the same scale factor. Also check distance from the system origin and whether Target matches the blend mode |

See [Audio Input](./audio-input.md) and [Distance Fade](./distance-fade.md) for details.

## Brightness audio and legacy data {#brightness}

| Symptom | Check |
| --- | --- |
| Brightness does not change over time | Check for Waveform Off, Period 0, or equal Minimum and Maximum. Pulse also stays constant with Duty 0 or 1 |
| Enabling audio causes a build error | Add Audio Input to the same System. With Audio Enabled on, this dependency remains even if Brightness is disabled |
| No audio brightening | Turn on Audio Enabled before Play. Check both modules' Enabled states, Audio Boost, AudioLink input, and Audio Input Gain / Strength |
| Common Band or Attack / Release does not affect Brightness | For an independent response, adjust Brightness Audio Source / Audio Attack / Release. With a channel selected, adjust that channel's Source / Attack / Release |
| Audio Source / Audio Attack / Release are hidden | These fields are hidden with an existing channel selected; select Independent Response to show them |
| A channel is Missing | Check whether the referenced channel was deleted and select a valid channel or Independent Response. An unknown ID in use causes a build error |
| Connections or channel count cannot be changed during Play | Connection and array changes require rebuilding; stop Play before editing |
| Legacy Blink appears as missing | Preserve the old module and follow the [migration steps](./brightness.md#migration) |

Without AudioLink, input is zero. See [Brightness](./brightness.md) for settings.
