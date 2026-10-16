<span id="kernels-and-shaders"></span>

# Kernelとシェーダー

`FluxKernel`は、シェーダーを使ってBufferへ計算結果を書き込むコンポーネントです。UdonSharpからパラメーターを設定し、`Dispatch`で実行します。

<span id="prepare-a-kernel"></span>

## Kernelを準備する

1. GameObjectに`FluxKernel`を追加します。
2. Inspectorの **Shader** に、計算用のShaderアセットを割り当てます。
3. 入力と出力に使う`FluxBuffer`を用意します。

Materialは[導入時に設定したSceneFlow](./installation.md#sceneflowによる準備)が生成します。パラメーターの設定やDispatchは、その準備が済んだ実行時に行ってください。

<span id="execute-with-dispatch"></span>

## Dispatchで実行する

| 呼び方 | 用途 |
| --- | --- |
| `kernel.Dispatch(destination)` | 主入力のBufferなしで値を生成する。初期値の生成やUploadなど |
| `kernel.Dispatch(source, destination)` | sourceを読み取り、destinationへ結果を書き込む |

入力付きのDispatchでは、sourceのテクスチャがシェーダーの`_MainTex`へ渡されます。内部では`VRCGraphics.Blit`が呼ばれ、フラグメントシェーダーの戻り値が出力先のピクセルに書き込まれます。

入力用と出力用には別のBufferを使ってください。入力を読みながら同じテクスチャへ書く構成は避けます。繰り返し計算では、2つのBufferの役割を交互に切り替えます。

<span id="set-the-output-count"></span>

### 出力先のCountを設定する

Dispatchは、出力先のCountやCapacityを変更しません。1要素ずつ対応させる計算なら、容量を確保したうえでCountを揃えます。以下は、各コンポーネントを参照する変数を設定済みの処理例です。

```csharp
if (destination.Capacity < source.Count)
{
    Debug.LogError("出力先の容量が足りません。");
    return;
}

destination.SetCount(source.Count);
kernel.SetFloat("_Scale", 2f);
kernel.Dispatch(source, destination);
```

Dispatch自体はnull参照、入力と出力の重複、要素数の対応を検証しません。参照と要素数は呼び出し側で揃え、シェーダー側でも有効範囲を確認します。

## 各要素を2倍にするシェーダー {#scale-shader}

作業先のAssets内に`FluxScale.shader`を作り、次の内容を保存します。各要素の4成分すべてに`_Scale`を掛ける例です。

```hlsl
Shader "Flux/Examples/Scale"
{
    Properties
    {
        _MainTex ("Input", 2D) = "black" {}
        _Scale ("Scale", Float) = 1
    }

    SubShader
    {
        Cull Off
        ZWrite Off
        ZTest Always

        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag

            #include "UnityCG.cginc"
            #include "Packages/com.tplab.flux/Runtime/Shaders/FluxCommon.hlsl"

            sampler2D_float _MainTex;
            float _Scale;

            float4 frag(v2f_img i) : SV_Target
            {
                uint index = FluxGetDestinationIndex(i.uv);
                if (!FluxIsDestinationValid(index))
                    return 0;
                if (!FluxIsSourceValid(index))
                    return 0;

                float4 value = tex2D(_MainTex, FluxGetSourceUV(index));
                return value * _Scale;
            }
            ENDHLSL
        }
    }
}
```

`Cull Off`、`ZWrite Off`、`ZTest Always`は、データを書き込むPassが面の向きや深度に左右されないようにする設定です。この例は1つのPassで処理します。FluxKernelのAPIにはPass番号を選択する引数はありません。

<span id="try-it-in-the-quick-start"></span>

### クイックスタートで試す

[クイックスタート](./quickstart.md)の転送処理に、上の計算を追加できます。

1. `Result`というGameObjectにFluxBufferを追加し、Initial Countを4にします。
2. `ScaleKernel`というGameObjectにFluxKernelを追加し、Shaderに`FluxScale.shader`を設定します。
3. `FluxQuickStart`クラスに次の2つのフィールドを追加し、Inspectorで割り当てます。

```csharp
[SerializeField]
FluxBuffer result;

[SerializeField]
FluxKernel scaleKernel;
```

`Start`内の`upload.Upload(_expected, buffer);`は残し、その直後から読み戻し要求までを次の処理に置き換えます。

```csharp
if (result == null || scaleKernel == null || result == buffer)
{
    Debug.LogError("計算用Kernelと、入力とは別の出力Bufferを設定してください。");
    return;
}
if (result.Capacity < buffer.Count)
{
    Debug.LogError("出力Bufferの容量が足りません。");
    return;
}

result.SetCount(buffer.Count);
scaleKernel.SetFloat("_Scale", 2f);
scaleKernel.Dispatch(buffer, result);

// 完了時の比較に使う期待値も2倍にする
for (var i = 0; i < _expected.Length; i++)
{
    _expected[i] = _expected[i] * 2f;
}

if (!readback.TryRequest(result, this))
{
    Debug.LogError("読み戻し要求が受け付けられませんでした。");
}
```

完了イベントの比較処理はそのまま使えます。最後の成功ログは`PASS: 4要素の2倍計算が一致しました。`に変更してください。Play Modeで実行すると、期待する値は順に`(0, 0, 0, 0)`、`(2, 4, 6, 8)`、`(4, 8, 12, 16)`、`(6, 12, 18, 24)`になります。

## インデックスと有効範囲 {#indices-and-bounds}

`FluxCommon.hlsl`は、BufferのインデックスとUVを扱う補助関数を提供します。

| 関数 | 役割 |
| --- | --- |
| `FluxGetDestinationIndex(uv)` | 出力先のUVから要素インデックスを求める |
| `FluxGetDestinationUV(index)` | 出力先の要素に対応するピクセル中心のUVを求める |
| `FluxIsDestinationValid(index)` | 出力先のCount内か判定する |
| `FluxGetSourceUV(index)` | 主入力の要素に対応するピクセル中心のUVを求める |
| `FluxIsSourceValid(index)` | 主入力のCount内か判定する |

UV変換の関数は範囲の検証を行いません。入力を読む前に有効範囲を確認してください。出力先のCount外も描画対象になるため、このシェーダーでは0を書き込みます。

Dispatch時には次の値が自動設定されます。自分のパラメーター名として上書きしないでください。

| パラメーター | 値 |
| --- | --- |
| `_FluxDestinationCount` | 出力先の有効要素数 |
| `_FluxDestinationWidth`、`_FluxDestinationHeight` | 出力先テクスチャの幅と高さ |
| `_FluxSourceCount` | 主入力の有効要素数 |
| `_FluxSourceWidth`、`_FluxSourceHeight` | 主入力テクスチャの幅と高さ |

主入力の値が更新されるのは`Dispatch(source, destination)`のときだけです。`Dispatch(destination)`では主入力の情報が設定・リセットされないため、主入力用の関数や`_MainTex`に依存しないシェーダーを使います。

<span id="pass-parameters"></span>

## パラメーターを渡す

| メソッド | 渡す値 |
| --- | --- |
| `SetFloat(name, value)` | float |
| `SetVector(name, value)` | Vector4 |
| `SetVectorArray(name, values)` | Vector4配列 |
| `SetTexture(name, texture)` | Texture |
| `SetBuffer(name, buffer)` | BufferのTexture |

`name`は`_Scale`のようなシェーダー内の名前です。Inspector向けの表示名ではありません。パラメーターは同じKernelのMaterialに保持されるので、用途を切り替えるときは必要な値を設定し直してください。

`SetVectorArray`を使う場合は、シェーダー側にも対応する配列を宣言します。配列をBufferへ転送する一般的な用途には、転送用シェーダーと要素数の検証を持つ`FluxUpload`を使えます。

<span id="use-an-additional-input-buffer"></span>

## 追加のBufferを入力にする

2つのBufferを加算する場合は、主入力をDispatchで渡し、追加の入力を`SetBuffer`で設定します。

```csharp
addKernel.SetBuffer("_InputB", bufferB);
addKernel.Dispatch(bufferA, destination);
```

加算用シェーダーでは`_InputB`のTextureプロパティと`sampler2D_float _InputB;`を宣言します。AとBの幅・高さ・Countを揃えている場合、有効範囲を確認した後の計算は次のように書けます。

```hlsl
float2 uv = FluxGetSourceUV(index);
float4 a = tex2D(_MainTex, uv);
float4 b = tex2D(_InputB, uv);
return a + b;
```

`SetBuffer`が設定するのはテクスチャだけです。BのCountやサイズは自動送信されず、`FluxGetSourceUV`はAのサイズを使います。異なるサイズを扱う場合は、Bのサイズと有効要素数を独自のパラメーターで渡し、B用のUVと範囲判定を実装してください。追加入力も出力先と別のBufferを使います。

<span id="check-the-result"></span>

## 結果を確認する

Dispatch後も結果はGPU上にあります。次のKernelへそのBufferを入力として渡すか、CPUで必要ならFluxReadbackで読み戻します。CPUから入力を用意する方法は[アップロード](./upload.md)、結果の取得方法は[非同期読み戻し](./readback.md)を参照してください。
