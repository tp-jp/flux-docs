<span id="状態と粒子数の取得"></span>

# Status and particle counts

Read playback state and simulation time through `FluxParticleSystem` properties. The GPU alive count is asynchronous; requesting it does not immediately return a new result.

<span id="状態を読む"></span>

## Read state

| API | Meaning |
| --- | --- |
| `IsPaused` | Paused by Pause |
| `IsEmitting` | Initialized, emission playing, not paused, and not complete; also true during Start Delay |
| `PlaybackTime` | Simulation seconds since Clear; 0 before initialization |
| `ParticleCount` | Built particle slots, corresponding to Inspector Particle Count |
| `AliveCount` | Last retrieved alive count; 0 immediately after initialization or Clear. Before initialization, or if retrieval fails, it is -1 |
| `Emitter.HasCompleted` | Non-looping emission schedule has finished |
| `Executor.IsAliveCountPending` | An asynchronous count readback is pending |

IsEmitting does not mean a particle spawned this frame. It can be true with Rate 0, during Start Delay, or with no free slots. It can be false after Stop or completion while particles remain alive.

PlaybackTime is not the emission schedule position. It advances after Stop, even when no particles remain if simulation updates continue. Pause freezes it; Clear resets it; Restart alone does not.

<span id="容量と生存数を区別する"></span>

## Capacity versus alive count

Particle Count 64 does not mean 64 particles are always alive. ParticleCount is allocated capacity; AliveCount includes living particles outside the camera or with invisible colors as well as visible ones.

AliveCount is not continuously refreshed. Call `RequestAliveCount()`.

| Result/state | Meaning |
| --- | --- |
| `RequestAliveCount()` returns true | Request started; not completed |
| `RequestAliveCount()` returns false | Could not start, for example uninitialized, pending, or too soon |
| `Executor.IsAliveCountPending` is true | Wait while displaying the previous result |
| `AliveCount` is -1 | Unknown, not zero particles |

Requests must be at least 0.2 real-time seconds apart and cannot overlap. A rejected request does not immediately invalidate the previous count.

Initialization and Clear set AliveCount to the known empty state 0. Pending results from before Clear are discarded. Request again to learn about particles spawned afterward.

<span id="生存数を定期表示する例"></span>

## Display the count periodically

Create a `FluxStatusDisplay` U# Script. Assign the Prefab root to Target and a Unity UI Text to Status Text. The example starts two frames after startup and requests a count every 0.5 seconds.

```csharp
using TpLab.Flux.FX.Udon;
using UdonSharp;
using UnityEngine;
using UnityEngine.UI;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxStatusDisplay : UdonSharpBehaviour
{
    [SerializeField]
    FluxParticleSystem target;

    [SerializeField]
    Text statusText;

    bool _ready;
    float _nextRequest;

    void Start()
    {
        SendCustomEventDelayedFrames(nameof(BeginDisplay), 2);
    }

    public void BeginDisplay()
    {
        _ready = target != null && target.Executor != null && statusText != null;
    }

    void Update()
    {
        if (!_ready) return;

        if (Time.realtimeSinceStartup >= _nextRequest)
        {
            _nextRequest = Time.realtimeSinceStartup + 0.5f;
            target.RequestAliveCount();
        }

        int alive = target.AliveCount;
        string countText = alive < 0 ? "--" : alive.ToString();
        string state = target.IsPaused ? "Paused" :
            (target.IsEmitting ? "Emitting" : "Emission stopped/completed");
        string pending = target.Executor.IsAliveCountPending ? " (pending)" : "";

        statusText.text = state + "\nAlive " + countText +
            " / Capacity " + target.ParticleCount + pending +
            "\nElapsed " + target.PlaybackTime.ToString("F1") + " s";
    }
}
```

This displays the latest available result and retries on the next interval when a request cannot start. It does not assume a value immediately after requesting is new. Reference checks in BeginDisplay do not guarantee successful FluxFX initialization; check Console errors if results remain unavailable.

<span id="完了判定に使う場合"></span>

## Detect completion

To wait until all particles have died after Stop, confirm that a request made after Stop was accepted, then wait for that request's Pending state to clear before reading AliveCount. Retry for -1. A result of 0 means the sampled state contained no living particles.

Readback is delayed. If Play or Restart resumes emission in the meantime, a zero result may arrive after new particles already exist. For reliable completion checks, keep emission stopped and let one script manage requests.

The internal Executor receives FluxReadback callbacks. Adding `_OnFluxReadbackComplete` to a user script does not subscribe it to this API; inspect the state above instead.
