<span id="再生と停止"></span>

# Playback controls

Reference the `FluxParticleSystem` on the Prefab root from UdonSharp. These are runtime APIs; their behavior can differ from Scene view [preview](./inspector-preview.md) buttons.

<span id="操作用スクリプトを用意する"></span>

## Create a control script

1. Place a Prefab that displays particles at runtime using the [quick start](./quickstart.md).
2. In your project's Assets, choose **Create → U# Script** and name it `FluxPlaybackControl`.
3. Replace the generated C# file with the following code, keeping its UdonSharp Program Asset.
4. Add the script to a control GameObject and assign the Prefab root's FluxParticleSystem to Target.

```csharp
using TpLab.Flux.FX.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxPlaybackControl : UdonSharpBehaviour
{
    [SerializeField]
    FluxParticleSystem target;

    public void PlayEffect()
    {
        if (target != null)
        {
            target.Play();
        }
    }

    public void PauseEffect()
    {
        if (target != null)
        {
            target.Pause();
        }
    }

    public void StopEmission()
    {
        if (target != null)
        {
            target.Stop();
        }
    }

    public void HideEffect()
    {
        if (target == null) return;
        target.Stop();
        target.Clear();
    }

    public void RestartFromEmpty()
    {
        if (target == null) return;
        target.Clear();
        target.Restart();
    }
}
```

Calling `RestartFromEmpty` after startup clears particles and plays the emission schedule from the beginning.

<span id="各メソッドの違い"></span>

## Method differences

| Method | New emission | Existing particles | Emission schedule |
| --- | --- | --- | --- |
| `Play()` | Resumes | Resume updating | Continues |
| `Stop()` | Stops | Keep moving and aging | Stops at current position |
| `Pause()` | Pauses | Pause updating | Stops at current position |
| `Restart()` | Resumes | Update without clearing | Restarts from Start Delay |
| `Clear()` | Does not change playback state | Clears | Does not change schedule position |

Play, Stop, and Restart all cancel a pause. Calling Stop while paused stops new emission but resumes movement and aging of existing particles.

<span id="自然に消えるまで待つ"></span>

### Let particles expire naturally

Use `Stop()`. Particles keep moving until their lifetime ends. Use the [asynchronous alive count](./state-and-count.md) to check whether any remain; `IsEmitting` false does not mean the system is empty.

<span id="その場で静止させる"></span>

### Freeze particles in place

Use `Pause()` to stop emission and simulation time. It does not hide particles. Resume with `Play()`.

<span id="すぐに消す"></span>

### Hide particles immediately

Call `Stop()` followed by `Clear()`. Clear alone allows emission to produce new particles on the next update.

<span id="空の状態から再生し直す"></span>

### Restart from an empty state

Call `Clear()` followed by `Restart()`. Restart alone does not clear particles or trail history. After a non-looping schedule completes, use Restart because Play does not rewind the schedule.

<span id="時間と設定の扱い"></span>

## Time and settings

Clear removes particle state and trail history and resets `PlaybackTime` to 0. Restart rewinds the emission schedule but does not reset PlaybackTime. Emission time and simulation time are managed separately.

Neither method restores parameters changed by scripts to their Inspector values or unlocks Static parameters. See [runtime parameters](./runtime-parameters.md).

<span id="実行開始時の注意"></span>

## Startup considerations

FluxParticleSystem initializes in its own Start and applies Play On Awake. Calling Play or Restart immediately from another script's Start is sensitive to execution order. Use Play On Awake for automatic playback, and perform custom startup actions after FluxParticleSystem's Start. See the delayed-start example in [Status and particle counts](./state-and-count.md#display-the-count-periodically).

These calls act locally. FluxParticleSystem does not synchronize them over the network; design synchronization in the caller if players must share controls.
