<span id="flux-quick-start"></span>

# Fluxのクイックスタート

4つの`Vector4`をGPUへ転送し、非同期で読み戻して元の値と比較します。FluxBuffer、FluxKernel、FluxUpload、FluxReadbackのつなぎ方を学ぶ最小の例です。

[導入](./installation.md)を済ませたワールドプロジェクトで進めてください。結果はConsoleに表示するため、描画用オブジェクトは不要です。

<span id="add-components-to-the-scene"></span>

## シーンにコンポーネントを配置する

空のGameObjectを4つ作り、次の名前とコンポーネントを設定します。各スクリプトはFluxパッケージの`Runtime/Udon`にあります。

| GameObject | コンポーネント | Inspectorの設定 |
| --- | --- | --- |
| `Buffer` | `FluxBuffer` | **Initial Count**を`4`にする |
| `UploadKernel` | `FluxKernel` | **Shader**に`Runtime/Shaders/FluxUpload.shader`を割り当てる |
| `Upload` | `FluxUpload` | **Upload Kernel**に`UploadKernel`のFluxKernelを割り当てる |
| `Readback` | `FluxReadback` | 追加の設定なし |

転送用Shaderの名前は`Flux/Upload`です。ShaderフィールドにはShaderアセットを直接割り当てます。

**Initial Count**は初期の有効要素数です。4を指定すると、2×2のRenderTextureが確保され、`Count`と`Capacity`はどちらも4になります。初期値の1のままでは、この例の配列を転送できません。

<span id="create-the-script"></span>

## 実行用スクリプトを作る

作業先プロジェクトのAssets内に、**Create → U# Script**で`FluxQuickStart`を作成します。生成された`FluxQuickStart.cs`を以下の内容に置き換えてください。ファイル名とクラス名を一致させ、同時に生成されるUdonSharp Program Assetも残します。

```csharp
using TpLab.Flux.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxQuickStart : UdonSharpBehaviour
{
    [SerializeField]
    FluxBuffer buffer;

    [SerializeField]
    FluxUpload upload;

    [SerializeField]
    FluxReadback readback;

    Vector4[] _expected;

    void Start()
    {
        if (buffer == null || upload == null || readback == null)
        {
            Debug.LogError("[FluxQuickStart] Inspectorの参照を設定してください。");
            return;
        }

        if (buffer.Count != 4)
        {
            Debug.LogError("[FluxQuickStart] BufferのInitial Countを4にしてください。");
            return;
        }

        _expected = new Vector4[4];
        for (var i = 0; i < _expected.Length; i++)
        {
            _expected[i] = new Vector4(i, i * 2f, i * 3f, i * 4f);
        }

        upload.Upload(_expected, buffer);

        if (!readback.TryRequest(buffer, this))
        {
            Debug.LogError("[FluxQuickStart] 読み戻し要求が受け付けられませんでした。");
        }
    }

    public void _OnFluxReadbackComplete()
    {
        if (!readback.Succeeded)
        {
            Debug.LogError("[FluxQuickStart] GPUからの読み戻しに失敗しました。");
            return;
        }

        var data = readback.Data;
        if (readback.Count != _expected.Length)
        {
            Debug.LogError("[FluxQuickStart] 読み戻した要素数が一致しません。");
            return;
        }

        for (var i = 0; i < readback.Count; i++)
        {
            var actual = (Vector4)data[i];
            var expected = _expected[i];
            if (!(Mathf.Abs(actual.x - expected.x) <= 0.01f &&
                  Mathf.Abs(actual.y - expected.y) <= 0.01f &&
                  Mathf.Abs(actual.z - expected.z) <= 0.01f &&
                  Mathf.Abs(actual.w - expected.w) <= 0.01f))
            {
                Debug.LogError($"[FluxQuickStart] Index {i}: expected {expected}, actual {actual}");
                return;
            }

            Debug.Log($"[FluxQuickStart] Index {i}: {actual}");
        }

        Debug.Log("[FluxQuickStart] PASS: 4要素の転送と読み戻しが一致しました。");
    }
}
```

