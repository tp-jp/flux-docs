# Shape

Shapeは粒子の発生位置と初速度の方向を決めます。速度の大きさはMainのStart Speedで指定します。以下の軸と形状は、発生元のローカル座標を基準に説明します。

<span id="choose-a-shape"></span>

## 形状を選ぶ

| Type | 発生位置 | 設定項目 |
| --- | --- | --- |
| Point | 発生元の一点 | 追加項目なし |
| Sphere | 球の内部 | Radius |
| Hemisphere | +Y側の半球の内部 | Radius |
| Circle | XZ平面の円盤の内部 | Radius |
| Box | 中心を基準とする直方体の内部 | Size |
| Cone | XZ平面の底面円盤の内部 | Radius、Angle |

Sphere、Hemisphere、Circleは表面や輪郭だけから生成する設定ではありません。Coneも円錐全体の体積から生成する方式ではなく、底面円盤から円錐状の方向へ飛ばします。

<span id="radius-and-size"></span>

## RadiusとSize

**Radius** は球・半球・円盤の半径です。0以上を指定します。発生範囲を広げたい場合に大きくします。Radiusを変えても初速自体は変わりません。

**Size** はBoxのXYZ各方向の全幅です。各成分は0以上です。例えば`(2, 1, 4)`なら、中心からX方向に±1、Y方向に±0.5、Z方向に±2の範囲で生成します。

<span id="initial-velocity-direction"></span>

## 初速度の方向

Sphereでは球方向、Hemisphereでは+Y側の半球方向、CircleではXZ平面内の放射方向を使います。Coneでは+Y方向を軸に広がります。PointとBoxでは全方向のランダムな方向を使い、Boxの発生位置から外向きに揃うわけではありません。

方向を変えたい場合は、発生元GameObjectのRotationを調整します。形状を調整したら、Start Speedを正の値にして、プレビューで位置と進行方向を一緒に確認してください。

<span id="cone-angle"></span>

## ConeのAngle

**Angle** は中心軸から外側へ広がる角度を度で指定します。0なら+Y方向に揃い、大きくすると広がります。

有効範囲は **0度以上、90度未満** です。Inspectorのスライダーで90が選べても、生成時の検証では90度は拒否されます。

RadiusとAngleは別の設定です。Radiusは発生する底面の広さ、Angleは初速度の広がりを変えます。細い噴射にしたい場合は両方を小さくし、広い面から平行に出したい場合はRadiusを大きく、Angleを0にします。

<span id="simulation-space"></span>

## シミュレーション空間との関係

Localでは粒子を発生元の座標で扱います。Worldでは発生時に位置と速度をワールド空間へ変換します。移動する発生元から粒子を残したい場合はWorld、発生後もオブジェクトに追従させたい場合はLocalを比較してください。

形状は生成時の条件です。生成後の進路を曲げる用途には、力やNoise、Vortexなどのモジュールを使います。

<span id="compare-shapes"></span>

## 確認の手順

最初はモジュールなし、Start Speedを1、寿命を短めにしてTypeだけを切り替えます。次にRadiusやSize、最後に速度と寿命を調整すると、形状による違いを見分けやすくなります。Sceneビューのギズモも発生領域の確認に利用できます。
