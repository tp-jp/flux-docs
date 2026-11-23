<span id="inspector-and-preview"></span>

# Inspectorとプレビュー

FluxFXの編集設定は、`FluxParticleAuthoring`の専用Inspector（**Flux FX Settings**）で行います。[クイックスタート](./quickstart.md)で配置したPrefabのルートGameObjectを選択してください。子オブジェクトの内部コンポーネントを個別に編集する必要はありません。

<span id="use-the-settings-panel"></span>

## 設定画面を使う

**Language / 言語** でEnglishと日本語を切り替えられます。このガイドでは、対応する項目を探しやすいよう英語の項目名を併記します。

カスタムモジュールも、作者が翻訳を定義した見出しや項目は言語切り替えに対応します。開発方法は[Inspectorの言語切り替え対応](./custom-modules.md#localization)を参照してください。

| セクション | 内容 |
| --- | --- |
| [Main](./main.md) | 容量、System Follow、再生条件、寿命や初速などの初期値 |
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

## Previewの追従操作 {#preview-follow}

[MainのSystem Follow](./main.md#system-follow)を有効にすると、Sceneビューの **FluxFX Preview → Preview Follow（Previewの追従）** に操作欄が表示されます。実行時の追従先とは別に、Previewでの表示位置を選びます。

| 英語UI | 日本語UI | 動作 |
| --- | --- | --- |
| Fixed at Placement | 配置位置で固定 | 既定。シーン上の配置で表示し、実行時の追従先やオフセットは適用しない |
| Follow Scene Camera | Sceneカメラに追従 | 最後にアクティブだったSceneビューのカメラへ追従する |
| Follow Specified Transform | 指定Transformに追従 | Preview専用に指定したTransformへ追従する |
| Freeze Follow Position | 追従位置を固定 | 追従中の位置と向きを保持する |
| Release Follow Position | 追従位置の固定を解除 | 現在の追従先への追従を再開する |

追従モードでは、MainのFollow Offset・Follow Offset Space・Follow Rotationを使います。Sceneカメラはプレイヤーの代用であり、Local Player PositionとHeadの高さの違いは自動再現しません。

**位置の固定と粒子のPauseは別操作です。** 再生中に追従位置を固定すると、粒子の再生を続けたまま、カメラを動かして外側から観察できます。モードや指定Transformを変えると固定は解除されます。配置位置モードでは固定／解除ボタンは表示されません。

Preview専用の指定Transformが未指定でも、Sceneカメラや実行時のFollow Transformへ自動的には切り替えません。追従モードへ切り替えてから初めて対象を取得するまではシミュレーションを待機し、取得後に対象が失われた場合は最後の位置・向きと再生状態を維持します。対象を取得できない間は、新たに位置を固定することはできません。固定済みの状態は解除できますが、追従を再開するには対象が必要です。

Previewのモード・追従先の変更や固定／解除は、粒子やPlayback Timeを初期化しません。空の状態から比較する場合は **Restart** を押してください。Restartでも追従先と固定状態は保持されます。

実行時のSystem FollowがSpecified Transformの場合は、Previewのモードにかかわらず[MainのFollow Transformに有効な参照が必要](./main.md#system-follow)です。Preview専用の指定Transformが未指定の場合とは異なり、Mainの設定不備は構成生成エラーになります。

Previewの操作はEditor内の一時状態です。実行時設定、シーンのTransform、Prefabの保存内容は変更しません。選択解除などでInspectorが作り直されると既定の配置位置モードに戻ります。モジュール編集などによるPreview再構築では、追従先と固定状態を保持します。

[プレイヤーの周囲に降る雪の例](./main.md#follow-snow-example)で、配置位置・カメラ追従・位置固定を使い分ける手順を説明します。

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
