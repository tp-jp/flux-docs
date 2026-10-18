<span id="runtime-parameters"></span>

# 実行時のパラメーター変更

`FluxParticleSystem`からMain・Emission・Shape・各モジュールの操作ハンドルを取得し、型付きのメソッドで値を変更します。Inspectorで用意した構成を、実行中に調整するためのAPIです。

独自モジュールのハンドルを実装する方法は[カスタムモジュール](./custom-modules.md#runtime-handle)を参照してください。

<span id="api-entry-points"></span>

## 操作の入口

| 入口 | 操作例 | 必要な名前空間 |
| --- | --- | --- |
| `target.Main` | `SetStartSpeed`、`SetDuration` | `TpLab.Flux.FX.Udon.Parameters` |
| `target.Emission` | `SetRate`、`SetBursts` | `TpLab.Flux.FX.Udon.Parameters` |
| `target.Shape` | `SetRadius`、`SetPosition` | `TpLab.Flux.FX.Udon.Parameters` |
| `target.Modules.Gravity`など | `SetGravity`、`SetEnabled` | `TpLab.Flux.FX.Udon.Modules` |
| `target` | `SetRenderIntensity` | `TpLab.Flux.FX.Udon` |

`SetRenderIntensity`で変更した強度にも、Rendererに設定した[Intensity Mask](./renderer.md#intensity-mask)が適用されます。マスク画像はInspectorで設定します。現在、マスク画像を差し替える専用のUdonSharp APIはありません。

ハンドルは対象システムから取得します。`new`で作成したり、内部のリストを直接書き換えたりしません。未構成のMain・Shapeや、追加していないモジュールはnullになることがあるため、操作前に確認してください。無効化した状態で組み込まれたモジュールは取得でき、`SetEnabled(true)`で有効にできます。

<span id="when-changes-take-effect"></span>

## 反映されるタイミング

| 分類 | 主な項目 | 変更後の扱い |
| --- | --- | --- |
| 発生頻度 | EmissionのRate | 次の発生計算から使う |
| 発生時に使う値 | Start Speed、Shapeの位置・半径など | 以後に生成する粒子に使う。既存粒子の初速や発生位置を変更しない |
| 更新・描画に使う値 | Gravityなどの力、モジュールの有効状態、Intensity、Blinkなど | 以後の更新・描画に反映する |
| 発生スケジュール | Start Delay、Duration、Loop、Bursts | 次回Restartで取り込む |
| Static | Start Lifetime、Start Color、Start Size、Start Rotationとそれらの範囲、Texture Sheet AnimationのTiles | 初回シミュレーション更新後は変更不可 |

Staticの制限は、最初の粒子が生まれた時点ではなく、最初のシミュレーション更新から適用されます。Play On Awakeをオフにしても更新自体は行われるため、Staticを自由に変更できる待機状態にはなりません。Pause・Stop・Clear・Restartでもロックは解除されません。

<span id="change-rate-and-gravity"></span>

## 発生頻度と重力を変える例

InspectorでGravityを追加してから、次のスクリプトを用意します。[再生と停止](./playback.md)と同様にU# Scriptとして作成し、TargetにPrefabルートを割り当てます。実行開始後に`ApplySettings`を呼んでください。

```csharp
using TpLab.Flux.FX.Udon;
using TpLab.Flux.FX.Udon.Modules;
using TpLab.Flux.FX.Udon.Parameters;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxRuntimeSettings : UdonSharpBehaviour
{
    [SerializeField]
    FluxParticleSystem target;

    public void ApplySettings()
    {
        if (target == null || target.Emission == null || target.Modules == null)
            return;

        var gravity = target.Modules.Gravity;
        if (gravity == null)
        {
            Debug.LogWarning("InspectorでGravityを追加してください。");
            return;
        }

        bool accepted = target.Emission.SetRate(16f);
        accepted &= gravity.SetGravity(new Vector3(0f, -0.5f, 0f));
        accepted &= gravity.SetEnabled(true);
        accepted &= target.SetRenderIntensity(1.5f);

        if (!accepted)
        {
            Debug.LogWarning("一部の設定が受け付けられませんでした。");
        }
    }
}
```

複数のSet呼び出しは一括処理ではありません。途中で失敗しても、それ以前に成功した設定は残ります。

<span id="check-available-parameters"></span>

## 対応する項目を確認する

MainのConstantとRandom Between Two Constants、Shapeの種類、モジュールのModeによって、生成されるパラメーターが異なります。例えばStart Speedが範囲指定なら`SetStartSpeedRange`、Constantなら`SetStartSpeed`を使います。

```csharp
var main = target.Main;
if (main != null)
{
    if (main.HasStartSpeed())
    {
        main.SetStartSpeed(2f);
    }
    else if (main.HasStartSpeedRange())
    {
        main.SetStartSpeedRange(new Vector2(1f, 2f));
    }
}
```

`HasStartSpeed()`や`Shape.HasRadius()`は、構成にその項目があるかを返します。現在変更できるか、モジュールが有効かを返すものではありません。有効状態は`GetEnabled()`、変更結果はSetメソッドの戻り値で確認します。非対応の値をGetすると0相当が返る場合があるため、値が0というだけでは対応の有無を判断できません。

Start RotationがConstantの0で、回転を変更するモジュールもない場合は、回転の処理とパラメーターが生成されません。この構成では`HasStartRotation()`がfalseになり、再初期化しても`SetStartRotation`は使えません。回転を操作する構成はInspectorであらかじめ用意します。

<span id="change-the-schedule"></span>

## スケジュールを変更する

次の例は、MainとEmissionがnullでないことを確認した後に使います。0秒に8個、0.5秒に4個を発生させる非ループの設定です。

```csharp
bool accepted = target.Main.SetStartDelay(0f);
accepted &= target.Main.SetDuration(2f);
target.Main.SetLoop(false);
accepted &= target.Emission.SetRate(0f);
accepted &= target.Emission.SetBursts(
    new float[] { 0f, 0.5f },
    new int[] { 8, 4 });

if (accepted)
{
    target.Clear();
    target.Restart();
}
```

Burstの時刻は0以上で昇順、個数は1以上、2つの配列は同じ長さにします。Burstをなくす場合は両方に空配列を渡します。配列の内容はコピーされるので、呼び出し後に元の配列を変えても設定は変わりません。Durationは0.01秒以上です。

Start Delay・Duration・Loop・BurstのGetメソッドは、次回Restartに使う設定を返します。現在進行中の周期へ既に反映されたことを意味しません。

<span id="reset-static-values"></span>

## Staticの値を再設定する場合

通常はInspectorで設定します。実行中に変更する必要がある場合は、シミュレーションをPauseしてExecutorをRelease・Initializeし直してから設定します。既存粒子と履歴を失う再初期化なので、毎フレーム行う操作には向きません。

次はStart Lifetimeだけを変更する例です。正常に初期化されたシステムに対し、実行開始後に呼びます。

```csharp
target.Pause();
target.Executor.Release();
if (!target.Executor.Initialize(target.ParticleCount))
{
    Debug.LogError("FluxFXの再初期化に失敗しました。");
    return;
}

if (!target.Main.SetStartLifetime(2f))
{
    Debug.LogWarning("Start Lifetimeを変更できませんでした。");
    return;
}

target.Restart();
```

Initializeには既存の`ParticleCount`を渡します。この操作はシェーダーや構成を作り直すものではなく、同じ構成のGPU実行環境を再初期化します。モジュールの追加、Shapeの種類、Simulation Space、Rendererの種類、Curve・Gradientの内容、Trailsの点数などの構成変更はInspector側で行います。

<span id="rejected-changes"></span>

## 変更が拒否される場合

boolを返すSetメソッドは、非対応の項目・Staticのロック・型や数値制約に合わない値などでfalseを返します。自動的に適正値へ丸められるとは考えず、戻り値を確認します。NaNやInfinityも受け付けません。

Billboardの回転はZ軸だけ、サイズや頻度は非負など、Inspectorと同じ項目の制約を確認してください。TrailsのDurationは正の値が必要です。有効なTrailsでDurationを変更したり、Trailsを再び有効にしたりすると、軌跡の履歴は消去されます。

実行中の変更は保存済みPrefabの編集やネットワーク同期にはなりません。状態の表示方法は[状態と粒子数の取得](./state-and-count.md)を参照してください。
