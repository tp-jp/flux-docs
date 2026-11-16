# Scatterによるグリッドへの加算

`FluxScatter`はセル座標・符号付きfloat4値・有効フラグを受け取り、周囲8セルへ補間重み付きで加算します。入力の意味、選別、座標変換、密度の単位や解像度補正は利用側の責務です。[Reduction](./reduction.md)のように全入力を1要素へ縮約する処理ではありません。

## 準備と対応環境 {#setup}

1. [FluxGrid3D](./grid3d.md)と、アトラス寸法・Countが一致する出力Bufferを用意します。
2. FluxKernelのShaderに`Flux/Scatter`を設定します。
3. FluxScatterの **Grid** と **Kernel** に、それぞれを割り当てます。
4. 通常のSceneFlow／FluxBuildPassでMaterialを準備します。

標準Shaderは**D3D11・Shader Model 5のテッセレーションとGeometry Shader**を使います。これは標準Scatter方式の制約で、Flux全体の必須要件ではありません。UdonではShaderの対応状況を検出できないため、利用環境を限定して確認してください。

## 標準Shaderの入力形式 {#input}

| Shaderプロパティ | データ |
| --- | --- |
| `_FluxScatterPositions` | XYZはセル座標。W > 0なら有効 |
| `_FluxScatterValues` | 加算する符号付きfloat4 |

両TextureはX方向から順に並ぶ配列としてLoadします。幅・高さは異なっていても構いません。フィルタ設定は読み取りに影響しません。どちらかのTexture容量を超えたインデックスは無効になりますが、BufferのCountはShaderに渡されません。**両入力の有効件数に収まる範囲**を指定してください。入力Textureと出力Textureは分離します。

## クリアと分割加算 {#accumulate}

| API | 契約 |
| --- | --- |
| `TryClear(destination, pass)` | クリアPassを1回実行。標準ShaderはPass 0 |
| `TryAccumulate(destination, inputStart, inputCount, pass)` | 範囲を1回で加算。標準ShaderはPass 1 |
| `MaxInputCountPerDispatch` | 131,072件。自動分割はしない |

最初に一度クリアし、その後は同じ出力へ各範囲を加算します。途中でクリアすると、それまでの加算結果を失います。次の例は位置と値が1対1に対応する入力で、Countの一致と上限、入出力の分離をクリア前に確認します。参照・入力データ・Materialを準備し、scatterKernelにはFluxScatterのKernelと同じものを割り当ててください。

```csharp
var total = positions.Count;
if (total != values.Count || total > 16777216)
{
    Debug.LogError("Input counts must match and be at most 16777216.");
    return;
}
var positionTexture = positions.Texture;
var valueTexture = values.Texture;
var outputTexture = destination.Texture;
if (positionTexture == null || valueTexture == null || outputTexture == null) return;
if (positionTexture == outputTexture || valueTexture == outputTexture)
{
    Debug.LogError("Scatter inputs must not use the output Texture.");
    return;
}

scatterKernel.SetTexture("_FluxScatterPositions", positionTexture);
scatterKernel.SetTexture("_FluxScatterValues", valueTexture);
if (!scatter.TryClear(destination, 0)) return;
for (var start = 0; start < total;)
{
    var count = Mathf.Min(FluxScatter.MaxInputCountPerDispatch, total - start);
    if (!scatter.TryAccumulate(destination, start, count, 1)) return;
    start += count;
}
```

`inputStart >= 0`、`0 <= inputCount <= 131072`、`inputStart + inputCount <= 16777216`が必要です。不正な範囲はエラーを記録してfalseを返します。有効な0件はtrueとなり、出力やPassの検証・Texture確保・描画も行いません。正の件数ではGrid配置・Pass・出力寸法とCountを検証します。GridとKernelのInspector参照は必須です。

加算は自動クリアも出力Countの変更もしません。正の件数で返るtrueは要求の検証と発行を表し、GPU完了や計算結果の正しさを保証しません。加算順による浮動小数点の丸め誤差があります。

## 境界と値 {#boundary}

整数座標をセル中心とし、床関数で求めたセルと各軸の次のセルへ重みを分配します。例えば`(1.5, 1.5, 1.5)`なら8セルへそれぞれ1/8ずつ加算します。

境界外の加算先は破棄し、残る重みを再正規化しません。NaN・Infinityの座標も無視します。値は有限なfloat4を入力してください。負の値を保持し、色補正・平均化・値のClampは行いません。平均や密度へ変換する式が必要なら、利用側の別処理で定義します。

## 既存GPUデータを直接読む {#custom-reader}

`FluxScatter.hlsl`は入力Textureの形式を固定していません。標準Shaderを基に、includeの後へ`FluxScatterInput FluxScatterRead(uint index)`を実装して、既存のGPUデータから`cellPosition`・`value`・`valid`を返せます。共通形式へ詰め直すPassは必須ではありません。

```hlsl
#include "Packages/com.tplab.flux/Runtime/Shaders/FluxScatter.hlsl"
Texture2D<float4> _ExistingData;

FluxScatterInput FluxScatterRead(uint index)
{
    FluxScatterInput result = (FluxScatterInput)0;
    uint width, height;
    _ExistingData.GetDimensions(width, height);
    if (index >= width * height) return result;
    float4 item = _ExistingData.Load(int3(index % width, index / width, 0));
    result.cellPosition = item.xyz;
    result.value = float4(item.w, 0, 0, 0);
    result.valid = true;
    return result;
}
```

これはXYZをセル座標、Wを加算値として扱う**説明用の例**です。実際の単位・選別条件は利用側に合わせます。出力アトラスは読まないでください。

加算Passには`#pragma target 5.0`と標準Shader同様のD3D11指定を使い、vertex / hull / domain / geometry / fragmentをそれぞれ`FluxScatterVertex` / `FluxScatterHull` / `FluxScatterDomain` / `FluxScatterGeometry` / `FluxScatterFragment`にします。描画設定は`Cull Off ZWrite Off ZTest Always Blend One One`です。クリアPassは別に用意し、`Blend Off`で全ピクセルへ0を書き込みます。

`_FluxGridSize`・`_FluxGridLayout`・`_FluxScatterRange`はTryAccumulateが設定します。独自Textureやパラメーターは利用側でバインドします。続く平滑化とBuffer交換は[グリッド計算の例](./grid-workflow.md)を参照してください。
