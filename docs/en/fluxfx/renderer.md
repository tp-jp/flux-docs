# Renderer

Renderer sets the particle shape, texture, and blending. Set initial color, size, and rotation in [Main](./main.md).

<span id="billboardとmesh"></span>

## Billboard and Mesh

| Mode | Requirements and appearance |
| --- | --- |
| Billboard | Camera-facing quads; no source Mesh required |
| Mesh | A source Mesh is required for each particle's shape |

The Mesh must be readable, contain vertices and triangles, and use Triangles topology for every submesh. Check read access on imported meshes.

Complex meshes increase vertices and indices per particle, affecting capacity and performance. Reconsider Particle Count when switching from Billboard to Mesh.

Billboard initial rotation supports Z only; Mesh supports XYZ. Check for unsupported remaining values after switching modes.

<span id="テクスチャを設定する"></span>

## Set a texture

| Setting | Meaning |
| --- | --- |
| Texture | Particle Texture2D |
| Tiling | UV scale |
| Offset | UV offset |

Start with Tiling `(1, 1)` and Offset `(0, 0)`. For round transparent particles, use a texture with transparent outer regions and test Alpha or Additive blending.

Use Texture Sheet Animation to select frames from a texture atlas.

## Blend Mode

| Mode | Composition | Depth writes |
| --- | --- | --- |
| Opaque | No transparent blending | On |
| Alpha | Blend with the background using input Alpha | Off |
| Additive | Add input RGB multiplied by Alpha to the background | Off |

Lowering Alpha in Opaque mode does not create Alpha-style transparency. Change Blend Mode when transparency is required.

Additive makes overlaps brighter. Compare Alpha for surfaces such as smoke and Additive for overlapping light effects.

## Intensity

**Intensity** controls the RGB multiplier and must be nonnegative. Use **Intensity Mask** to control where it applies. Neither setting directly changes Alpha.

Adjust Start Color for color, and color/texture Alpha plus Blend Mode for transparency. Increasing Intensity alone does not automatically create bloom around particles.

### Intensity Mask {#intensity-mask}

Assign a Texture2D to **Intensity Mask** in Renderer to apply Intensity only to parts of the particle image. For example, a white center with black surroundings lets you brighten only the center.

| Mask red channel | Effect on RGB |
| --- | --- |
| White (1) | Multiply by Intensity |
| Black (0) | Multiply by 1; preserve brightness before Intensity |
| Intermediate value | Interpolate between a multiplier of 1 and Intensity |
| Unassigned | Use a white mask, applying Intensity everywhere |

The shader uses the sampled **red channel**, clamped to 0–1, and ignores the mask's Alpha. The RGB multiplier is `1 + (Intensity - 1) × mask`. For example, Intensity 3 and mask 0.5 produce a multiplier of 2. At Intensity 1, the mask makes no difference. Below 1, white areas become darker. Black areas are not made transparent.

1. Assign a mask with white areas where you want Intensity to apply.
2. Set Intensity above 1 and compare white and black areas in the preview.
3. Check alignment between Texture and the mask, then verify in Play Mode.

The mask uses **the same UVs as Texture**. Tiling, Offset, and [Texture Sheet Animation](./texture-animation-blink.md) affect both textures; there are no separate mask Tiling or Offset settings. For an atlas, use the same frame layout in the mask. Both Billboard and Mesh modes support it.

<span id="描画範囲を設定する"></span>

## Set rendering bounds

Culling Bounds controls visibility testing. Set Center and Size to cover the particle movement region; every Size component must be positive.

Bounds are local to the Renderer, even with World simulation. If the emitter moves, account for the area where existing particles remain.

Bounds that are too small can make the entire effect disappear even while particles should be visible. Start with the Prefab's bounds, then fit them to the effect. Bounds do not contain particles or create collisions.

<span id="見え方がおかしいとき"></span>

## Unexpected appearance

| Symptom | Check |
| --- | --- |
| Mesh mode fails generation | Mesh reference, readability, vertices, and triangles |
| Transparency is wrong | Blend Mode and texture/Start Color Alpha |
| Too dark or bright | Start Color, Intensity, the mask red channel, and additive overlap |
| Mask has no effect or is misaligned | Intensity differs from 1; mask red channel; shared UVs and atlas layout |
| Disappears at certain angles | Culling Bounds and movement region |
| Billboard too large | Start Size |

Adjust in Scene-view preview, then verify through the runtime camera.
