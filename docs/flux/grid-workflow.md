# グリッド計算を組み合わせる

初期化→一度クリア→分割加算→X・Y・Zの平滑化→Buffer交換を、小さな入力で試します。これは計算手順の例で、粒子や密度の意味は設定していません。

## シーンの構成 {#setup}

各コンポーネントを配置し、次のようにInspectorで設定します。スクリプトの参照もすべて割り当ててください。

| コンポーネント | 設定 |
| --- | --- |
| FluxGrid3D | Size X = 4、Y = 3、Z = 5、Slice Columns = 2 |
| Buffer A・B | 別々のFluxBuffer。Size Mode = Explicit、Width = 8、Height = 9、Initial Count = 72、Filter Mode = Point |
| positions・values | A・Bとも異なる2つのFluxBuffer。Automatic、Initial Count = 4、Point |
| Upload用KernelとFluxUpload | Shader = `Flux/Upload`、Upload Kernelへ割り当て |
| scatterKernelとFluxScatter | Shader = `Flux/Scatter`。ScatterのGridとKernelへ割り当て |
| Filter用KernelとFluxGridFilter | Shader = `Flux/GridFilter`。FilterのGridとKernelへ割り当て |
| FluxPingPong | Buffer A・Bを割り当て |

通常のシーンリロードを伴うPlayで、SceneFlow／FluxBuildPassによるMaterial準備後に実行します。標準Scatterを含むためD3D11環境を使います。Bufferの作成直後の内容は未定義です。

## 最小例 {#example}

`FluxGridExample.cs`としてUdonSharpスクリプトを作成します。分割の動きを示すため、4入力を2件ずつ加算します。実際の大きい入力では[1回の上限と総範囲](./scatter.md#accumulate)を守って分割します。

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

## 結果があるBuffer {#result}

1. positions・valuesへUploadして入力を初期化します。Countへのアクセスは必要ならTextureを確保します。
2. Current（最初はA）だけをクリアします。
3. 2回のScatterでAへ加算します。分割の間にクリアしません。
4. XはA→B、YはB→A、ZはA→Bへ書き込みます。各軸の書き込み発行後にTrySwapします。
5. 最終結果は`buffers.Current`（B）です。次のKernelへ渡すか、[非同期読み戻し](./readback.md)で確認します。

Bは最初のFilterで全体が上書きされるため、事前のクリアは不要です。読み戻す場合、Countは72ですが3Dセルは60個です。`grid.GetAtlasIndex(x, y, z)`で結果のセルを参照し、未使用タイルをセルとして扱わないでください。

次回の集計を始めるなら、その回のCurrentをもう一度クリアしてから加算します。更新頻度、deltaTime、反復回数、入力の座標変換や補正はこの例に含めていません。Try系APIのtrueや参照交換はGPUの完了確認ではありません。実際の出力・見た目・性能は利用先で検証します。
