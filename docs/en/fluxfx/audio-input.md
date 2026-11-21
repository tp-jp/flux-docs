# Audio Input

Read AudioLink's Bass, Low Mid, High Mid, and Treble bands and their average, supplying audio responses for other modules. **Adding this module alone does not change color, size, or motion.** Combine it with [Brightness audio brightening](./brightness.md#audio) or a custom module that reads its input.

You can create multiple channels with separate input sources, gains, and response times. A channel here is an audio-reactive control signal, not a left or right stereo audio channel.

## Setup {#setup}

Add it through **Modules → Position Update → Add Module → Audio Input** in the Authoring Inspector. Despite this display group, it does not directly modify particle positions.

AudioLink is optional. At build time, FluxFX checks for `Packages/com.llealloo.audiolink/Runtime/Shaders/AudioLink.cginc`; if unavailable, it generates zero input and shows an Inspector warning. To react to sound, install AudioLink and supply audio to it in the scene. Audio Input does not play an AudioSource or set up AudioLink.

If you install AudioLink later, recreate Preview or re-enter Play Mode to rebuild the configuration.

## Try it with Brightness {#quickstart}

1. Add Audio Input and Brightness to a FluxParticleAuthoring that displays particles, as in the [Quick start](./quickstart.md).
2. Enable **Audio Enabled** on Brightness.
3. First select **Independent Response** for **Audio Channel**, then change **Audio Source** to Bass or another source.
4. To use a channel, click **Add Channel** on Audio Input and set its source, gain, and response times.
5. Select that channel in Brightness's **Audio Channel** field.
6. Check Preview or Play with audio supplied to AudioLink.

For comparison, create two channels using Bass. Set Attack / Release to 0.02 / 0.1 seconds on one and 0.3 / 1 seconds on the other, then switch between them. This compares a brief response and a slower response to the same bass input. These are example settings, not defaults. Channel connections cannot be changed during Play.

## Common settings {#settings}

| Field | Default | Range and purpose |
| --- | --- | --- |
| Band | Bass | Bass / Low Mid / High Mid / Treble for the existing selected-band response |
| Gain | 1 | 0–4; common sensitivity for all four bands and their average |
| Noise Floor | 0.02 | 0–0.5; silence threshold subtracted before rescaling |
| Strength | 1 | 0–1; multiplier applied after clamping input levels to 0–1 |
| Attack | 0.2 seconds | At least 0.01 seconds; rise time for the existing response |
| Release | 0.8 seconds | At least 0.01 seconds; decay time for the existing response |
| Slow Response | 0.4 seconds | At least 0.01 seconds; slow response tracking time toward the fast response |
| Average Gain | 1.5 | 0–4; additional sensitivity for the four-band average |
| Timeout | 1 second | At least 0.01 seconds; time without an AudioLink frame update before treating input as stale |
| Channels | Empty array | Channels with individual input sources and response times |

Band selects the input for the existing selected-band response. It does not restrict the sources available to added channels or Brightness. The common Attack / Release / Slow Response settings also do not set response times for added channels or Brightness.

## Create channels {#channels}

Click **Add Channel**, then configure these fields:

| Field | Default when added | Meaning |
| --- | --- | --- |
| Name | Channel 1, etc. | Display name |
| Channel ID | Generated automatically | Reference ID independent of name or array order |
| Source | Bass | Band or average to use |
| Gain | 1 | Additional sensitivity after common input processing; 0–4 |
| Attack | 0.2 seconds | Response time when input rises; at least 0.01 seconds |
| Release | 0.8 seconds | Response time when input falls; at least 0.01 seconds |

Source and Brightness's independent Audio Source offer five choices:

| English label | Japanese label |
| --- | --- |
| Average | 全帯域平均 |
| Bass | 低音 |
| Low Mid | 中低音 |
| High Mid | 中高音 |
| Treble | 高音 |

Average means **the average of AudioLink's four bands**, not an arbitrary frequency range or the entire spectrum. Raw bands are averaged before applying Noise Floor, Gain, Average Gain, and Strength. This differs from averaging already processed bands.

Each channel takes input after common Gain, Noise Floor, and Strength processing (also Average Gain for Average), applies its own Gain, clamps to 0–1, then smooths with Attack / Release. The response starts at zero per particle and updates while the particle is alive. Exponential smoothing does not reach the target completely in an exact specified duration.

### References and editable settings {#channel-editing}

References use fixed IDs and survive renaming, reordering, and saving. Deleting a referenced channel displays Missing in the Brightness Inspector when Audio Enabled is on and causes builds that use it to fail. Select a valid channel or Independent Response; no other channel is connected automatically. Empty, duplicate, or invalid IDs are rejected, so normally keep the ID generated by the Inspector.

