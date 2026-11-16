# Combining grid operations

Try initialization → one clear → chunked accumulation → X/Y/Z filtering → Buffer swaps with a small input. This example demonstrates computation order without assigning particle or density semantics.

## Scene setup {#setup}

Add the following components and configure their Inspectors. Assign every reference on the example script as well.

| Component | Settings |
| --- | --- |
| FluxGrid3D | Size X = 4, Y = 3, Z = 5, Slice Columns = 2 |
| Buffers A and B | Separate FluxBuffers; Size Mode = Explicit, Width = 8, Height = 9, Initial Count = 72, Filter Mode = Point |
| positions and values | Two more FluxBuffers, separate from A and B; Automatic, Initial Count = 4, Point |
| Upload Kernel and FluxUpload | Shader = `Flux/Upload`; assign it to Upload Kernel |
| scatterKernel and FluxScatter | Shader = `Flux/Scatter`; assign the Scatter Grid and Kernel |
| Filter Kernel and FluxGridFilter | Shader = `Flux/GridFilter`; assign the Filter Grid and Kernel |
| FluxPingPong | Assign Buffers A and B |

Run with normal Scene Reload so SceneFlow / FluxBuildPass prepares Materials before the script executes. Use D3D11 because this example includes standard Scatter. Newly allocated Buffer contents are undefined.

## Minimal example {#example}

Create the UdonSharp script as `FluxGridExample.cs`. It accumulates four inputs in chunks of two to demonstrate splitting. For larger inputs, follow the [per-dispatch limit and total range](./scatter.md#accumulate).

```csharp
using TpLab.Flux.Udon;
using UdonSharp;
using UnityEngine;

/// <summary>
/// Accumulates sample data into a grid and filters all three axes.
/// </summary>
[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxGridExample : UdonSharpBehaviour
{
    [SerializeField]
    FluxGrid3D grid;

    [SerializeField]
    FluxBuffer positions;

    [SerializeField]
    FluxBuffer values;

    [SerializeField]
    FluxUpload upload;

    [SerializeField]
    FluxKernel scatterKernel;

    [SerializeField]
    FluxScatter scatter;

    [SerializeField]
    FluxGridFilter filter;

    [SerializeField]
    FluxPingPong buffers;

    void Start()
    {
        if (!grid.ValidateLayout()) return;
        if (positions.Count != 4 || values.Count != 4) return;
        var first = buffers.Current;
        var second = buffers.Next;
        if (!buffers.TrySetBuffers(first, second)) return;
        if (first.Texture == null || second.Texture == null) return;
        if (first.Texture.width != grid.AtlasWidth || first.Texture.height != grid.AtlasHeight ||
            second.Texture.width != grid.AtlasWidth || second.Texture.height != grid.AtlasHeight) return;
        first.SetCount(grid.AtlasCapacity);
        second.SetCount(grid.AtlasCapacity);

        var points = new Vector4[4];
        points[0] = new Vector4(1f, 1f, 1f, 1f);
        points[1] = new Vector4(1.5f, 1f, 1f, 1f);
        points[2] = new Vector4(2f, 1f, 2f, 1f);
        points[3] = new Vector4(1f, 1f, 3f, 1f);
        var data = new Vector4[4];
        data[0] = new Vector4(1f, 0f, 0f, 1f);
        data[1] = new Vector4(-0.5f, 1f, 0f, 1f);
        data[2] = new Vector4(0f, 0f, 1f, 1f);
        data[3] = new Vector4(0f, 1f, 0f, 1f);
        upload.Upload(points, positions);
        upload.Upload(data, values);
        scatterKernel.SetBuffer("_FluxScatterPositions", positions);
        scatterKernel.SetBuffer("_FluxScatterValues", values);

        if (!scatter.TryClear(buffers.Current, 0)) return;
        for (var start = 0; start < data.Length; start += 2)
        {
            var count = Mathf.Min(2, data.Length - start);
            if (!scatter.TryAccumulate(buffers.Current, start, count, 1)) return;
        }

        var weights = new Vector4(0.5f, 0.25f, 0f, 0f);
        for (var axis = 0; axis < 3; axis++)
        {
            if (!filter.TryFilter(buffers.Current, buffers.Next, (FluxGridAxis)axis,
                FluxGridBoundaryMode.Zero, weights, 0)) return;
            if (!buffers.TrySwap()) return;
        }

        Debug.Log("Grid result: " + buffers.Current.name);
    }
}
```

## Which Buffer holds the result? {#result}

1. Upload positions and values to initialize inputs. Accessing Count allocates the Texture if needed.
2. Clear only Current, initially A.
3. Accumulate both chunks into A without clearing between them.
4. Filter X from A to B, Y from B to A, and Z from A to B. Call TrySwap after issuing each axis write.
5. The result is in `buffers.Current`, now B. Pass it to another Kernel or use [asynchronous readback](./readback.md).

B does not need an initial clear because the first Filter overwrites it completely. On readback, Count is 72 but only 60 pixels represent 3D cells. Access cells through `grid.GetAtlasIndex(x, y, z)` and do not treat unused tiles as cells.

To begin another aggregation, clear that iteration's Current before accumulating. Update frequency, deltaTime, iteration count, coordinate conversion, and compensation are not specified by this example. A true Try result or a reference swap does not confirm GPU completion. Validate output, appearance, and performance in your application.
