# 3D grids and atlases

`FluxGrid3D` maps XYZ cells to a 2D atlas of Z slices. The caller defines data meaning and world-to-cell transformations. The Grid does not own, allocate, initialize, or release Buffers.

## Inspector and Buffer setup {#setup}

| Field | Setting |
| --- | --- |
| Size X / Y / Z | Cell count on each axis; at least 1 |
| Slice Columns | Number of Z slices per row. 0 selects `ceil(sqrt(Size Z))`; explicit values must be 1 through Size Z |

`AtlasRows = ceil(Size Z / AtlasColumns)`. Atlas width is `Size X × AtlasColumns`, and height is `Size Y × AtlasRows`.

Set the [FluxBuffer](./buffers.md) to **Size Mode = Explicit**, Width / Height to `AtlasWidth` / `AtlasHeight`, and Initial Count to `AtlasCapacity`. At runtime, **Count must equal AtlasCapacity**, not `CellCount`.

For Size `(4, 3, 5)` and Slice Columns 2, the atlas has 2 columns and 3 rows of tiles, occupying 8×9 pixels. CellCount is 60, while AtlasCapacity is 72. The right tile in the last row is unused, leaving 12 padding pixels. Padding is not a valid 3D cell.

## Coordinate mapping and API {#coordinates}

Integer cell coordinates represent cell centers. A cell `(x, y, z)` maps as follows:

```text
pixelX = (z % AtlasColumns) * Size X + x
pixelY = (z / AtlasColumns) * Size Y + y  (integer division)
atlasIndex = pixelY * AtlasWidth + pixelX
uv = ((pixelX + 0.5) / AtlasWidth, (pixelY + 0.5) / AtlasHeight)
```

| API | Result or contract |
| --- | --- |
| `Size` | Configured XYZ cell counts (Vector3Int) |
| `CellCount` | Product of XYZ; excludes unused tiles |
| `AtlasColumns` / `AtlasRows` / `AtlasWidth` / `AtlasHeight` / `AtlasCapacity` | Atlas dimensions and capacity; 0 for invalid layouts |
| `GridSize` / `AtlasLayout` | Shader Vector4 values: `(X,Y,Z,0)` and `(columns,rows,width,height)`; zero for invalid layouts |
| `ValidateLayout()` | Validates dimensions, columns, and products without allocating a Texture |
| `GetPixel(x, y, z)` | Cell to integer pixel; `(-1,-1)` if invalid |
| `GetCell(pixelX, pixelY)` | Pixel to cell; `(-1,-1,-1)` outside the atlas or in padding |
| `GetAtlasIndex(x, y, z)` | Row-major atlas index; −1 if invalid. This is not a contiguous 3D index |
| `GetUV(x, y, z)` | Texel-center UV; `(-1,-1)` if invalid |

`CellCount` also returns 0 for invalid layouts. Cell dimensions and atlas width/height are limited to 16,777,216 for exact float integer representation. Cell count and atlas capacity must fit in Int32. Layout validation does not guarantee that the GPU can allocate a Texture of that size.

## Bind to a Kernel {#binding}

`TryBind(kernel, buffer)` sets `_FluxGridTexture`, `_FluxGridSize`, and `_FluxGridLayout` on a prepared Kernel. `TryBind(kernel, buffer, "_Volume")` uses `_VolumeTexture`, `_VolumeSize`, and `_VolumeLayout`. Declare matching properties in the Shader.

Invalid layout, references, prefix, Buffer dimensions, or Count return false without changing Kernel settings. This API does not validate Material preparation. Accessing the Buffer can allocate its Texture lazily, but binding does not initialize contents, change Count, or dispatch. Prepare the Kernel Material through [SceneFlow](./installation.md#preparation-by-sceneflow). Prevent additional input Textures from overlapping the output yourself.

## Read in HLSL {#hlsl}

Include `Packages/com.tplab.flux/Runtime/Shaders/FluxGrid3D.hlsl`. Integer `Texture2D.Load` support requires shader target 3.5 or higher. The include does not declare global variables or samplers.

```hlsl
#include "Packages/com.tplab.flux/Runtime/Shaders/FluxGrid3D.hlsl"
Texture2D<float4> _FluxGridTexture;
float4 _FluxGridSize;
float4 _FluxGridLayout;

float4 ReadVolume(float3 cellPosition)
{
    FluxGrid3DLayout grid = FluxGrid3DMakeLayout(_FluxGridSize, _FluxGridLayout);
    return FluxGrid3DSampleLinearZero(_FluxGridTexture, grid, cellPosition);
}
```

| Function | Purpose |
| --- | --- |
| `FluxGrid3DMakeLayout(gridSize, atlasLayout)` | Construct a layout from bound vectors |
| `FluxGrid3DIsCellValid(grid, cell)` | Test cell bounds |
| `FluxGrid3DCellToPixel(grid, cell)` / `FluxGrid3DCellToUV(grid, cell)` | Map a valid cell; validate bounds first |
| `FluxGrid3DPixelToCell(grid, pixel)` | Inverse mapping; returns `(-1,-1,-1)` outside the atlas or in padding |
| `FluxGrid3DNormalizedToCell(grid, position)` | Convert coordinates with volume edges at 0 and 1 using `position * size - 0.5` |
| `FluxGrid3DReadZero(texture, grid, cell)` | Load one cell; zero outside bounds |
| `FluxGrid3DSampleLinearZero(texture, grid, position)` | Interpolate eight neighbors; outside contributions are zero, with no weight renormalization |
| `FluxGrid3DSampleLinearClamp(texture, grid, position)` | Clamp coordinates to the cell-center bounds, then interpolate |

Sampling functions return zero for NaN or infinite coordinates. Values remain signed float4; Clamp applies to coordinates, not values. Explicit cell loads make interpolation independent of Point / Bilinear filtering. Direct 2D bilinear sampling can cross tile edges into another Z slice.

See [Scatter](./scatter.md) for accumulation, [Grid Filter](./grid-filter.md) for smoothing, and the [grid workflow example](./grid-workflow.md) for the complete sequence.
