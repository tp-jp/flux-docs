<span id="asynchronous-readback"></span>

# 非同期読み戻し

`FluxReadback`は、FluxBufferのデータをGPUからCPUへ非同期で読み戻します。要求したその場で結果を読むのではなく、完了イベントで成功を確認してからデータを使います。

<span id="start-a-request"></span>

## 要求を開始する

GameObjectにFluxReadbackを追加し、読み戻すBufferと、完了通知を受け取るUdonSharpBehaviourを指定します。

| メソッド | 戻り値と用途 |
| --- | --- |
| `TryRequest(buffer, receiver)` | 受付時はtrue、拒否時はfalse。受付を確認したい場合に使う |
| `Request(buffer, receiver)` | 戻り値なし。内部でTryRequestを呼び、同じ条件で受付・拒否する |

次の場合は要求が拒否されます。

- 同じReadbackがすでに別の要求を処理している。
- Bufferまたは通知先がnullである。

拒否された要求はキューに入りません。その要求に対する完了通知も発生せず、進行中の要求や前回の結果は変更されません。`TryRequest`のfalseは、GPU転送の失敗とは区別して扱います。

<span id="read-the-result-in-the-callback"></span>

## 完了イベントで結果を読む

次の例は、書き込み済みのBufferを読み戻すコンポーネントです。UdonSharpスクリプト`FluxReadbackExample`として作成し、InspectorでBufferとReadbackを割り当てます。Readbackはこのスクリプト専用にしてください。

```csharp
using TpLab.Flux.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxReadbackExample : UdonSharpBehaviour
{
    [SerializeField]
    FluxBuffer buffer;

    [SerializeField]
    FluxReadback readback;

    public void Read()
    {
        if (buffer == null || readback == null)
        {
            Debug.LogError("BufferとReadbackを設定してください。");
            return;
        }

        if (!readback.TryRequest(buffer, this))
        {
            Debug.LogWarning("読み戻し要求は受け付けられませんでした。");
        }
    }

    public void _OnFluxReadbackComplete()
    {
        if (!readback.Succeeded)
        {
            Debug.LogError("GPUからの読み戻しに失敗しました。");
            return;
        }

        var data = readback.Data;
        for (var i = 0; i < readback.Count; i++)
        {
            var value = (Vector4)data[i];
            Debug.Log($"Index {i}: {value}");
        }
    }
}
```

この例は自動実行しません。UploadやKernelの呼び出し後に、制御用UdonSharpスクリプトから、このコンポーネントの`Read()`を呼んでください。別々のスクリプトの`Start`の呼び出し順に依存させず、書き込みと要求を順序立てて実行します。1つのスクリプトで完結する例は[クイックスタート](./quickstart.md)にあります。

完了通知のメソッド名は`_OnFluxReadbackComplete`です。`public`、戻り値`void`、引数なしで宣言してください。成功・失敗のどちらでも呼ばれるため、まず`Succeeded`を確認します。通知先を破棄すると通知を受け取れなくなるので、完了まで保持してください。

<span id="check-the-state"></span>

## 状態を確認する

| 状態 | IsRequesting | Succeeded | HasError | Data |
| --- | --- | --- | --- | --- |
| まだ要求していない | false | false | false | null |
| 要求を受け付け、処理中 | true | false | false | null |
| 成功して完了 | false | true | false | Color配列 |
| 失敗して完了 | false | false | true | null |

新しい要求が受け付けられると、前回の成功・失敗フラグはリセットされます。`HasError == false`だけでは成功と判断できません。未要求や処理中もfalseだからです。

完了時はGPU要求のエラーとデータ取得結果を検査して状態を更新し、その後に通知先へイベントを送ります。したがって、イベント内では完了後の状態を参照できます。

<span id="count-and-the-data-range"></span>

## CountとDataの範囲

`Data`は`Color[]`です。RGBAは元の4成分データに対応し、`Vector4`へ変換して利用できます。

配列の長さは要求時のBufferのCapacityに対応します。一方、`readback.Count`は要求を受け付けた時点のBufferの有効要素数です。

例えばCapacityが256でCountが63なら、成功後の`Data.Length`は256ですが、利用するのは先頭の63要素です。要求後にBufferのCountを32へ変更しても、この要求の`readback.Count`は63のままです。ループの上限には、現在の`buffer.Count`や`Data.Length`ではなく`readback.Count`を使います。

Countが小さくても、読み戻し要求はテクスチャ全体に対して行われます。Countを減らしただけでは、転送対象のテクスチャサイズは小さくなりません。

<span id="save-a-result"></span>

## 結果を保存する

Readbackは同じ容量の要求で内部配列を再利用します。`var saved = readback.Data;`で参照を保持しても、過去の結果を保存したことにはなりません。後の読み戻しで配列の内容が書き換わります。

結果を残す場合は、成功した完了イベント内で必要な要素を別の配列へコピーします。次は、先ほどのクラスに追加するフィールドと、完了イベントの成功確認後に置く処理の例です。

```csharp
// クラスのフィールド
Vector4[] _saved;
```

```csharp
// _OnFluxReadbackComplete内で、Succeededを確認してから実行
var count = readback.Count;
var data = readback.Data;
_saved = new Vector4[count];
for (var i = 0; i < count; i++)
{
    _saved[i] = (Vector4)data[i];
}
```

<span id="make-another-request"></span>

## 続けて読み戻す

同じReadbackで並行して複数の要求は処理できません。次の要求は、現在の結果を処理してから開始してください。完了イベントが呼ばれる時点では`IsRequesting`がfalseなので、イベント内から次の要求を送ることもできます。

新しい要求を受け付けると`Data`は再びnullになり、Countと状態も新しい要求のものに切り替わります。結果の読み取りやコピーを終える前に、次の要求を開始しないでください。

複数の処理で同じReadbackを共有する場合は、要求と通知先を1か所で管理します。独立して読み戻す必要がある場合は、Readbackコンポーネントを分ける構成にできます。

<span id="handle-failure"></span>

## 失敗時の扱い

読み戻しに失敗すると`HasError`がtrueになり、`Data`はnullになります。成功する前提でアクセスせず、処理を中断するか、呼び出し側で再試行するかを決めてください。FluxReadbackには自動再試行や要求のキャンセル機能はありません。

要求中はBufferを解放せず、通知先とReadbackを保持します。GPU計算を続けるだけなら途中の読み戻しを省き、CPUで必要な結果に絞って要求してください。
