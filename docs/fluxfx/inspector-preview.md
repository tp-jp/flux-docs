<span id="inspector-and-preview"></span>

# Inspectorとプレビュー

FluxFXの編集設定は、`FluxParticleAuthoring`の専用Inspector（**Flux FX Settings**）で行います。[クイックスタート](./quickstart.md)で配置したPrefabのルートGameObjectを選択してください。子オブジェクトの内部コンポーネントを個別に編集する必要はありません。

<span id="use-the-settings-panel"></span>

## 設定画面を使う

**Language / 言語** でEnglishと日本語を切り替えられます。このガイドでは、対応する項目を探しやすいよう英語の項目名を併記します。

カスタムモジュールも、作者が翻訳を定義した見出しや項目は言語切り替えに対応します。開発方法は[Inspectorの言語切り替え対応](./custom-modules.md#localization)を参照してください。

| セクション | 内容 |
| --- | --- |
| [Main](./main.md) | 容量、再生条件、寿命や初速などの初期値 |
| [Emission](./emission.md) | 発生頻度とBurst |
| [Shape](./shape.md) | 発生位置と初速度方向の形状 |
| [Modules](./modules.md) | 動きや見た目を変える機能 |
| [Renderer](./renderer.md) | 描画方式、テクスチャ、ブレンド、描画範囲 |
| Backend | 生成される構成と容量・メモリの参考情報 |

見出しを開いて必要な項目を編集します。同じGameObjectに`FluxParticleSystem`が必要です。構成が欠けている場合は同梱Prefabと比較してください。Inspectorに移行要求が表示された場合は、[旧データの移行](./migration.md)を済ませてから編集します。

### AuthoringとSystemの役割 {#authoring-and-system}

| コンポーネント | 役割 |
| --- | --- |
| `FluxParticleAuthoring` | Particle Count・Play On Awakeを含む全編集設定を保持。Curve・Gradient、標準・カスタムModuleもここで編集する |
| `FluxParticleSystem` | 外部Udonが参照するRuntimeの入口。再生・停止やパラメーター変更を行う |

SystemのInspectorはUdonSharp標準表示で、設定用のSerializeFieldは非表示です。エフェクトはAuthoringで設定し、外部スクリプトの参照フィールドにはSystemを割り当てます。

### 設定をコピーする {#copy-settings}

1. Play Modeを終了し、コピー元とコピー先を必要に応じて[移行](./migration.md)します。
2. コピー元の **FluxParticleAuthoring** コンポーネントのメニューから **Copy Component** を選びます。
3. コピー先Prefabのルートにある **FluxParticleAuthoring** のメニューから **Paste Component Values** を選びます。
4. Particle Count・Play On Awake、Curve／Gradient、Moduleの設定を確認して、SceneまたはPrefabを保存します。

標準のコピーで編集設定全体を複製できます。Systemに対して設定のコピーを行う必要はありません。貼り付け先は既存のFluxFX Prefabを使い、子オブジェクトとRuntimeの接続を維持してください。

<span id="preview-in-the-scene-view"></span>

## Sceneビューで確認する

編集モードで対象のAuthoring Inspectorを表示すると、Sceneビューでプレビューできます。対象を選択し、**FluxFX Preview** オーバーレイを表示してください。非アクティブなGameObjectやSceneビューで非表示にしたオブジェクトのプレビューは描画されません。

| プレビューのボタン | 動作 |
| --- | --- |
| Play | 停止していた時間の進行を再開する |
| Pause | 現在の状態で時間の進行を止める |
| Restart | 初期状態へ戻し、再生する |
| Stop | 初期状態へ戻し、停止する |

ここでのStopは、既存粒子を更新し続ける実行時APIの`Stop()`とは異なります。

**Playback Time** はプレビューの経過時間、**Alive particles** は取得した生存粒子数です。生存数は非同期に取得されるため、即時の厳密な値ではありません。未取得の場合は`—`が表示されます。

<span id="changes-and-regeneration"></span>

## 設定変更と再生成

Authoringの設定やParticle Countが変わると、プレビュー用の構成が作り直されます。変更前の粒子がそのまま維持されるとは考えず、Restartで条件を揃えて比較してください。

Unityが非アクティブな間はプレビューの時間更新が止まります。戻ったときに離れていた時間分を一度に計算する動作ではありません。Editorプレビューは更新頻度と時間刻みに上限を設けているため、実機のフレームレート計測には使いません。

Play Modeへ移行するとEditor用プレビューは破棄され、実行時の描画へ切り替わります。プレビューで見た目を調整した後は、Play Modeでも動作を確認してください。

## ベイクとPlay中のLive編集 {#baking-and-live-editing}

Play開始・ワールドビルド時に、Authoringの設定からRuntime用の構成を生成し、Particle Count・Play On AwakeもSystemへベイクします。保存する初期設定は、Play Modeを終了してAuthoringで編集してください。

Play中もAuthoring Inspectorを使います。対応するLive項目は元のセクションに表示され、Runtimeの値を読み書きします。外部UdonがRuntime APIで変更した値にも表示が追従します。**Play中の変更はPlay終了時に破棄されます。**

再生成が必要な項目やInspector更新に未対応の項目は編集できません。Sceneビューの形状ハンドルも編集不可です。Runtimeの構成が生成されていない場合や、初期化が完了していない場合もLive項目は編集できません。編集できない項目をSystem側で直接変更しないでください。APIの変更方針がLiveでも、Inspector用の対応がなければ編集できません。

外部Udonからの操作は引き続き[FluxParticleSystemのRuntime API](./runtime-parameters.md)を使用します。

<span id="inspect-the-backend"></span>

## Backendを見る

Backendは通常の設定に必須ではありません。容量や負荷を調べる場合に開きます。

| 表示 | 読み方 |
| --- | --- |
| Maximum Particle Count (Current GPU) | 現在のGPUと描画Meshなどから求めた技術的な上限。快適に動作する推奨数ではない |
| State Pages / State RenderTextures | 粒子状態の保持に使う領域数とテクスチャ数 |
| Estimated State Memory | 状態テクスチャ分の推定メモリ |
| Estimated Spawn Allocation Memory | 発生先の割り当て用テクスチャ分の推定メモリ |
| Simulation Passes / Clear Passes | 更新・初期化に使うPass数 |
| Lookup Tables | CurveやGradientなどの参照テーブル数 |

推定メモリはエフェクト全体の総消費量ではありません。描画Meshやその他のリソースも必要です。

生成に失敗した場合はBackendまたはオーバーレイにエラーが表示されます。Mesh、形状の値、モジュールの設定を確認してからRestartで再試行してください。

生成済みShader・Materialなどの整理は、Backendではなく[生成物の管理](./generated-assets.md)から行います。整理画面では候補と保持理由を確認できます。
