<span id="appearance-over-lifetime"></span>

# 寿命に応じた見た目

Color over Lifetime、Size over Lifetime、Rotation over Lifetimeは、粒子が生まれてから消えるまでの色・サイズ・角度を変えます。Inspectorの **MODULES → Rendering → Add Module** から追加します。

<span id="lifetime-progress"></span>

## 寿命の進み具合

これらのモジュールは、粒子の年齢を寿命で割った0〜1の進行度を使います。0が発生時、1が寿命の終わりです。システム全体の再生時間ではないため、後から生まれた粒子も自分の寿命に沿って変化します。

GradientとCurveの横軸も0〜1です。例えば寿命が4秒なら、横軸0.5は発生から2秒後に対応します。

## Color over Lifetime

MainのStart Colorを基準に、描画する色を変えます。

| 項目 | 初期値 | 意味 |
| --- | --- | --- |
| Mode | Linear | LinearまたはGradientを選ぶ |
| End Color | 白 | Linearで寿命の終わりに近づく色 |
| Gradient | Unityの新規Gradient | Gradientモードで初期色に掛ける色とアルファ |

**Linear**ではStart ColorからEnd Colorへ線形補間します。例えばStart Colorをオレンジ、End Colorを赤にすると、寿命の後半ほど赤に近づきます。

**Gradient**ではStart ColorにGradientの値を掛けます。Gradientで指定した色をそのまま表示したい場合は、Start Colorを白、アルファを1にします。Start Colorが黒なら、Gradientを明るくしてもRGBは黒のままです。

フェードアウトさせるには、Gradientのアルファを横軸0で1、横軸1で0に設定します。LinearでもEnd Colorのアルファを0にできます。透明度の見え方は[Rendererのブレンド](./renderer.md)に依存し、Opaqueではアルファによる透過は行われません。

## Size over Lifetime

MainのStart Sizeを基準にサイズを変えます。

| 項目 | 初期値 | 意味 |
| --- | --- | --- |
| Mode | Linear | LinearまたはCurveを選ぶ |
| End Size | 0 | Linearで寿命の終わりに近づくサイズ。0以上 |
| Curve | 全期間で1 | Curveモードで初期サイズに掛ける倍率 |

**Linear**ではStart SizeからEnd Sizeへ線形補間します。初期状態のEnd Sizeは0なので、追加すると寿命に沿って小さくなります。

**Curve**はStart Sizeへの倍率です。Start Sizeが0.2でCurveが2なら、描画形状に掛けるサイズの値は0.4になります。ワールド単位の幅が0.4になるという意味ではありません。基準形状との関係は[Main](./main.md#生成時の初期値)を参照してください。計算後のサイズは0以上に制限されます。

発生直後に膨らんでから縮む粒子なら、Curveを横軸0で0、0.2で1、1で0に設定して試します。Start Sizeが0の場合は、倍率を増やしても大きくなりません。

## Rotation over Lifetime

MainのStart Rotationに、寿命に応じた回転角を加えます。

| 項目 | 初期値 | 意味 |
| --- | --- | --- |
| Mode | Linear | LinearまたはCurveを選ぶ |
| End Rotation | `(0, 0, 0)` | 初期角度に加える各軸の角度。単位は度 |
| Curve | 0から1へ直線 | Curveモードで追加角度に掛ける倍率 |

**Linear**では、End Rotationに寿命の進行度を掛けて加算します。End Rotationは絶対的な最終角度ではありません。例えばStart RotationのZが30、End RotationのZが90なら、Z角度は30度から120度へ近づきます。

**Curve**では、End RotationにCurveの値を掛けて加算します。Curveを0から1へ設定すると指定角度まで回り、0から1を経て0に戻すと初期角度へ戻ります。毎秒の回転速度を指定する項目ではありません。

::: warning BillboardではZ軸だけを使います
BillboardではEnd RotationのXとYを0にしてください。XまたはYに値を入れると生成時の検証でエラーになります。Meshでは各軸の回転を設定できます。
:::

<span id="try-the-modules-together"></span>

## 組み合わせて試す

1. Mainで寿命を3秒、Start Colorを白、Start Sizeを0.2にします。
2. Color over LifetimeをGradientにし、終端のアルファを0にします。
3. Size over LifetimeをLinear、End Sizeを0にします。
4. BillboardならRotation over LifetimeをLinear、End Rotationを`(0, 0, 180)`にします。
5. プレビューをRestartし、回転しながら縮んで消える様子を確認します。

CurveとGradientは生成時にテクスチャへ変換して評価されます。細かい変化を詰め込みすぎず、実際のプレビューで補間後の見た目を確認してください。粒子本体と[Trails](./trails.md)の色・幅は別の設定です。
