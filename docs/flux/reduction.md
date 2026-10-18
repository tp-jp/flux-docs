<span id="aggregation-with-reduction"></span>

# Reductionによる集約

`FluxReduction`は、Bufferの複数要素を段階的にまとめ、1要素の結果を別のBufferへ書き込みます。合計や最大値など、何を計算するかは集約用シェーダーで定義します。

<span id="reduction-stages"></span>

## 集約の流れ

1回の計算でまとめる要素数を **Reduction Factor** と呼びます。例えば4なら、各出力要素が最大4つの入力要素をまとめます。

入力が250要素、Reduction Factorが4の場合は、次のように縮小します。

<div class="development-figure">
  <a class="diagram-light" href="../diagrams/flux-reduction-ja-light.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/flux-reduction-ja-light.svg" alt="Sourceの250要素をWorkspace Aの63、Workspace Bの16、Workspace Aの4へ集約し、最後にDestinationへ1要素を書き込む" width="480" height="632" /></a>
  <a class="diagram-dark" href="../diagrams/flux-reduction-ja-dark.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/flux-reduction-ja-dark.svg" alt="Sourceの250要素をWorkspace Aの63、Workspace Bの16、Workspace Aの4へ集約し、最後にDestinationへ1要素を書き込む" width="480" height="632" /></a>
</div>

各段階の要素数は`ceil(入力のCount / Reduction Factor)`です。端数も1要素として残し、最後の段階ではDestinationのCountを1に設定します。途中のCount変更とBufferの切り替えはFluxReductionが行います。

<span id="prepare-the-components"></span>

## コンポーネントを準備する

250要素の合計を求める例では、次の構成を用意します。

| コンポーネント | 設定 |
| --- | --- |
| Source | FluxBuffer。Initial Countは250 |
| Destination | FluxBuffer。Initial Countは1 |
| Workspace A | FluxBuffer。Initial Countは63 |
| Workspace B | FluxBuffer。Initial Countは63 |
| 集約用Kernel | FluxKernel。下記の`FluxSum4.shader`を割り当てる |
| FluxReduction | Reduction Kernelに上のKernel、Reduction Factorに4、Workspace A・Bに各Bufferを割り当てる |

4つのBufferはすべて別のコンポーネントにします。作業用Bufferの初期値をUploadする必要はありません。集約の各段階で必要な領域が書き込まれます。

<span id="workspace-capacity"></span>

### 作業用Bufferの容量

両方のWorkspaceに、最低でも`ceil(Source.Count / Reduction Factor)`要素分のCapacityが必要です。250要素を4ずつまとめるなら必要容量は63です。Initial Countを63にすると8×8のテクスチャになり、Capacityは64なので条件を満たします。

2つ目のWorkspaceが最初の段階で使われない場合も、実装は両方に同じ容量条件を要求します。Source.CountがReduction Factor以下の場合でも、2つのWorkspaceの割り当てと容量確認は省略できません。

繰り返し使うときは、扱う最大のSource.Countに合わせて容量を確保してください。FluxReductionはWorkspaceのCountを変更しますが、テクスチャの容量を増やしません。

<span id="sum-four-elements-per-pass"></span>

## 4要素ずつ合計するシェーダー

作業先のAssets内に`FluxSum4.shader`を作成し、次の内容を保存します。4成分それぞれを合計するシェーダーです。

```hlsl
Shader "Flux/Examples/Sum4"
{
    Properties
    {
        _MainTex ("Source", 2D) = "black" {}
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

            float4 frag(v2f_img i) : SV_Target
            {
                uint destinationIndex = FluxGetDestinationIndex(i.uv);
                if (!FluxIsDestinationValid(destinationIndex))
                    return 0;

                uint sourceIndex = destinationIndex * 4;
                float4 result = 0;
                for (uint j = 0; j < 4; j++)
                {
                    uint index = sourceIndex + j;
                    if (FluxIsSourceValid(index))
                    {
                        result += tex2D(_MainTex, FluxGetSourceUV(index));
                    }
                }
                return result;
            }
            ENDHLSL
        }
    }
}
```

出力インデックス0は入力0〜3、出力インデックス1は入力4〜7を読みます。末尾に4要素揃わない場合は、`FluxIsSourceValid`で有効な要素だけを合計します。Count外のピクセルを計算に混ぜないことが重要です。

**Reduction Factorとシェーダーの処理数を必ず一致させてください。** このシェーダーなら4です。Inspectorの値を8に変えるだけでは8要素ずつの処理にはなりません。シェーダー内の開始位置の倍率とループ回数も8に変える必要があります。FluxReductionは縮小率をシェーダーのパラメーターへ自動送信しません。

<span id="sum-and-read-back"></span>

