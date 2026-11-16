# Grid Filterによる軸別平滑化

`FluxGridFilter`は[3Dグリッド](./grid3d.md)のX・Y・Zのうち1軸を、中心と左右3セルまでの対称な重みで平滑化します。1回の呼び出しで1軸・1Passを実行します。

## 準備とAPI {#setup}

FluxKernelのShaderに`Flux/GridFilter`を設定し、FluxGridFilterの **Grid** と **Kernel** を割り当てます。MaterialはSceneFlow／FluxBuildPassで準備します。入力と出力のBufferはアトラスと同じ寸法、Count = AtlasCapacityとし、**異なるTexture**を使用してください。入力Bufferには、Uploadや先行するKernelで有効なセルの値を書き込んでおきます。作業用Bufferは内部で確保されません。

```csharp
var weights = new Vector4(0.5f, 0.25f, 0f, 0f);
if (!filter.TryFilter(source, destination, FluxGridAxis.X,
    FluxGridBoundaryMode.Zero, weights, 0)) return;
```

`TryFilter(source, destination, axis, boundary, weights, pass)`は軸・境界条件・重み・Grid配置・MaterialとPass・入出力の寸法とCount・同一Textureの有無を検証します。標準ShaderのPass 0は出力アトラス全体を上書きし、未使用タイルには0を書きます。Count変更や別のクリア処理は行いません。trueはDispatchの発行を示し、GPU完了通知ではありません。

## 重み {#weights}

| Vector4成分 | 対応 |
| --- | --- |
| x | 中心セル |
| y | −1セルと＋1セルのそれぞれ |
| z | −2セルと＋2セルのそれぞれ |
| w | −3セルと＋3セルのそれぞれ |

各重みは有限かつ非負、総和`x + 2 * (y + z + w)`も有限である必要があります。全0も許可されます。自動正規化しないため、倍率を保つなら総和が1になる重みを指定します。

| 範囲 | 正規化済みの例 |
| --- | --- |
| 3点 | `(1/2, 1/4, 0, 0)` |
| 5点 | `(6/16, 4/16, 1/16, 0)` |
| 7点 | `(20/64, 15/64, 6/64, 1/64)` |

C#では`1f / 2f`のように浮動小数点で指定してください。符号付きfloat4の各成分へ同じ重みを使い、値のClamp、密度補正、表現固有の合成式は追加しません。

## 境界と軸の順序 {#boundary}

- `FluxGridBoundaryMode.Zero`：境界外を0として読む。残る重みを再正規化しないため、端では一定値も小さくなる場合があります。
- `FluxGridBoundaryMode.Clamp`：座標を端のセルへClampして読む。値自体はClampしません。

`FluxGridAxis.X`・`Y`・`Z`の順序や繰り返し回数は利用側が決めます。各軸の処理後に入力と出力を交換し、直前の結果を次の軸へ渡してください。[グリッド計算の例](./grid-workflow.md)では[FluxPingPong](./ping-pong.md#component)を使います。

## 自分のShaderへ組み込む {#hlsl}

`Packages/com.tplab.flux/Runtime/Shaders/FluxGridFilter.hlsl`の`FluxGridFilterAxis(inputTexture, grid, cell, axis, weights, clampBoundary)`を使えば、同じPass内で後続の計算と組み合わせられます。

```hlsl
#include "Packages/com.tplab.flux/Runtime/Shaders/FluxGridFilter.hlsl"
Texture2D<float4> _MainTex;
float4 _FluxGridSize;
float4 _FluxGridLayout;
float4 _FluxGridFilterAxis;
float4 _FluxGridFilterWeights;
float _FluxGridFilterBoundary;

float4 FilterCell(int3 cell)
{
    FluxGrid3DLayout grid = FluxGrid3DMakeLayout(_FluxGridSize, _FluxGridLayout);
    return FluxGridFilterAxis(_MainTex, grid, cell, (int3)_FluxGridFilterAxis.xyz,
        _FluxGridFilterWeights, _FluxGridFilterBoundary != 0);
}
```

これはShader内の補助関数の例です。フラグメント処理では出力ピクセルを`FluxGrid3DPixelToCell`でセルへ変換して渡します。標準Shaderはtarget 3.5、`Cull Off ZWrite Off ZTest Always Blend Off`を使います。`TryFilter`から呼ぶカスタムShaderでも同じuniform名と意味を維持してください。軸は正確に`(1,0,0)`・`(0,1,0)`・`(0,0,1)`のいずれかです。

直接HLSL関数だけを使う場合は配置・重み等を利用側で検証します。セルを整数Loadするためフィルタ設定には依存しません。追加Textureの入出力重複は自動検証されません。同一Passへの組み込みが高速化につながるかは、対象GPUで比較してください。
