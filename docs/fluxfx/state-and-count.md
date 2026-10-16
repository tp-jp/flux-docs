<span id="status-and-particle-counts"></span>

# 状態と粒子数の取得

再生状態やシミュレーション時間は`FluxParticleSystem`のプロパティで取得します。GPU上の生存粒子数は非同期で取得するため、要求した時点で結果が返るわけではありません。

<span id="read-state"></span>

## 状態を読む

| API | 意味 |
| --- | --- |
| `IsPaused` | Pauseによる一時停止中か |
| `IsEmitting` | 初期化済みで、発生の再生中・非Pause・非完了か。Start Delayの待機中もtrue |
| `PlaybackTime` | Clear以降のシミュレーション経過秒数。初期化前は0 |
| `ParticleCount` | ビルド済みの粒子スロット数。InspectorのParticle Countに対応 |
| `AliveCount` | 最後に取得した生存粒子数。初期化・Clear直後は0、それ以前の未取得・取得失敗などは-1 |
| `Emitter.HasCompleted` | 非ループの発生スケジュールが終了したか |
| `Executor.IsAliveCountPending` | 生存数の非同期読み戻し処理中か |

`IsEmitting`は「このフレームに粒子が生まれた」ことを表しません。Rateが0、Start Delay待ち、空きスロットがない場合でもtrueになり得ます。逆にStop後や非ループの発生終了後はfalseでも、既存粒子が残っていることがあります。

PlaybackTimeは発生周期の再生位置ではありません。Stop後も既存粒子の更新とともに進み、Pause中は止まります。Clearで0に戻り、Restartだけでは戻りません。粒子がなくなった後もシミュレーションが更新されていれば進みます。

<span id="capacity-versus-alive-count"></span>

## 容量と生存数を区別する

Particle Countが64でも、常に64個が生きているわけではありません。`ParticleCount`は確保した容量、`AliveCount`は生存数です。画面内に見えている粒子数とは異なるため、カメラ外や透明な粒子も生存数に含まれます。

生存数は自動で常時更新されません。`RequestAliveCount()`を呼んで取得を要求します。

| 結果・状態 | 扱い |
| --- | --- |
| `RequestAliveCount()`がtrue | 要求を開始した。結果の完成を意味しない |
| false | 未初期化、処理中、要求間隔が短いなどで開始できなかった |
| `IsAliveCountPending`がtrue | 前の値を表示しながら完了を待つ |
| `AliveCount`が-1 | 不明として扱う。0個とは区別する |

要求間隔は実時間で0.2秒以上に制限されます。読み戻し中は次の要求を開始できません。falseが返っても、以前に取得したAliveCountが直ちに無効になるわけではありません。

初期化・Clear後は既知の空状態としてAliveCountが0になり、Clear前の未完了の読み戻し結果は破棄されます。その後に粒子が生まれたかを調べるには、改めて要求が必要です。

<span id="display-the-count-periodically"></span>

## 生存数を定期表示する例

U# Scriptとして`FluxStatusDisplay`を作成し、TargetにPrefabルート、Status TextにUnity UIのTextを割り当てます。実行開始から2フレーム後に表示を開始し、0.5秒ごとに取得を要求します。

```csharp
using TpLab.Flux.FX.Udon;
using UdonSharp;
using UnityEngine;
using UnityEngine.UI;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxStatusDisplay : UdonSharpBehaviour
{
    [SerializeField]
    FluxParticleSystem target;

    [SerializeField]
    Text statusText;

    bool _ready;
    float _nextRequest;

    void Start()
    {
        SendCustomEventDelayedFrames(nameof(BeginDisplay), 2);
    }

    public void BeginDisplay()
    {
        _ready = target != null && target.Executor != null && statusText != null;
    }

    void Update()
    {
        if (!_ready) return;

        if (Time.realtimeSinceStartup >= _nextRequest)
        {
            _nextRequest = Time.realtimeSinceStartup + 0.5f;
            target.RequestAliveCount();
        }

        int alive = target.AliveCount;
        string countText = alive < 0 ? "--" : alive.ToString();
        string state = target.IsPaused ? "一時停止" :
            (target.IsEmitting ? "発生を再生中" : "発生停止・完了");
        string pending = target.Executor.IsAliveCountPending ? "（取得中）" : "";

        statusText.text = state + "\n生存数 " + countText +
            " / 容量 " + target.ParticleCount + pending +
            "\n経過 " + target.PlaybackTime.ToString("F1") + " 秒";
    }
}
```

この例は直近の取得結果を表示し、次の要求が開始できなければ次回の周期で再試行します。要求直後の値を新しい結果と断定していません。`BeginDisplay`の参照確認だけで、FluxFXの初期化成功が保証されるわけではありません。値が取得できない場合はConsoleの初期化エラーも確認してください。

<span id="detect-completion"></span>

## 完了判定に使う場合

Stop後に全粒子が消えるのを待つ場合は、Stop後に取得要求が受理されたことと、その要求のPendingが解消したことを確認してからAliveCountを読みます。値が-1なら再取得し、0なら取得対象の状態で生存粒子がいなかったと判断できます。

生存数にはGPUからの読み戻しの遅延があります。要求の間にPlayやRestartなどで発生を再開すると、結果が0でも既に新しい粒子が存在する可能性があります。厳密な処理では発生を停止したまま確認し、取得要求を管理するスクリプトを1つにまとめます。

FluxReadbackの完了通知は内部のExecutorが受け取ります。利用者のスクリプトに`_OnFluxReadbackComplete`を書くだけで通知されるAPIではないため、上記の状態を通して結果を確認してください。
