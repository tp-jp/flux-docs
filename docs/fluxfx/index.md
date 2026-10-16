<span id="about-fluxfx"></span>

# FluxFXの概要

FluxFXは、VRChat向けのGPUパーティクル・エフェクトシステムです。UnityのInspectorで粒子の発生、動き、見た目を設定し、GPU上でシミュレーションと描画を行います。

<span id="features"></span>

## できること

| 設定 | 内容 |
| --- | --- |
| 粒子の初期状態 | 寿命、初速、色、サイズ、回転を設定する |
| 発生 | 一定の頻度で生成する、指定時刻にまとめて生成する、ループする |
| 発生形状 | Point、Sphere、Hemisphere、Circle、Box、Coneから選ぶ |
| 動き | 重力、力、抵抗、速度制限、Noise、Vortexなどを組み合わせる |
| 見た目の変化 | 寿命に応じた色・サイズ・回転、テクスチャアニメーション、点滅、Trailsを設定する |
| 描画 | BillboardまたはMeshを使い、テクスチャやブレンド方式を設定する |
| 実行時の制御 | UdonSharpから再生・停止や対応するパラメーターの変更を行う |

<span id="workflow"></span>

## 制作の流れ

1. FluxFXと依存パッケージを導入します。
2. 同梱のFluxParticleSystem Prefabをシーンへ配置します。
3. Inspectorで設定し、Sceneビューのプレビューで動きを確認します。
4. Play Modeで実行時の動作を確認します。

最初のエフェクトは、C#やシェーダーを書かずに作れます。ボタンなどから操作したい場合は、UdonSharpによる制御を追加します。

<span id="where-to-configure-it"></span>

## 設定する場所

PrefabのルートにあるFluxParticleSystemを選ぶと、専用Inspectorが表示されます。

| セクション | 主な用途 |
| --- | --- |
| Main | 粒子の容量、再生条件、初期値 |
| Emission | 発生頻度とBurst |
| Shape | 発生する領域の形状 |
| Modules | 動きや見た目を変える機能 |
| Renderer | 描画方式、テクスチャ、ブレンド、描画範囲 |

設定内容は同じGameObjectのFluxParticleAuthoringに保持され、SceneFlowによる処理で実行用の構成が生成されます。通常の制作では、Prefab内のBufferやKernelを手作業で組み立てる必要はありません。

<span id="before-you-start"></span>

## 利用にあたって

FluxFXはFlux、Worlds SDK、SceneFlowを利用します。必要なバージョンは[導入](./installation.md)を参照してください。FluxのGPU計算APIを先に学ぶ必要はありません。

Inspectorで設定できる項目すべてが、実行開始後に変更できるわけではありません。実行時のパラメーターには、変更できないもの、既存粒子にも反映するもの、新しく生成する粒子に反映するものがあります。

FluxFXは開発初期段階です。APIやパッケージ構成が変わる可能性があります。

<span id="next-steps"></span>

## 次に読む

[導入](./installation.md)で環境を準備し、[クイックスタート](./quickstart.md)で最初の粒子を表示します。以降の構成は[ガイドの目次](./guide.md)を参照してください。
