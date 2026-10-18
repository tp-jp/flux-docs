<span id="iterative-computation-with-ping-pong"></span>

# Ping-pongによる反復計算

前回の計算結果を次の入力にするには、2つのBufferを使い、入力と出力の役割を交互に切り替えます。この方法をPing-pongと呼びます。Fluxでは専用コンポーネントではなく、FluxKernelのDispatchとBuffer参照の交換で実装します。

<span id="alternate-input-and-output"></span>

## 入力と出力を切り替える

同じBufferを同時に入力と出力に指定せず、次のように書き込み先を交互に変えます。

<div class="development-figure">
  <a class="diagram-light" href="../diagrams/flux-ping-pong-ja-light.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/flux-ping-pong-ja-light.svg" alt="Aを初期化して、1回目はAからB、2回目はBからA、3回目はAからBへ計算します。各回でcurrentとnextを交換し、currentを最新の結果にします。" width="480" height="488" /></a>
  <a class="diagram-dark" href="../diagrams/flux-ping-pong-ja-dark.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/flux-ping-pong-ja-dark.svg" alt="Aを初期化して、1回目はAからB、2回目はBからA、3回目はAからBへ計算します。各回でcurrentとnextを交換し、currentを最新の結果にします。" width="480" height="488" /></a>
</div>

計算結果をCPUへ戻す必要はありません。出力したBufferをそのまま次のDispatchへ渡せます。

<span id="double-the-values-three-times"></span>

## 2倍の計算を3回実行する

この例では4要素を初期化し、全成分を2倍にする計算を3回実行します。結果は元の値の8倍です。

<span id="prepare-the-scene"></span>

### シーンを準備する

[クイックスタート](./quickstart.md)と同じ方法でUploadとReadbackを配置し、次の構成を用意します。

| コンポーネント | 設定 |
| --- | --- |
| Buffer A、Buffer B | 別々のFluxBuffer。両方のInitial Countを4にする |
| Upload用Kernel | Shaderに`Flux/Upload`を設定する |
| FluxUpload | Upload Kernelに上のKernelを割り当てる |
| 計算用Kernel | [Kernelとシェーダー](./kernels.md#scale-shader)の`FluxScale.shader`を作成して割り当てる |
| FluxReadback | この例専用に配置する |

計算用シェーダーは、出力先の各有効要素に必ず値を書き込みます。この例ではBを最初に読む前に全面を書き込むため、Bの初期化用Uploadは不要です。

<span id="add-the-script"></span>

### スクリプトを追加する

UdonSharpスクリプト`FluxPingPongExample`を作成してGameObjectへ追加し、Inspectorで各参照を割り当てます。通常のシーンリロードを伴うPlay Modeで実行してください。

```csharp
using TpLab.Flux.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxPingPongExample : UdonSharpBehaviour
{
    [SerializeField]
    FluxBuffer bufferA;

    [SerializeField]
    FluxBuffer bufferB;

    [SerializeField]
    FluxUpload upload;

    [SerializeField]
    FluxKernel kernel;

    [SerializeField]
    FluxReadback readback;

    void Start()
    {
        if (bufferA == null || bufferB == null || upload == null ||
            kernel == null || readback == null || bufferA == bufferB)
        {
            Debug.LogError("各参照と、別々のBuffer A・Bを設定してください。");
            return;
        }
        if (bufferA.Capacity < 4 || bufferB.Capacity < 4)
        {
            Debug.LogError("両方のBufferに4要素分の容量が必要です。");
            return;
        }

        bufferA.SetCount(4);
        bufferB.SetCount(4);
        var values = new Vector4[4];
        for (var i = 0; i < values.Length; i++)
        {
            values[i] = new Vector4(i, i, i, 1f);
        }
        upload.Upload(values, bufferA);
        kernel.SetFloat("_Scale", 2f);

        var current = bufferA;
        var next = bufferB;
        for (var step = 0; step < 3; step++)
        {
            kernel.Dispatch(current, next);
            var previous = current;
            current = next;
            next = previous;
        }

        if (!readback.TryRequest(current, this))
        {
            Debug.LogError("読み戻し要求が受け付けられませんでした。");
        }
    }

    public void _OnFluxReadbackComplete()
    {
        if (!readback.Succeeded)
        {
            Debug.LogError("読み戻しに失敗しました。");
            return;
        }
        var data = readback.Data;
        for (var i = 0; i < readback.Count; i++)
        {
            Debug.Log($"Index {i}: {(Vector4)data[i]}");
        }
    }
}
```

期待する出力は次のとおりです。W成分も毎回2倍になるため、最後は8になります。

| Index | 結果 |
| --- | --- |
| 0 | `(0, 0, 0, 8)` |
| 1 | `(8, 8, 8, 8)` |
| 2 | `(16, 16, 16, 8)` |
| 3 | `(24, 24, 24, 8)` |

<span id="reference-the-latest-result"></span>

## 最新の結果を参照する

交換するのはC#側のBuffer参照です。Textureをコピーしたり、Bufferの中身を移動したりする処理はありません。Dispatch後の交換が終わると、`current`が最新の結果を指します。

固定でBuffer Aを読み戻すと、反復回数が奇数のときは1回前の結果を読んでしまいます。読み戻しや描画、次のKernelへの入力には`current`を渡してください。

別のKernelの追加入力として使う場合も、`SetBuffer("_InputB", current)`を設定し直します。以前設定したテクスチャ参照が、C#変数の交換に追従するわけではありません。

<span id="continue-across-frames"></span>

## 毎フレーム続ける場合

フレームをまたいで反復する場合は、`current`と`next`をクラスのフィールドに保持します。初期化時に一度だけAへ初期値を書き込み、UpdateなどでDispatchと参照交換を行います。毎フレーム初期値をUploadすると、前回の結果を使った計算になりません。

両Bufferの容量を揃え、要素数を変えるときは両方のCountを更新してください。Countを増やすだけでは新しい要素は初期化されません。シェーダーが読み取る全入力要素に有効な値を用意します。

読み戻しを行う場合は[非同期読み戻し](./readback.md)の受付・完了を管理し、処理中のReadbackへ毎フレーム要求を重ねないでください。

<span id="next-steps"></span>

## 次に読む

反復計算で得られた多数の要素を合計や最大値にまとめるには、[Reductionによる集約](./reduction.md)を使います。
