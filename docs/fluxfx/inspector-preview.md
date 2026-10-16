<span id="inspector-and-preview"></span>

# Inspectorとプレビュー

FluxFXは、FluxParticleSystemの専用Inspectorで設定します。[クイックスタート](./quickstart.md)で配置したPrefabのルートGameObjectを選択してください。子オブジェクトの内部コンポーネントを個別に編集する必要はありません。

<span id="use-the-settings-panel"></span>

## 設定画面を使う

**Language / 言語** でEnglishと日本語を切り替えられます。このガイドでは、対応する項目を探しやすいよう英語の項目名を併記します。

| セクション | 内容 |
| --- | --- |
| [Main](./main.md) | 容量、再生条件、寿命や初速などの初期値 |
| [Emission](./emission.md) | 発生頻度とBurst |
| [Shape](./shape.md) | 発生位置と初速度方向の形状 |
| [Modules](./modules.md) | 動きや見た目を変える機能 |
| [Renderer](./renderer.md) | 描画方式、テクスチャ、ブレンド、描画範囲 |
| Backend | 生成される構成と容量・メモリの参考情報 |

見出しを開いて必要な項目を編集します。設定画面には同じGameObjectのFluxParticleAuthoringが必要です。Authoringが必要というエラーが出た場合は、同梱Prefabの構成を確認してください。

通常の制作ではPlay Modeを終了してから設定を編集し、シーンを保存します。実行時の変更は、対応するUdonSharp APIを使う別の操作です。

<span id="preview-in-the-scene-view"></span>

## Sceneビューで確認する

編集モードで対象のInspectorを表示すると、Sceneビューでプレビューできます。対象を選択し、**FluxFX Preview** オーバーレイを表示してください。非アクティブなGameObjectやSceneビューで非表示にしたオブジェクトのプレビューは描画されません。

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
