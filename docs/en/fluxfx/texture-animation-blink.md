<span id="テクスチャアニメーションと点滅"></span>
<span id="texture-animation-and-blinking"></span>

# Texture Sheet Animation

Texture Sheet Animation selects frames within a texture. Add it through **MODULES → Rendering → Add Module**.

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

<span id="time-and-timing"></span>
<span id="target-and-blending"></span>
<span id="when-nothing-changes"></span>
<span id="時間とタイミング"></span>
<span id="targetとブレンド"></span>
<span id="変化しない場合"></span>

<span id="blink"></span>

## Brightness replaces Blink

For brightness variation, smooth modulation, and blinking, see [Brightness](./brightness.md). Legacy settings require [migration](./brightness.md#migration).