## 合計を求めて読み戻す

さらに[アップロード](./upload.md)のFluxUploadと転送用Kernel、[非同期読み戻し](./readback.md)のFluxReadbackを用意します。UdonSharpスクリプト`FluxReductionExample`を作成してGameObjectへ追加し、各参照を割り当ててください。

```csharp
using TpLab.Flux.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxReductionExample : UdonSharpBehaviour
{
    [SerializeField]
    FluxBuffer source;

    [SerializeField]
    FluxBuffer destination;

    [SerializeField]
    FluxUpload upload;

    [SerializeField]
    FluxReduction reduction;

    [SerializeField]
    FluxReadback readback;

    void Start()
    {
        if (source == null || destination == null || upload == null ||
            reduction == null || readback == null || source == destination)
        {
            Debug.LogError("各参照と、別々の入力・出力Bufferを設定してください。");
            return;
        }
        if (source.Count != 250)
        {
            Debug.LogError("SourceのInitial Countを250にしてください。");
            return;
        }

        var values = new Vector4[250];
        for (var i = 0; i < values.Length; i++)
        {
            values[i] = new Vector4(i + 1, 0, 0, 0);
        }
        upload.Upload(values, source);
        reduction.Reduce(source, destination);
        if (!readback.TryRequest(destination, this))
        {
            Debug.LogError("読み戻し要求が受け付けられませんでした。");
        }
    }

    public void _OnFluxReadbackComplete()
    {
        if (!readback.Succeeded || readback.Count != 1)
        {
            Debug.LogError("集約結果を取得できませんでした。");
            return;
        }

        var sum = readback.Data[0].r;
        if (Mathf.Abs(sum - 31375f) <= 0.01f)
        {
            Debug.Log("PASS: 1から250までの合計は31375です。");
        }
        else
        {
            Debug.LogError($"期待値31375に対して結果は{sum}でした。");
        }
    }
}
```

通常のシーンリロードを伴うPlay Modeで実行し、ConsoleのPASSを確認します。集約結果は`(31375, 0, 0, 0)`です。

Reduceに戻り値や完了通知はありません。設定不備で集約が中断されても、続くReadback自体は成功する場合があります。Consoleの`[Flux]`エラーも確認し、読み戻し成功だけで計算成功と判断しないでください。

<span id="compute-a-maximum-or-average"></span>

## 最大値や平均値へ応用する

最大値を求める場合は、シェーダーの合計処理を成分ごとの`max`に変更します。初期値には最初の有効な入力値を使います。0から開始すると、すべて負の値の入力に対して誤って0を返してしまいます。

上のシェーダーの`float4 result = 0;`からループ末尾までを、次の処理へ置き換えます。Reduction Factorは4のままです。正しい出力Countで実行される各グループには、少なくとも1つの有効な入力があります。

```hlsl
float4 result = tex2D(_MainTex, FluxGetSourceUV(sourceIndex));
for (uint j = 1; j < 4; j++)
{
    uint index = sourceIndex + j;
    if (FluxIsSourceValid(index))
    {
        result = max(result, tex2D(_MainTex, FluxGetSourceUV(index)));
    }
}
```

この最大値は各成分を独立に比較します。「Xが最大の要素のVector4全体」を選ぶ処理ではありません。

平均値を求める場合は、合計した結果を元の要素数で割ります。各段階で単純平均すると、端数のグループと要素数の多いグループが同じ重みになり、結果がずれる場合があります。元のCountは集約を開始する前に保存しておくと、後でCountを変更しても正しく割れます。

集約では計算の順序が変わるため、浮動小数点の合計がCPUで順番に加算した結果と完全一致するとは限りません。結果の比較には用途に合った許容誤差を使います。

<span id="requirements-and-precautions"></span>

## 実行条件と注意点

| 条件 | 設定 |
| --- | --- |
| SourceのCount | 1以上 |
| Reduction Factor | 2以上で、シェーダーの処理数と一致 |
| DestinationのCapacity | 1以上 |
| 両WorkspaceのCapacity | それぞれ`ceil(Source.Count / Reduction Factor)`以上 |
| Bufferの分離 | Source、Destination、Workspace A、Workspace Bはすべて別 |
| 参照 | 全Buffer、Reduction Kernel、Shaderを設定する |

null参照は包括的に検証されないため、Inspectorの割り当てを済ませてください。Sourceが1要素でも最終Kernelは実行されます。単にコピーされるわけではないので、シェーダーは1要素だけの入力にも対応させます。

SourceのCountは変更しませんが、処理で使ったWorkspaceのCountと内容は変わります。作業用Bufferを他の処理の保存領域として兼用しないでください。結果はDestinationに残るので、次のGPU計算へ渡すこともできます。
