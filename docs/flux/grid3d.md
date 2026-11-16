# 3Dグリッドとアトラス

`FluxGrid3D`はXYZのセルと、Zスライスを並べる2Dアトラスの対応を管理します。値の意味やワールド座標からの変換は利用側で決めます。Grid自身はBufferを所有せず、確保・初期化・解放もしません。

## InspectorとBufferの設定 {#setup}

| 項目 | 設定 |
| --- | --- |
| Size X / Y / Z | 各軸のセル数。各1以上 |
| Slice Columns | Zスライスを横に並べる数。0なら`ceil(sqrt(Size Z))`。明示する場合は1〜Size Z |

`AtlasColumns`を列数、`AtlasRows = ceil(Size Z / AtlasColumns)`を行数として、幅は`Size X × AtlasColumns`、高さは`Size Y × AtlasRows`です。

使用する[FluxBuffer](./buffers.md)は **Size Mode = Explicit** にし、Width / Heightを`AtlasWidth` / `AtlasHeight`へ、Initial Countを`AtlasCapacity`へ合わせます。実行時も**Count = AtlasCapacity**が必要です。`CellCount`をCountへ設定する契約ではありません。

例えばSize = `(4, 3, 5)`、Slice Columns = 2なら、2列×3行、8×9ピクセルのアトラスです。CellCountは60、AtlasCapacityは72です。最後の行の右タイルは未使用で、12ピクセルの余白があります。余白は有効な3Dセルではありません。

## 座標の対応とAPI {#coordinates}

整数のセル座標はセル中心を表します。セル`(x, y, z)`は次の位置へ対応します。

```text
pixelX = (z % AtlasColumns) * Size X + x
pixelY = (z / AtlasColumns) * Size Y + y  （整数除算）
atlasIndex = pixelY * AtlasWidth + pixelX
uv = ((pixelX + 0.5) / AtlasWidth, (pixelY + 0.5) / AtlasHeight)
```

| API | 結果・契約 |
| --- | --- |
| `Size` | 設定されたXYZセル数（Vector3Int） |
| `CellCount` | XYZの積。未使用タイルを含めない |
| `AtlasColumns` / `AtlasRows` / `AtlasWidth` / `AtlasHeight` / `AtlasCapacity` | アトラスの寸法と容量。配置不正時は0 |
| `GridSize` / `AtlasLayout` | Shader用Vector4。`(X,Y,Z,0)`と`(列,行,幅,高さ)`。配置不正時はゼロ |
| `ValidateLayout()` | 寸法・列数・積を検証。Textureを確保しない |
| `GetPixel(x, y, z)` | セル→整数ピクセル。無効なら`(-1,-1)` |
| `GetCell(pixelX, pixelY)` | ピクセル→セル。範囲外や未使用タイルなら`(-1,-1,-1)` |
| `GetAtlasIndex(x, y, z)` | アトラスの行優先インデックス。無効なら−1。3Dの連続インデックスではない |
| `GetUV(x, y, z)` | ピクセル中心のUV。無効なら`(-1,-1)` |

`CellCount`も配置不正時は0です。各セル寸法とアトラス幅・高さは、floatで整数を正確に表せる16,777,216以下に制限されます。セル数・容量はInt32の範囲内が必要です。これらは配置の検証であり、GPUがその寸法のTextureを確保できることは保証しません。

## Kernelへ渡す {#binding}

`TryBind(kernel, buffer)`は準備済みKernelへ`_FluxGridTexture`、`_FluxGridSize`、`_FluxGridLayout`を設定します。`TryBind(kernel, buffer, "_Volume")`なら`_VolumeTexture`・`_VolumeSize`・`_VolumeLayout`です。Shader側に対応する宣言が必要です。

配置・参照・prefix・Bufferの寸法とCountが契約に合わない場合はfalseを返し、Kernelの設定を変更しません。Materialの準備状態を検証するAPIではありません。Bufferへのアクセスによる遅延確保は起こり得ますが、内容の初期化・Count変更・Dispatchは行いません。KernelのMaterialは[SceneFlowで準備](./installation.md#preparation-by-sceneflow)しておきます。追加入力と出力のTexture重複は利用側で避けてください。

## HLSLで読む {#hlsl}

`Packages/com.tplab.flux/Runtime/Shaders/FluxGrid3D.hlsl`をincludeします。整数座標の`Texture2D.Load`に対応するShader target 3.5以上が必要です。グローバル変数やSamplerはinclude側で宣言されません。

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

| 関数 | 用途 |
| --- | --- |
| `FluxGrid3DMakeLayout(gridSize, atlasLayout)` | 転送したVectorから配置情報を作る |
| `FluxGrid3DIsCellValid(grid, cell)` | セル範囲を判定 |
| `FluxGrid3DCellToPixel(grid, cell)` / `FluxGrid3DCellToUV(grid, cell)` | 有効なセルを変換。呼び出し前に範囲を検証 |
| `FluxGrid3DPixelToCell(grid, pixel)` | 逆変換。範囲外・余白は`(-1,-1,-1)` |
| `FluxGrid3DNormalizedToCell(grid, position)` | ボリュームの端を0〜1とする座標を`position * size - 0.5`へ変換 |
| `FluxGrid3DReadZero(texture, grid, cell)` | 1セルをLoad。境界外は0 |
| `FluxGrid3DSampleLinearZero(texture, grid, position)` | 周囲8セルを補間。境界外の寄与は0で、残りの重みを再正規化しない |
| `FluxGrid3DSampleLinearClamp(texture, grid, position)` | 座標をセル中心の範囲へClampしてから補間 |

補間関数はNaN・Infinityの座標では0を返します。値は符号付きfloat4のままで、Clampは値ではなく座標に対する処理です。各セルをLoadして補間するため、BufferのPoint／Bilinear設定には依存しません。2DテクスチャのBilinearをそのまま使うと、隣のZスライスのタイルをまたいで読む場合があります。

グリッドへの書き込みは[Scatter](./scatter.md)、近傍の平滑化は[Grid Filter](./grid-filter.md)、一連の処理は[グリッド計算の例](./grid-workflow.md)を参照してください。
