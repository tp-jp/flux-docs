<span id="fluxfx-quick-start"></span>

# FluxFXのクイックスタート

同梱Prefabを配置し、小さな白い粒子が継続して発生するエフェクトを作ります。スクリプトやシェーダーの作成は不要です。[導入](./installation.md)を済ませたワールドプロジェクトで進めてください。

<span id="place-the-prefab"></span>

## Prefabを配置する

1. ProjectウィンドウでPackages内の **FluxFX → Runtime → Prefabs** を開きます。
2. **FluxParticleSystem.prefab** をHierarchyへドラッグします。
3. 配置したルートGameObjectを選択し、見つけやすい名前（例えば`MyFirstFluxFX`）に変更します。
4. TransformのPositionを`(0, 1, 0)`、Rotationを`(0, 0, 0)`、Scaleを`(1, 1, 1)`にします。

位置はシーンに合わせて変更できます。床や壁の内部を避け、確認しやすい空間に配置してください。

Prefabの子オブジェクトと内部参照はそのまま使います。ルートのFluxParticleSystemコンポーネントに表示される専用Inspectorから設定します。

<span id="configure-initial-settings"></span>

## Inspectorで初期値を設定する

手順の項目名と揃えるため、Inspector上部の **Language / 言語** を **English** にします。日本語表示も利用できます。

### Main

| 項目 | 設定値 | 意味 |
| --- | --- | --- |
| Particle Count | 64 | 確保する粒子の容量 |
| Simulation Space | Local | オブジェクトを基準にシミュレーションする |
| Play On Awake | オン | 実行開始時に再生する |
| Start Delay | 0 | 発生開始を遅らせない |
| Duration | 5 | 1周期の発生時間 |
| Loop | オン | 発生を繰り返す |
| Start Lifetime Mode | Constant | 寿命を一定にする |
| Start Lifetime | 3 | 粒子の寿命を3秒にする |
| Start Speed Mode | Constant | 初速を一定にする |
| Start Speed | 1 | 初速を1にする |
| Start Color Mode | Constant | 色を一定にする |
| Start Color | 白、Alpha 1 | 不透明な白を初期色にする |
| Start Size Mode | Constant | サイズを一定にする |
| Start Size | 0.1 | 小さな粒子にする |
| Start Rotation Mode | Constant | 初期回転を一定にする |
| Start Rotation | 0 | 初期回転を付けない |

Particle Countは「毎秒生成する数」ではありません。発生頻度は次のEmissionで設定します。上の値はこのチュートリアル用で、Prefabの初期設定とすべて同じではありません。

<span id="emission-and-shape"></span>

### EmissionとShape

**EMISSION** を開き、**Rate over Time** を8にします。これは1秒あたり8個の生成要求です。**Bursts** は空にします。

**SHAPE** を開き、Typeを **Cone**、Radiusを`0.5`、Angleを`25`にします。円錐状の発生形状を使います。

**MODULES** は追加せずに進めます。まず初速だけで動く状態を確認します。

### Renderer

**RENDERER** を開き、次のように設定します。

| 項目 | 設定値 |
| --- | --- |
| Mode | Billboard |
| Blend Mode | Alpha |
| Intensity | 1 |
| Intensity Mask | 未指定 |
| Texture | 未指定 |
| Tiling | `(1, 1)` |
| Offset | `(0, 0)` |
| Culling Bounds | Prefabの設定を維持 |

この例ではテクスチャ画像を用意せず、白い粒子の表示を確認します。Billboardなので描画用Meshの指定も不要です。丸い発光粒子などに仕上げるときは、後からTextureとブレンドを調整します。

<span id="preview-in-the-scene-view"></span>

## Sceneビューでプレビューする

1. 配置したルートGameObjectを選択したまま、Sceneビューでその周辺を表示します。選択オブジェクトへフォーカスすると探しやすくなります。
2. **FluxFX Preview** オーバーレイを確認します。
3. 停止中なら **Play**、最初から確認するなら **Restart** を押します。
4. 周囲へ移動する白い粒子が継続して発生することを確認します。

オーバーレイは、対象のInspectorを表示している編集時に利用できます。見つからない場合は、Sceneビューのオーバーレイ表示設定でFluxFX Previewを確認してください。

プレビューにはPlay／Pause、Restart、Stopと経過時間などの表示があります。Editor用のプレビュー操作と、UdonSharpから呼ぶ同名の再生APIは別のものです。

<span id="verify-in-play-mode"></span>

## Play Modeで確認する

シーンを保存し、通常のシーンリロードを伴うPlay Modeに入ります。Play On Awakeをオンにしているので、自動的に発生が始まります。

Sceneビューで配置位置の周囲を確認してください。Gameビューで見たい場合は、カメラやプレイヤーからその場所が見える必要があります。粒子が生成され、約3秒で消え、新しい粒子に入れ替わる状態が目標です。

ConsoleにFluxFXやSceneFlowのエラーがないことも確認します。Editorプレビューで表示できたことだけで、実行時の生成処理まで成功したとは判断しません。

<span id="try-changing-settings"></span>

## 設定を変えてみる

Play Modeを終了してから次の項目を1つずつ変更し、プレビューで比較します。

| 変更 | 確認すること |
| --- | --- |
| Rate over Timeを16にする | 発生する頻度が増える |
| Start Lifetimeを1にする | 粒子が早く消える |
| Start Sizeを0.2にする | 粒子が大きくなる |
| Start Colorを別の色にする | 粒子の色が変わる |
| Start Speedを0.5にする | 粒子の移動が遅くなる |

発生頻度や寿命を大きくすると同時に存在する粒子が増えます。Particle Countは容量なので、増やす場合は描画負荷も確認してください。

<span id="if-nothing-appears"></span>

## 表示されない場合

| 症状 | 確認すること |
| --- | --- |
| 専用Inspectorが出ない | Prefabのルートを選んでいるか、コンパイルエラーがないか確認する |
| Authoringが必要というエラー | 同じGameObjectのFluxParticleAuthoringを削除していないか確認する。最初はPrefabを新しく配置して試す |
| 粒子が発生しない | Play On Awake、Rate over Time、Start Lifetime、プレビューの再生状態を確認する |
| 発生しているが見えない | Start Size、Start ColorのAlpha、Intensity、視点と配置位置を確認する |
| プレビューの準備で止まる | Consoleとプレビューのエラー表示を確認する |
| Play Modeで失敗する | SceneFlowの生成エラー、依存パッケージ、シーンリロード設定を確認する |

<span id="next-steps"></span>

## 次のステップ

このエフェクトを基に、[Inspectorとプレビュー](./inspector-preview.md)の使い方を確認し、[Main](./main.md)・[Emission](./emission.md)・[Shape](./shape.md)・[Renderer](./renderer.md)で設定の意味を学びます。全体の構成は[ガイドの目次](./guide.md)を参照してください。
