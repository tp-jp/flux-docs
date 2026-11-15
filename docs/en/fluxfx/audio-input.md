# Audio Input

Read AudioLink input and supply audio responses for other modules. **Adding this module alone does not change color, size, or motion.** Combine it with [Brightness audio brightening](./brightness.md#audio) or a custom module that reads its input.

## Setup {#setup}

Add it through **Modules → Position Update → Add Module → Audio Input** in the Authoring Inspector. Despite this display group, it does not directly modify particle positions.

AudioLink is optional. At build time, FluxFX checks for `Packages/com.llealloo.audiolink/Runtime/Shaders/AudioLink.cginc`; if unavailable, it generates processing that uses zero as the input and shows guidance in the Inspector. To react to sound, install AudioLink and configure the scene to supply audio input. Audio Input does not play an AudioSource or set up AudioLink.

If you install AudioLink later, recreate Preview or re-enter Play Mode to rebuild the configuration.

## Settings {#settings}

| Field | Default | Range and purpose |
| --- | --- | --- |
| Band | Bass | Bass / LowMid / HighMid / Treble |
| Gain | 1 | 0–4; sensitivity for the selected band and four-band average |
| Noise Floor | 0.02 | 0–0.5; silence threshold subtracted before rescaling |
| Strength | 1 | 0–1; multiplier applied after clamping input levels to 0–1 |
| Attack | 0.2 | At least 0.01 seconds; tracking time for increasing responses |
| Release | 0.8 | At least 0.01 seconds; tracking time for decreasing responses |
| Slow Response | 0.4 | At least 0.01 seconds; slow response tracking time toward the fast response |
| Average Gain | 1.5 | 0–4; additional sensitivity for the four-band average |
| Timeout | 1 | At least 0.01 seconds; time without an AudioLink frame update before treating input as stale |

Responses approach their targets using exponential smoothing. Attack and similar settings do not specify an exact time to reach the target completely.

## Response values {#response}

`audio-input.response` is a Float3 stored per particle. Each component ranges from 0 to 1, starts at zero at Spawn, and is updated while the particle is alive.

| Component | Meaning |
| --- | --- |
| x | Fast selected-band response, smoothed by Attack / Release |
| y | Slow response tracking x using Slow Response |
| z | Four-band average response, using Average Gain and Attack / Release |

Responses decay toward zero when input is unavailable, frame updates stop beyond Timeout, or Enabled is turned off. **Updates continue while disabled to allow decay.** Compare with the module removed when evaluating cost.

[Brightness](./brightness.md#audio) does not use this response. It computes its own response from the unsmoothed four-band average. Adjust its response speed with Brightness Audio Attack / Release, not Audio Input Attack / Release / Slow Response. Band selection also has no effect on Brightness.

Custom modules can use the [audio response read contract](./custom-module-reference.md#audio-response-read) for smoothed responses, or [ReadSample / ReadFreshness](./custom-module-reference.md#brightness) for their own smoothing. There is no automatic connection to standard Color over Lifetime or similar modules.

## Change settings at runtime {#runtime}

Access `target.Modules.AudioInput` and use extension methods from `TpLab.Flux.FX.Udon.Modules`.

Band, Gain, NoiseFloor, Strength, Attack, Release, SlowResponse, AverageGain, and Timeout each have matching `GetName` / `SetName` methods. GetEnabled / SetEnabled control the enabled state. Band uses `TpLab.Flux.FX.Udon.FluxParticleAudioBand`.

All support Live changes, including adjustment in the Authoring Inspector during Play Mode. The Handle controls input settings; it is not an API for reading per-particle responses back to the CPU. Follow the shared [Runtime API](./runtime-parameters.md) guidance for null and setter-result checks.

## If nothing reacts {#troubleshooting}

- Include a module that consumes Audio Input's input or response, such as Brightness with Audio Enabled on.
- Check AudioLink installation and input supply. Playing audio alone does not guarantee valid AudioLink input.
- Check Enabled, Gain, Strength, Noise Floor, Band, and whether particles are alive.
- A slowly fading smoothed response reflects Release / Slow Response. Brightness audio brightening decays using its own Audio Release. Neither is reset instantly by disabling.
