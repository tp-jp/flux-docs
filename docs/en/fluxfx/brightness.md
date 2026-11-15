# Brightness

Control per-particle brightness variation, smooth modulation, and blinking. Add **Modules → Rendering → Add Module → Brightness** in the Authoring Inspector.

If you have legacy Blink settings, follow the [migration steps](#migration).

## Settings {#settings}

Rendering color is multiplied by **base multiplier × temporal multiplier × audio boost multiplier**. A newly added module leaves appearance unchanged: all three factors are 1.

| Setting | Default | Meaning |
| --- | --- | --- |
| Base Minimum / Maximum | 1 / 1 | Per-particle base multiplier; nonnegative |
| Waveform | Off | Off / Sine / Pulse |
| Period | 1 second | Base period; nonnegative |
| Period Minimum / Maximum | 1 / 1 | Per-particle period multiplier; at least 0.0001 |
| Random Phase | 0 | Random phase offset amount; 0–1 |
| Time Mode | System Time | System Time / Particle Age |
| Minimum / Maximum | 0 / 1 | Temporal multiplier range; nonnegative |
| Duty | 0.5 | Pulse on-time fraction; 0–1 |
| Smoothness | 0 | Pulse transition smoothness; 0–1 |
| Target | RGB | RGB / Alpha / Both |
| Audio Enabled | OFF | Include audio processing in the configuration |
| Audio Boost | 2 | Audio brightening amount; nonnegative |
| Audio Attack / Release | 0.025 / 0.12 seconds | Audio rise and decay times; at least 0.01 seconds |

The Inspector supports Japanese and English. Off hides temporal settings; Duty and Smoothness appear only for Pulse. Audio Boost, Audio Attack, and Audio Release appear only when Audio Enabled is on.

## Changes over time {#waveforms}

Sine is a continuous sine wave. Pulse has on and off intervals. Setting Smoothness to 1 does not make Pulse equivalent to Sine.

- Off or Period 0 produces a temporal multiplier of 1. Base and audio multipliers still apply.
- With a positive period, Pulse Duty 0 uses Minimum and Duty 1 uses Maximum.
- Pulse with Minimum 0 and Smoothness 0 has distinct on and fully off intervals.
- Period is multiplied by a per-particle period factor. Different factors produce different periods even in System Time mode. For Sine, the resulting period is clamped to at least 0.01 seconds.

System Time is simulation elapsed time, not wall-clock or shared network time. Particle Age is time since each particle spawned. New Brightness Sine and Pulse modes use an integer hash for per-particle phase; Random Phase controls the offset amount.

**Example settings**: Pulse, Period 0.5, period multipliers 1 / 1, Minimum / Maximum 0 / 1, Duty 0.5, Smoothness 0, and Random Phase 0 alternate bright and dark about every 0.25 seconds. Compare smooth modulation using Sine, Period 2, and Minimum / Maximum 0.2 / 1. These are examples, not defaults.

## Target and blending {#target}

RGB multiplies RGB only, Alpha multiplies Alpha only, and Both multiplies both. RGB supports multipliers above 1 for brightening. Both can produce different results from RGB because Alpha also participates in blending.

For blinking through transparency, try Renderer Blend Mode Alpha and Target Alpha. RGB 0 alone can leave black particles with Alpha blending. Opaque does not use Alpha for transparency. [Trails](./trails.md) use dedicated rendering and do not inherit this multiplier.

## Brighten with audio {#audio}

Base variation, Sine, and Pulse do not require AudioLink. For audio brightening, add [Audio Input](./audio-input.md) to the same System, install AudioLink and configure input, then enable Audio Enabled before entering Play Mode.

Brightness reads Audio Input's **unsmoothed four-band average** and input freshness, applying its own Audio Attack / Release. It neither reuses the smoothed response nor reads the AudioLink texture separately. Input Gain, Noise Floor, Strength, and Average Gain affect it; the selected Band and Audio Input Attack / Release do not control Brightness's response.

The audio response starts at zero for each particle and approaches its target exponentially using Audio Attack / Release. These times do not specify an exact duration to reach the target completely. The audio multiplier is 1 plus the squared response multiplied by Audio Boost and a per-particle factor from 0.65 to 1.

Silence, unavailable input, or disabling Audio Input or Brightness causes the audio response to decay to zero and the audio multiplier to return to 1. If frame updates stop while input values remain, decay starts when Audio Input's Timeout is reached. While Brightness is disabled, its rendering multiplier is also bypassed.

Without AudioLink, Audio Input shows a warning and supplies zero input. If Audio Enabled is on but Audio Input is missing, Brightness shows a warning and building fails with a dependency error. Audio Enabled off adds no audio-update GPU state or operations.

## Runtime API {#runtime}

Use `particleSystem.Modules.Brightness`; it returns null if the module is absent. The Handle is `FluxParticleBrightnessHandle`, with extension methods in `TpLab.Flux.FX.Udon.Modules`.

BaseMinimum, BaseMaximum, Waveform, Period, PeriodMinimum, PeriodMaximum, RandomPhase, TimeMode, Minimum, Maximum, Duty, Smoothness, and Target each have Get / Set methods. Enabled also supports Live changes. Use `FluxParticleBrightnessWaveform`, `FluxParticleBrightnessTimeMode`, and `FluxParticleBrightnessTarget` from `TpLab.Flux.FX.Udon`.

**Audio Enabled is a build-time setting**, not an API switch that adds audio processing at runtime. AudioBoost, AudioAttack, and AudioRelease support Live Get / Set operations, but have no audio brightening effect if the configuration was built with Audio Enabled off. See [Runtime API](./runtime-parameters.md) for shared usage rules.

## Migrate legacy Blink {#migration}

Legacy Blink types, Handles, enums, IDs, and APIs have been removed; no compatibility API remains. Convert saved settings using the explicit migration menu. **Do not remove missing legacy modules before migration: missing types can still be converted.**

1. Back up the project and exit Play Mode.
2. Save changes in open Scenes and the Prefab Stage. Prefabs and Scenes under Assets must be saved in text (YAML) format for migration.
3. Update code using the old APIs as below and resolve compilation errors.
4. Run **Tools → FluxFX → Migration → Migrate Blink to Brightness**.
5. Verify converted settings, Prefab inheritance and overrides, and appearance.

| Legacy API or setting | Replacement |
| --- | --- |
| Modules.Blink | Modules.Brightness |
| FluxParticleBlinkHandle | FluxParticleBrightnessHandle |
| Blink TimeMode / Target enums | Corresponding Brightness enums |
| SetFrequency(f) | SetPeriod(1 / f) for f > 0; SetPeriod(0) for f = 0 |
| blink.* Parameter IDs | brightness.*; convert frequency to period and change units |
| render.blink | render.brightness |

Saved settings become Pulse, preserving Minimum, Duty, Smoothness, Random Phase, Time Mode, Target, and Enabled. Maximum becomes 1, base and period multipliers become 1 / 1, and audio brightening is OFF. Migrated Pulse retains its legacy phase through hidden migration metadata. There is no Inspector compatibility mode.

The menu updates **saved Prefab and Scene files under Assets**, including closed Scenes. This differs from [Authoring migration](./migration.md), which processes only open Scenes. Reference IDs and per-field overrides are preserved, and rerunning does not duplicate modules. Incomplete settings, ambiguous reference IDs, or coexisting Blink and Brightness cause the operation to stop and report the problem. Conversion is not unconditional for every configuration.

The operation creates backups under Temp; also keep your project backup. If old generated shaders reference removed HLSL, after migrating settings you may need **Tools → FluxFX → Clean Unused Generated Assets**.

## Sample differences {#samples}

RuntimeApiPlayground and SyncedRuntimeApi expose 13 Brightness settings and Enabled. Frequency has become Period in seconds; there is no audio-brightening UI. Sample defaults are **Brightness disabled, Pulse, Period 0.5 seconds, Target Alpha**, unlike the Off / RGB defaults of a newly added standard module.

Off disables temporal controls; Duty / Smoothness are available only for Pulse. Changes made in the Inspector do not automatically update the sample UI. SyncedRuntimeApi synchronizes settings and playback commands, not identical particle positions or simulation time. MillionParticles has no added Brightness control UI. Update samples already imported into Assets separately from the package.
