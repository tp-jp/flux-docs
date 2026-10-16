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

Intensity multiplies RGB and must be nonnegative. It does not directly modify Alpha.

Adjust Start Color for color, and color/texture Alpha plus Blend Mode for transparency. Increasing Intensity alone does not automatically create bloom around particles.

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
| Too dark or bright | Start Color, Intensity, and additive overlap |
| Disappears at certain angles | Culling Bounds and movement region |
| Billboard too large | Start Size |

Adjust in Scene-view preview, then verify through the runtime camera.