`FluxQuickStart`という空のGameObjectを作り、生成したスクリプトを追加します。Inspectorの**Buffer**、**Upload**、**Readback**に、先ほど配置した各コンポーネントを割り当ててください。

この例ではReadbackを専用に使います。同じReadbackに別のスクリプトから要求を送らないでください。

<span id="run-and-check-the-results"></span>

## 実行して結果を確認する

1. シーンを保存し、Consoleにコンパイルエラーがないことを確認します。
2. 通常のシーンリロードが有効な状態でPlay Modeに入ります。SceneFlowがKernel用Materialを生成します。
3. Consoleで`[FluxQuickStart]`を検索します。
4. 次の4要素と、最後の`PASS`メッセージを確認します。

| Index | 期待する値 |
| --- | --- |
| 0 | `(0, 0, 0, 0)` |
| 1 | `(1, 2, 3, 4)` |
| 2 | `(2, 4, 6, 8)` |
| 3 | `(3, 6, 9, 12)` |

値は小数表記で出力される場合があります。比較は各成分の誤差`0.01`以内で行います。

<span id="how-it-works"></span>

## 処理の流れ

`Upload`は配列をKernelの`_FluxUploadData`に設定し、`Flux/Upload`シェーダーを実行してBufferへ書き込みます。この例では、配列の長さとBufferの`Count`を4に揃えています。

`TryRequest`が返す`true`は、読み戻し要求が受け付けられたことを示します。結果がその場で利用できるわけではありません。読み戻しが完了すると、通知先の`public void _OnFluxReadbackComplete()`が呼ばれます。メソッド名は正確に一致させてください。

完了通知は成功・失敗のどちらでも届きます。まず`Succeeded`を確認してから`Data`を読みます。`Data`は`Color[]`ですが、各要素のRGBA成分を`Vector4`のXYZW成分として扱えます。

一般に`Data.Length`はBufferの容量に対応し、有効要素数より大きいことがあります。読み取る範囲には、要求時の有効要素数を保持する`readback.Count`を使います。

<span id="if-it-does-not-work"></span>

## うまく動かない場合

| 症状 | 確認すること |
| --- | --- |
| `TpLab.Flux.Udon`が見つからない | Fluxと依存パッケージの導入、先に発生しているコンパイルエラーを確認する |
| `Upload count must match...` | 配列の長さとBufferのCountを一致させる。この例ではInitial Countを4にする |
| `SetVectorArray`や`Dispatch`で参照エラー | Upload KernelとShaderの設定を確認し、SceneFlowのFluxBuildPassが実行される通常のPlay Modeで試す |
| 読み戻し要求が受け付けられない | 同じReadbackが別の要求を処理中でないか確認する。要求が拒否された場合、完了通知は発生しない |
| 読み戻しが失敗する | ConsoleのGPU・描画関連エラーを確認する。成功を確認するまでDataへアクセスしない |
| 完了通知が届かない | 通知先が有効なままか、メソッド名・public指定・引数なしの形が一致しているか確認する |

<span id="changing-the-element-count"></span>

## 要素数を変えるとき

`FluxUpload`の1回の転送上限は512要素です。配列の長さは転送先の`Count`と一致させます。

`SetCount`は有効要素数を変更するだけで、Bufferを拡張しません。初期容量を超える場合は、Play Modeを終了して**Initial Count**を変更してください。このサンプルを拡張する場合は、コード内の4要素のチェックと配列サイズも合わせて変更します。

Bufferの内容はこの例では各クライアント内のデータです。ネットワーク同期は行いません。

<span id="next-steps"></span>

## 次に読む

[Bufferとデータ構造](./buffers.md)で容量とデータ配置を確認し、[Kernelとシェーダー](./kernels.md)で、この例に各要素を2倍にする計算を追加できます。
