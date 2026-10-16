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

The texture is square, with side length `ceil(sqrt(Initial Count))`. Capacity can therefore exceed Count.

| Initial Count | Texture size | Initial `Count` | Capacity |
| --- | --- | --- | --- |
| 1 | 1×1 | 1 | 1 |
| 4 | 2×2 | 4 | 4 |
| 5 | 3×3 | 5 | 9 |
| 16 | 4×4 | 16 | 16 |
| 512 | 23×23 | 512 | 529 |

<span id="有効要素数を変える"></span>

### Change the valid count

For a Buffer with Initial Count set to 5:

```csharp
buffer.SetCount(3); // Count is 3; Capacity remains 9
buffer.SetCount(8); // Fits within the allocated capacity
```

SetCount accepts values from 0 through Capacity. An out-of-range value logs an error and leaves Count unchanged. Increasing Count does not initialize the newly valid elements; write them before reading them.

SetCount does not resize the texture. Set Initial Count for the largest capacity you need before running. Changing the Inspector value after allocation does not immediately reallocate it.

<span id="配列とテクスチャの対応"></span>

## Array-to-texture mapping

Elements advance along X, then continue on the next Y row. For width 3 and Count 5:

```text
         x=0     x=1     x=2
y=0       0       1       2
y=1       3       4     invalid
y=2     invalid invalid invalid
```

The index is `y * width + x`. Use the [FluxCommon.hlsl helpers](./kernels.md#indices-and-bounds) to convert indices and pixel-center UVs.

Invalid elements still occupy texture pixels. Check valid ranges in shaders, and read only up to readback.Count on the CPU.

<span id="テクスチャの設定"></span>

## Texture settings

| Setting | Value |
| --- | --- |
| Format | ARGBFloat |
| Filtering | Point |
| Wrap mode | Clamp |
| Depth buffer | None |
| Mipmaps | None |

Use SetBuffer to pass a Buffer to a Kernel. Use Texture when another consumer, such as rendering, needs the texture itself. Keep its dimensions and settings unchanged to preserve the data layout.

<span id="解放と再利用"></span>

## Release and reuse

Release an unused Buffer with Release(). It is also released when its GameObject is destroyed.

```csharp
buffer.Release();
```

The next access to Texture, Count, or Capacity reallocates it using Initial Count. Previous contents and counts set with SetCount are not preserved. With Initial Count 5, the new Count is 5 again.

Do not release a Buffer while readback is pending. Kernel texture references assigned through SetBuffer do not automatically follow reallocation; call SetBuffer again afterwards.

<span id="次に読む"></span>

## Next steps

Use [Kernels and shaders](./kernels.md) to read Buffer data and write results to a separate Buffer.
