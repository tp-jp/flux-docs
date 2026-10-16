<span id="テクスチャアニメーションと点滅"></span>

# Texture animation and blinking

Texture Sheet Animation selects frames within a texture; Blink periodically changes color or alpha. Add either through **MODULES → Rendering → Add Module**.

## Texture Sheet Animation

Assign an evenly spaced grid of frames to the [Renderer](./renderer.md) Texture.

| Setting | Default | Meaning |
| --- | --- | --- |
| Tiles X | 1 | Columns, at least 1 |
| Tiles Y | 1 | Rows, at least 1 |
| Cycles | 1 | Repetitions over the particle's lifetime, nonnegative |

Frames advance from the upper left across each row. With Tiles X 4 and Tiles Y 2:

```text
0 → 1 → 2 → 3
4 → 5 → 6 → 7
```

Cycles is not frames per second. A 4-second lifetime with 8 frames and Cycles 1 displays each frame for about 0.5 seconds. Cycles 2 repeats twice over that lifetime.

Cycles 0 displays the first frame. Fractional values are supported: 0.5 covers half a cycle. Frame selection wraps periodically rather than holding the final frame.

<span id="_8コマの画像を試す"></span>

### Try an eight-frame image

1. Assign a 4-column, 2-row image to Renderer Texture.
2. Set Renderer Tiling to `(1, 1)` and Offset to `(0, 0)`.
3. Set Tiles X 4, Tiles Y 2, and Cycles 1.
4. Set lifetime to 4 seconds and Restart the preview.

Renderer Tiling and Offset are applied together with frame selection. Restore these values first if only part of the image appears. The default 1×1 grid does not animate.

## Blink

Multiplies rendered color components by a value between Minimum and 1.

| Setting | Default | Meaning |
| --- | --- | --- |
| Frequency | 2 | Cycles per second, nonnegative |
| Duty | 0.5 | Bright fraction of a cycle, 0–1 |
| Minimum | 0 | Multiplier during the dark interval, 0–1 |
| Smoothness | 0 | Softness of transitions, 0–1 |
| Random Phase | 0 | Per-particle timing variation, 0–1 |
| Time Mode | SystemTime | Time source |
| Target | Alpha | Components to multiply |

Frequency 2, Duty 0.5, and Smoothness 0 alternate bright and dark about every 0.25 seconds. Minimum 0.2 retains 20% during the dark interval. Increase Smoothness for gentler transitions.

<span id="時間とタイミング"></span>

### Time and timing

| Time Mode | Behavior |
| --- | --- |
| SystemTime | Uses elapsed simulation time; Random Phase 0 aligns particles in the same system |
| ParticleAge | Uses time since each particle's birth; emission times offset cycles |

SystemTime is neither wall-clock time nor shared network time. Random Phase offsets cycles using a value determined for each spawned particle.

<span id="targetとブレンド"></span>

### Target and blending

| Target | Affected components |
| --- | --- |
| Rgb | Darkens RGB only |
| Alpha | Reduces alpha only |
| Both | Reduces RGB and alpha |

For blinking through transparency, try Renderer Blend Mode Alpha and Target Alpha. Rgb makes colors approach black, so black particles may remain with Alpha blending. Opaque does not use alpha for transparency.

Both multiplies RGB and alpha. Blends such as Additive also use alpha during rendering, so this can darken more than Rgb alone. Blink further multiplies any [color over lifetime](./lifetime-appearance.md).

<span id="変化しない場合"></span>

### When nothing changes

- Frequency 0 disables blink attenuation.
- Duty 1 always uses multiplier 1.
- Minimum 1 removes the bright/dark difference.
- Positive Frequency with Duty 0 always uses Minimum.

Compare with Frequency 2, Duty 0.5, Minimum 0, Smoothness 0, and Random Phase 0. Blink affects particles, not [Trails](./trails.md).
