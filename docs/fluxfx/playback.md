<span id="playback-controls"></span>

# 再生と停止

UdonSharpから、Prefabのルートにある`FluxParticleSystem`を参照して操作します。ここで扱うAPIは実行時用です。Sceneビューの[プレビュー](./inspector-preview.md)のボタンとは動作が異なる場合があります。

<span id="create-a-control-script"></span>

## 操作用スクリプトを用意する

1. [クイックスタート](./quickstart.md)の手順で、実行時に粒子が表示されるPrefabを配置します。
2. 作業先プロジェクトのAssets内で **Create → U# Script** から`FluxPlaybackControl`を作成します。
3. 生成したC#ファイルを次の内容に置き換え、UdonSharp Program Assetは残します。
4. スクリプトを操作用GameObjectへ追加し、TargetにPrefabルートのFluxParticleSystemを割り当てます。

```csharp
using TpLab.Flux.FX.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxPlaybackControl : UdonSharpBehaviour
{
    [SerializeField]
    FluxParticleSystem target;

    public void PlayEffect()
    {
        if (target != null) target.Play();
    }

    public void PauseEffect()
    {
        if (target != null) target.Pause();
    }

    public void StopEmission()
    {
        if (target != null) target.Stop();
    }

    public void HideEffect()
    {
        if (target == null) return;
        target.Stop();
        target.Clear();
    }

    public void RestartFromEmpty()
    {
        if (target == null) return;
        target.Clear();
        target.Restart();
    }
}
```

実行開始後に`RestartFromEmpty`を呼び出すと、粒子を消してから最初の発生スケジュールを再生します。

<span id="method-differences"></span>

## 各メソッドの違い

| メソッド | 新規発生 | 既存粒子 | 発生スケジュール |
| --- | --- | --- | --- |
| `Play()` | 再開する | 更新を再開する | 続きから進む |
| `Stop()` | 停止する | 移動・加齢を続ける | 現在位置で止まる |
| `Pause()` | 一時停止する | 更新を一時停止する | 現在位置で止まる |
| `Restart()` | 再開する | 消さずに更新する | Start Delayからやり直す |
| `Clear()` | 再生状態を変えない | 消去する | 再生位置を変えない |

`Play()`、`Stop()`、`Restart()`はいずれも一時停止を解除します。Pause中にStopすると、新規発生は止まりますが、既存粒子の移動と加齢は再開します。

<span id="let-particles-expire-naturally"></span>

### 自然に消えるまで待つ

`Stop()`を使います。粒子は寿命まで動き続けます。生存粒子がなくなったか調べる場合は、[生存数の非同期取得](./state-and-count.md)を使います。`IsEmitting`がfalseでも、粒子が残っていることがあります。

<span id="freeze-particles-in-place"></span>

### その場で静止させる

`Pause()`を使います。粒子の生成とシミュレーション時間が止まります。表示を消す操作ではありません。`Play()`で再開できます。

<span id="hide-particles-immediately"></span>

### すぐに消す

`Stop()`の後に`Clear()`を呼びます。Clearだけでは発生が続いているため、次の更新でまた粒子が生まれます。

<span id="restart-from-an-empty-state"></span>

### 空の状態から再生し直す

`Clear()`の後に`Restart()`を呼びます。Restartだけでは既存粒子やTrailsの履歴は消えません。また、Loopをオフにして発生周期が終了した後は、Playだけでは周期を巻き戻せないためRestartを使います。

<span id="time-and-settings"></span>

## 時間と設定の扱い

Clearは粒子の状態とTrailsの履歴を消し、`PlaybackTime`を0に戻します。Restartは発生スケジュールを戻しますが、`PlaybackTime`は戻しません。発生用の時間とシミュレーション時間は別々に管理されています。

ClearやRestartは、スクリプトで変更したパラメーターをInspectorの初期値へ戻す操作ではありません。Staticパラメーターの変更制限も解除しません。詳細は[実行時のパラメーター変更](./runtime-parameters.md)を参照してください。

<span id="startup-considerations"></span>

## 実行開始時の注意

FluxParticleSystemは自身のStartで初期化し、Play On Awakeを再生状態へ反映します。別スクリプトのStartから即座にPlayやRestartを呼ぶと、実行順序の影響を受けます。自動再生にはPlay On Awakeを使い、独自の初期操作はFluxParticleSystemのStartが済んだ後に行います。開始処理を遅らせる例は[状態と粒子数の取得](./state-and-count.md#生存数を定期表示する例)を参照してください。

これらの呼び出しはローカルで作用します。FluxParticleSystem自体はネットワーク同期を行わないため、複数プレイヤーで操作を共有する場合は、呼び出し側で同期方法を設計します。