| Operation | Live editing during Play |
| --- | --- |
| Common settings; channel Source, Gain, Attack, and Release | Supported |
| Brightness Audio Source for an independent response | Supported |
| Adding, removing, or reordering channels; changing Brightness's channel connection | Requires rebuilding; stop Play before editing |

Live changes are discarded when Play ends. To retain settings, stop Play and edit Authoring.

## Existing response and input loss {#response}

`audio-input.response` remains available as a per-particle Float3. Each component ranges from 0 to 1, starts at zero at Spawn, and updates while the particle is alive.

| Component | Meaning |
| --- | --- |
| x | Fast response from Band, smoothed with the common Attack / Release |
| y | Slow response tracking x using Slow Response |
| z | Four-band average response, using Average Gain and the common Attack / Release |

Silence, unavailable input, or disabling Audio Input causes existing and channel responses to decay toward zero. If frame updates stop while input values remain, decay starts at Timeout. **Updates continue while Audio Input is disabled to allow decay.** Disabling only Brightness does not stop channels managed by Audio Input from updating.

This behavior requires simulation updates for alive particles. Response tracking and Timeout measurement use the simulation time step; pausing the System stops both. Turning a module's Enabled off is different from pausing the entire System.

Brightness uses an [independent response or a channel response](./brightness.md#audio). For custom modules, see [audio input read contracts](./custom-module-reference.md#audio-response-read) for shared outputs and supported phases. There is no automatic connection to standard Color over Lifetime or similar modules.

## Change settings at runtime {#runtime}

Access `target.Modules.AudioInput` and use extension methods from `TpLab.Flux.FX.Udon.Modules`. Band, Gain, NoiseFloor, Strength, Attack, Release, SlowResponse, AverageGain, and Timeout each have matching `GetName` / `SetName` methods. GetEnabled / SetEnabled control the enabled state. Band uses `TpLab.Flux.FX.Udon.FluxParticleAudioBand`.

Get a channel with `target.Modules.GetAudioChannel(id)`. Copy the full ID from the channel's **Channel ID** field on Audio Input. Do not use the eight-character ID prefix shown in Brightness's dropdown, a display name, or an array index. An absent channel or unknown ID returns null.

| Setting | API |
| --- | --- |
| Source | GetSource() / SetSource(FluxParticleAudioSource) |
| Additional gain | GetGain() / SetGain(float) |
| Rise time | GetAttack() / SetAttack(float) |
| Decay time | GetRelease() / SetRelease(float) |

This runtime example assumes `target` is a prepared System and `channelId` is the full ID copied from the Inspector. Add using directives for `TpLab.Flux.FX.Udon` and `TpLab.Flux.FX.Udon.Modules`.

```csharp
var channel = target.Modules.GetAudioChannel(channelId);
if (channel == null) return;
if (!channel.SetSource(FluxParticleAudioSource.Bass)) return;
if (!channel.SetGain(1f)) return;
if (!channel.SetAttack(0.02f)) return;
if (!channel.SetRelease(0.1f)) return;
```

`FluxParticleAudioSource` uses `Average=0, Bass=1, LowMid=2, HighMid=3, Treble=4`. Its numeric values differ from the Band enum; do not reuse their integer values interchangeably.

Setters return true on success and false for invalid or otherwise rejected changes; validation is performed by the Executor. Each call applies separately. These APIs control settings, not CPU readback of GPU audio levels. Changes also appear in supported Live Inspector fields. Reacquire Handles after a configuration change. See [Runtime API](./runtime-parameters.md).

## Existing settings {#existing-data}

No migration operation is needed for this addition of channels and input-source selection.

| Added setting | When loading existing data |
| --- | --- |
| Audio Input Channels | Empty array |
| Brightness Audio Channel | Unassigned: Independent Response |
| Brightness Audio Source | Average |
| Boost, Attack / Release, and other existing settings | Saved values retained |

Existing Brightness continues using the average input and its independent response. It is not automatically converted to a channel. Change settings only when choosing a new source or channel. This applies to the standard Brightness audio-input extension, separately from [legacy Blink migration](./brightness.md#migration) or replacing a custom module.

## If nothing reacts {#troubleshooting}

- Include a consumer such as Brightness with Audio Enabled on.
- Check AudioLink installation and input supply. Playing audio alone does not guarantee valid AudioLink input.
- Check Enabled, common Gain / Strength / Noise Floor, the selected source, channel Gain, and alive particles.
- Decay uses the channel's Release when a channel is selected, or Brightness Audio Release for an independent response. The existing Float3 response uses common Release / Slow Response.
