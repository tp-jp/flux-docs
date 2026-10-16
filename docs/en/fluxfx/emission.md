# Emission

Emission controls when particles are requested and how many. Use Rate over Time for continuous emission and Bursts for groups at specific times.

## Rate over Time

Rate over Time is the requested particles per second. A value of 8 requests eight per second; 0 disables continuous emission but does not disable configured bursts.

Counts are calculated from elapsed time, with fractional amounts carried into later updates. Each frame need not spawn the same number.

## Bursts

Add rows to Bursts and specify:

| Field | Meaning |
| --- | --- |
| Time | Seconds from the start of the emission cycle; at least 0 |
| Count | Requested particles at that time; at least 1 |

Multiple rows create multiple bursts. Settings are sorted by Time during generation, but keeping the list ordered makes authoring easier.

Bursts later than Duration do not execute in that cycle. Use Time 0 for the beginning of a cycle.

<span id="周期と開始遅延"></span>

## Cycles and start delay

Combine bursts with Main's Start Delay, Duration, and Loop.

For Start Delay 1, Duration 2, Loop on, and a Time 0 burst, the first cycle begins after one second and repeats every two seconds. Start Delay does not repeat. Time 0 bursts are processed in an update after the cycle begins.

Loop off runs one emission cycle. Existing particle lifetimes are independent; they do not all end when Duration expires.

<span id="発生パターンの例"></span>

## Example patterns

| Effect | Rate over Time | Bursts | Main |
| --- | --- | --- | --- |
| Continuous drifting particles | 8 | None | Loop on, lifetime around 3 seconds |
| One-shot burst | 0 | Time 0, Count 32 | Loop off, Duration around 1 second |
| Repeating pulse | 0 | Time 0, Count 16 | Loop on, Duration 2 seconds |
| Continuous stream with accents | 4 | Time 0, Count 16 | Loop on, Duration 3 seconds |

When testing bursts alone, set Rate over Time to 0 to eliminate unintended continuous emission.

<span id="容量との関係"></span>

## Capacity interaction

Rate and bursts request particles; they do not increase Particle Count. Allocate enough slots for the simultaneous population when using large bursts or long lifetimes.

The Emitter caps requests processed in one update at capacity. The GPU then allocates only free slots, so occupied slots reduce actual spawning further. Excess requests are not carried forward. Check both alive count and appearance in the preview.

<span id="編集と実行時の変更"></span>

## Editing and runtime changes

After editing Inspector settings, restart the preview to compare from the beginning. Runtime Rate changes and Delay/Duration/Loop/Burst changes have different application times; the latter apply on the next Restart. Preview regeneration is separate from runtime parameter updates.
