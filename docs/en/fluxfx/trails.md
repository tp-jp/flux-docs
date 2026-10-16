# Trails

Trails record past particle positions and draw ribbons. Add **MODULES → Rendering → Add Module → Trails**.

<span id="設定項目"></span>

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| Max Trails | 4096 | Maximum particles to track, at least 1 |
| Points Per Trail | 16 | Recorded points per trail, at least 2 |
| Duration | 0.5 | History duration in seconds, strictly positive |
| Width | 0.05 | Width of the newest section, nonnegative |
| Color | White | Separate trail color and alpha |

Duration is independent of particle lifetime. Longer values show older movement. Width 0 or Color alpha 0 makes trails invisible.

<span id="最初の軌跡を表示する"></span>

## Display your first trail

1. Start with visible particles from the [quick start](./quickstart.md).
2. Set Start Speed 1 and lifetime 3 seconds; confirm movement.
3. Add Trails with Duration 0.5, Points Per Trail 16, and Width 0.05.
4. Choose a visible Color with alpha 1.
5. Restart the preview and observe ribbons behind moving particles.

A segment needs two distinct recorded positions. Trails may not appear immediately or while particles remain stationary.

<span id="長さと滑らかさ"></span>

## Length and smoothness

The recording interval is `Duration ÷ (Points Per Trail − 1)` seconds, about 0.033 seconds with defaults. Increasing Duration alone spreads points farther apart. Increase Points Per Trail if curved paths look angular, balancing it against Duration.

At most one new position is recorded per simulation update. An interval shorter than the update interval does not interpolate additional positions between updates.

Older sections become narrower and more transparent, disappearing at Duration. At constant speed, longer Duration produces longer trails; stops, acceleration, and turns change their apparent length.

<span id="記録する粒子と寿命"></span>

## Tracked particles and lifetime

The tracked count is the smaller of Particle Count and Max Trails. When Max Trails is smaller, tracked slots are distributed across particle storage. The implementation does not repeatedly choose only living particles to keep Max Trails visible.

A trail disappears when its particle dies. Duration does not keep a trail visible after death. New particles reusing a slot are distinguished so their trails do not connect to the previous particle's history.

<span id="粒子本体との見た目の違い"></span>

## Differences from particle appearance

Trails use dedicated rendering. Color and Width do not inherit Main Start Color, Start Size, Color/Size over Lifetime, Texture Sheet Animation, or Blink.

Trails use alpha blending. Particle Renderer Texture and Blend Mode do not configure trail textures or blending.

History is stored in world coordinates. Even with Local simulation, recorded points remain where they were captured when the emitter moves.

<span id="描画範囲と負荷"></span>

## Bounds and cost

Renderer Culling Bounds must cover both particles and trails. Long histories or moving emitters can extend beyond bounds and disappear at certain viewing angles.

Increasing Max Trails and Points Per Trail increases history and rendering resources. The implementation uses `Points Per Trail + 2` history/management buffers and `Points Per Trail − 1` rendering segments. Start with modest values for both settings.

Disabling the module retains its allocated configuration resources. Remove it and regenerate the configuration if trails are not needed.

<span id="表示されないとき"></span>

## When trails are missing

- Check that Trails is enabled and Width and Color alpha are positive.
- Ensure particles move and live long enough to record two points.
- Duration 0 fails generation validation.
- With a small Max Trails, some slots are not tracked. Compare using a small Particle Count and matching Max Trails.
- Include the full trail area in Culling Bounds.

Restart the preview after changes and allow history to accumulate before comparing.
