# Renderer

Rendererは、粒子をどの形状・テクスチャ・ブレンド方式で描画するかを設定します。粒子の初期色、初期サイズ、初期回転は[Main](./main.md)で変更します。

<span id="billboard-and-mesh"></span>

## BillboardとMesh

| Mode | 表示と必要な設定 |
| --- | --- |
| Billboard | カメラに向く板として描画する。描画用Meshの指定は不要 |
| Mesh | 指定したMeshを各粒子として描画する。Meshの割り当てが必要 |

Meshは読み取り可能で、頂点と三角形を持ち、各サブメッシュのトポロジーがTrianglesである必要があります。インポートしたMeshでは読み取り設定を確認してください。

複雑なMeshほど粒子1個あたりの頂点・インデックス数が増え、容量上限や負荷に影響します。BillboardからMeshへ切り替えたときは、Particle Countも見直します。

Billboardの初期回転はZ軸のみです。MeshではXYZ回転を使えます。RendererのModeを変えても、Mainの回転値に非対応の成分が残っていないか確認してください。

<span id="set-a-texture"></span>

## テクスチャを設定する

| 項目 | 意味 |
| --- | --- |
| Texture | 粒子に使うTexture2D |
| Tiling | UVの繰り返し倍率 |
| Offset | UVのずらし量 |

最初はTilingを`(1, 1)`、Offsetを`(0, 0)`にします。透過した丸い粒子を作る場合は、輪郭の外側に透明部分を持つテクスチャを使い、AlphaまたはAdditiveで確認します。

画像の一部をフレームとして切り替えるアニメーションには、Texture Sheet Animationモジュールを使います。

## Blend Mode

| モード | 合成 | 深度書き込み |
| --- | --- | --- |
| Opaque | 背景との透明合成を行わない | あり |
| Alpha | 入力のAlphaで背景と混ぜる | なし |
| Additive | 入力RGBにAlphaを掛け、背景へ加算する | なし |

OpaqueでAlpha値だけを下げても、Alphaモードのような半透明合成にはなりません。透過を使いたい場合はBlend Modeも変更します。

Additiveは重なる部分が明るくなります。煙などの面として見せたい表現はAlpha、光の重なりを見せたい表現はAdditiveで比較すると調整しやすくなります。

## Intensity

**Intensity** は描画色のRGBへ掛ける強度です。0以上を指定します。Alphaを直接変更する設定ではありません。

色を変える場合はMainのStart Color、透明度を調整する場合は色やテクスチャのAlphaとBlend Modeを確認します。Intensityを上げるだけで周囲に光がにじむ効果が自動的に付くわけではありません。

<span id="set-rendering-bounds"></span>

## 描画範囲を設定する

**Culling Bounds** は、カメラから見える範囲かどうかを判定するための領域です。CenterとSizeを設定し、粒子が移動する範囲を含めます。Sizeは各成分とも正の値が必要です。

この範囲はRendererのローカル座標です。Simulation SpaceがWorldでも、Boundsまでワールド座標になるわけではありません。発生元を移動する場合は、既存粒子が残る範囲も考慮してください。

範囲が狭いと、粒子が見える位置にあるのに描画全体が消えることがあります。まずPrefabの範囲で表示を確認し、その後エフェクトの移動範囲に合わせて調整します。Boundsは粒子を閉じ込めたり、衝突させたりする設定ではありません。

<span id="unexpected-appearance"></span>

## 見え方がおかしいとき

| 症状 | 確認する項目 |
| --- | --- |
| Meshを選ぶと生成エラーになる | Meshの割り当て、読み取り可否、頂点・三角形 |
| 透明部分が期待どおりにならない | Blend Mode、テクスチャとStart ColorのAlpha |
| 極端に暗い、明るい | Start Color、Intensity、Additiveでの重なり |
| 視点によって全体が消える | Culling Boundsと粒子の移動範囲 |
| 板が大きすぎる | MainのStart Size |

制作中はSceneビューのプレビューで調整し、最後に実行時のカメラからも見え方を確認してください。
