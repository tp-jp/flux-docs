<span id="寿命に応じた見た目"></span>

# Appearance over lifetime

Color over Lifetime, Size over Lifetime, and Rotation over Lifetime change particle color, size, and rotation from birth to death. Add them from **MODULES → Rendering → Add Module**.

<span id="寿命の進み具合"></span>

## Lifetime progress

These modules use age divided by lifetime, from 0 at birth to 1 at the end. This is per-particle progress, not system playback time. Gradient and Curve horizontal axes also cover 0–1; with a 4-second lifetime, 0.5 means 2 seconds after birth.

## Color over Lifetime

Changes rendered color relative to Main's Start Color.

| Setting | Default | Meaning |
| --- | --- | --- |
| Mode | Linear | Linear or Gradient |
| End Color | White | Color approached at the end in Linear mode |
| Gradient | A new Unity Gradient | Color and alpha multiplied by the initial color |

**Linear** interpolates from Start Color to End Color. An orange start and red end become progressively redder.

**Gradient** multiplies Start Color by the gradient value. To display gradient colors directly, set Start Color to white with alpha 1. A black Start Color remains black regardless of the gradient's RGB.

To fade out, set gradient alpha to 1 at lifetime progress 0 and 0 at lifetime progress 1, or set Linear End Color alpha to 0. Transparency depends on [Renderer blending](./renderer.md); Opaque does not use alpha for transparency.

## Size over Lifetime

Changes size relative to Main's Start Size.

| Setting | Default | Meaning |
| --- | --- | --- |
| Mode | Linear | Linear or Curve |
| End Size | 0 | Nonnegative size approached in Linear mode |
| Curve | 1 throughout | Multiplier of the initial size |

**Linear** interpolates from Start Size to End Size. The default End Size 0 makes particles shrink over their lifetime.

**Curve** multiplies Start Size. Start Size 0.2 with Curve 2 produces a size multiplier of 0.4 for the rendering geometry, not a world-space width of 0.4. See [Main](./main.md#initial-particle-values) for the base geometry. The result is clamped to nonnegative values.

For particles that grow then shrink, try curve values 0 at lifetime progress 0, 1 at 0.2, and 0 at 1. A zero Start Size remains zero regardless of the multiplier.

## Rotation over Lifetime

Adds lifetime-dependent angles to Main's Start Rotation.

| Setting | Default | Meaning |
| --- | --- | --- |
| Mode | Linear | Linear or Curve |
| End Rotation | `(0, 0, 0)` | Additional angle on each axis, in degrees |
| Curve | Linear from 0 to 1 | Multiplier for the additional angle |

**Linear** adds End Rotation multiplied by lifetime progress. End Rotation is not an absolute final angle. Start Rotation Z 30 with End Rotation Z 90 approaches 120 degrees.

**Curve** adds End Rotation multiplied by the curve. A curve from 0 to 1 reaches the specified additional angle; a curve from 0 through 1 back to 0 returns to the initial angle. This is not angular speed per second.

::: warning Billboard uses only Z rotation
Set End Rotation X and Y to 0 for Billboard. Nonzero values fail generation validation. Mesh supports all three axes.
:::

<span id="組み合わせて試す"></span>

## Try the modules together

1. In Main, set Start Lifetime to 3 seconds, Start Color to white, and Start Size to 0.2.
2. Set Color over Lifetime to Gradient with alpha 0 at the end.
3. Set Size over Lifetime to Linear with End Size 0.
4. For Billboard, set Rotation over Lifetime to Linear with End Rotation `(0, 0, 180)`.
5. Restart the preview to observe particles rotating, shrinking, and fading.

Curves and gradients are converted to textures during generation. Check the interpolated result in the preview rather than relying on very fine curve detail. [Trails](./trails.md) have separate color and width settings.
