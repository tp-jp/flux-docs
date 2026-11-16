<span id="bufferとデータ構造"></span>

# Buffers and data layout

FluxBuffer stores data on the GPU. Set the required element count in the Inspector and use it as the destination for Upload or Kernel writes.

<span id="_1要素は4成分のデータ"></span>

## Four components per element

Each element corresponds to one RenderTexture pixel and stores four floating-point components. Choose their meaning for your application.

| Location | Type | Components |
| --- | --- | --- |
| CPU upload | `Vector4` | x, y, z, w |
| Shader computation | `float4` | x, y, z, w |
| CPU readback | `Color` | r, g, b, a |

For example, store a 3D position in XYZ and a weight in W. A readback Color need not represent a color: cast it with `(Vector4)data[i]`.

If four components are insufficient, use multiple Buffers with matching indices and counts, such as separate position and velocity Buffers.

<span id="bufferを配置する"></span>

## Add a Buffer

Add FluxBuffer to a GameObject and set **Initial Count**. Its default is 1. The RenderTexture is created at Start or the first use of Texture, Count, Capacity, or another operation that initializes it.

Before reading newly allocated contents, write your data with Upload or an initialization Kernel.

<span id="countとcapacity"></span>

## Count and Capacity

| Property | Meaning |
| --- | --- |
| `Count` | Number of valid elements; indices 0 through Count−1 |
| `Capacity` | Allocated element capacity: texture width × height |
| `Texture` | The Buffer's RenderTexture |

With **Size Mode = Automatic**, the texture is square with side length `ceil(sqrt(Initial Count))`. **Explicit** uses Width and Height instead. For example, 256×128 gives Capacity 32,768; Initial Count must fit within it. Capacity can exceed Count in either mode. The following examples use Automatic.

| Initial Count | Texture size | Initial `Count` | Capacity |
| --- | --- | --- | --- |
| 1 | 1×1 | 1 | 1 |
| 4 | 2×2 | 4 | 4 |
| 5 | 3×3 | 5 | 9 |
| 16 | 4×4 | 16 | 16 |
| 512 | 23×23 | 512 | 529 |

<span id="有効要素数を変える"></span>

### Change the valid count

The code and diagram below use an Automatic Buffer with Initial Count set to 5:

```csharp
buffer.SetCount(3); // Count is 3; Capacity remains 9
buffer.SetCount(8); // Fits within the allocated capacity
```

<div class="development-figure">
  <a class="diagram-light" href="../../diagrams/flux-buffer-count-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/flux-buffer-count-en-light.svg" alt="With Initial Count 5, changing Count from 5 to 3 to 8 keeps Capacity at 9. Only the valid range changes; data is not initialized" width="480" height="452" /></a>
  <a class="diagram-dark" href="../../diagrams/flux-buffer-count-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/flux-buffer-count-en-dark.svg" alt="With Initial Count 5, changing Count from 5 to 3 to 8 keeps Capacity at 9. Only the valid range changes; data is not initialized" width="480" height="452" /></a>
</div>

SetCount accepts values from 0 through Capacity. An out-of-range value logs an error and leaves Count unchanged. Increasing Count does not initialize the newly valid elements; write them before reading them.

SetCount does not resize or clear an allocated Texture. If unallocated, it first allocates from the Inspector's initial settings, not the requested count, then validates the count. Set Initial Count, Size Mode, and dimensions for the required capacity before running. Changing the Inspector value after allocation does not immediately reallocate it.

<span id="配列とテクスチャの対応"></span>

## Array-to-texture mapping

Elements advance along X, then continue on the next Y row. For width 3 and Count 5:

<div class="development-figure">
  <a class="diagram-light" href="../../diagrams/flux-buffer-layout-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/flux-buffer-layout-en-light.svg" alt="A 3 by 3 texture stores indices 0 through 8 along X, then Y. Count 5 makes indices 0 through 4 valid. Each pixel stores four components" width="480" height="564" /></a>
  <a class="diagram-dark" href="../../diagrams/flux-buffer-layout-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/flux-buffer-layout-en-dark.svg" alt="A 3 by 3 texture stores indices 0 through 8 along X, then Y. Count 5 makes indices 0 through 4 valid. Each pixel stores four components" width="480" height="564" /></a>
</div>

The index is `y * width + x`. Use the [FluxCommon.hlsl helpers](./kernels.md#indices-and-bounds) to convert indices and pixel-center UVs.

Invalid elements still occupy texture pixels. Check valid ranges in shaders, and read only up to readback.Count on the CPU.

<span id="テクスチャの設定"></span>

## Texture settings

| Setting | Value |
| --- | --- |
| Format | ARGBFloat |
| Filtering | Filter Mode selects Point (default) or Bilinear |
| Wrap mode | Clamp |
| Depth buffer | None |
| Mipmaps | None |

Use SetBuffer to pass a Buffer to a Kernel. Use Texture when another consumer, such as rendering, needs the texture itself. Keep its dimensions and settings unchanged to preserve the data layout.

## Initial settings and allocation failure {#allocation}

Size Mode defaults to Automatic and Filter Mode to Point, including existing Assets created before these fields were added. Explicit Width and Height must each be positive. Initial Count must be positive and fit within Width × Height. Capacity is checked using a long product and must fit in Int32. Unknown Size Mode or Filter Mode values are rejected.

Editor C# execution also checks the GPU's maximum Texture size and ARGBFloat support. Udon does not use those queries; it checks Create, IsCreated, and the actual dimensions and format. Allocation failure yields null Texture and zero Count and Capacity. Newly allocated contents are undefined, not guaranteed zero.

Choose Point for individual values or Bilinear when UV sampling should interpolate. Integer HLSL loads ignore filtering. For [3D grids](./grid3d.md), use the dedicated interpolation helpers that avoid crossing tile boundaries.

No API provides half precision, dynamic resizing, shared pools, or ownership management for external Textures.

<span id="解放と再利用"></span>

## Release and reuse

Release an unused Buffer with Release(). OnDestroy also releases it, but OnDisable does not. Disabling alone does not change contents or capacity.

```csharp
buffer.Release();
```

The next access to Texture, Count, or Capacity reallocates it from Size Mode, Width, Height, Filter Mode, and Initial Count. Previous contents and counts set with SetCount are not preserved. With Initial Count 5, the new Count is 5 again.

Do not release a Buffer while readback is pending. Kernel texture references assigned through SetBuffer do not automatically follow reallocation; call SetBuffer again afterwards.

<span id="次に読む"></span>

## Next steps

Use [Kernels and shaders](./kernels.md) to read Buffer data and write results to a separate Buffer.
