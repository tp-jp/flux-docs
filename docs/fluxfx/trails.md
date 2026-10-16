# Trails

Trailsは、移動する粒子の過去の位置を記録し、帯状の軌跡を描きます。**MODULES → Rendering → Add Module → Trails** で追加します。

<span id="settings"></span>

## 設定項目

| 項目 | 初期値 | 意味 |
| --- | --- | --- |
| Max Trails | 4096 | 記録対象とする粒子数の上限。1以上 |
| Points Per Trail | 16 | 1本の軌跡に記録する点の数。2以上 |
| Duration | 0.5 | 履歴を保持する時間。秒単位で、0より大きい値 |
| Width | 0.05 | 新しい部分の帯の幅。0以上 |
| Color | 白 | 軌跡専用の色とアルファ |

Durationは粒子の寿命とは別です。長くすると、より昔の移動経路まで表示できます。Widthが0、またはColorのアルファが0では軌跡が見えません。

<span id="display-your-first-trail"></span>

## 最初の軌跡を表示する

1. [クイックスタート](./quickstart.md)の粒子が表示される状態を用意します。
2. MainのStart Speedを1、寿命を3秒にして、粒子が移動することを確認します。
3. Trailsを追加し、Durationを0.5、Points Per Trailを16、Widthを0.05にします。
4. Colorを見やすい色にし、アルファを1にします。
5. プレビューをRestartして、移動方向の後ろに伸びる軌跡を確認します。

線分には異なる位置の記録が2点必要です。再生直後や粒子が動いていない状態では、軌跡が見えないことがあります。

<span id="length-and-smoothness"></span>

## 長さと滑らかさ

記録の基本間隔は、`Duration ÷ (Points Per Trail − 1)`秒です。初期値なら約0.033秒ごとに位置を記録します。

同じ点数でDurationだけを長くすると、記録間隔も広がります。曲がる軌跡が角張って見える場合は、Durationとのバランスを見ながらPoints Per Trailを増やします。

ただし、1回のシミュレーション更新で新しく記録する位置は最大1点です。記録間隔を更新間隔より短くしても、その間の移動を細かく補間して記録するわけではありません。

古い部分ほど幅とアルファが小さくなり、Durationに達した部分は消えます。一定速度ならDurationを長くするほど軌跡も長くなりますが、停止・加減速・曲がり方によって見た目の長さは変わります。

<span id="tracked-particles-and-lifetime"></span>

## 記録する粒子と寿命

実際の記録対象数はMainのParticle CountとMax Trailsの小さい方です。Max TrailsがParticle Countより小さい場合、粒子の格納位置から分散して対象が選ばれます。現在生きている粒子を順次選び直して、常にMax Trails本を表示する仕組みではありません。

粒子が消滅すると、その粒子の軌跡も表示されなくなります。Durationを長くしても、粒子の消滅後に残る残像にはなりません。同じ格納位置で新しい粒子が発生した場合は、以前の粒子の軌跡へつながらないよう区別されます。

<span id="differences-from-particle-appearance"></span>

## 粒子本体との見た目の違い

Trailsは専用の描画を使います。色と幅はTrailsのColorとWidthで設定し、MainのStart Color・Start SizeやColor／Size over Lifetimeには連動しません。Texture Sheet AnimationやBlinkも軌跡には適用されません。

軌跡はアルファブレンドで表示されます。粒子本体のRendererでTextureやBlend Modeを変えても、軌跡のテクスチャやブレンド設定にはなりません。

履歴はワールド座標で記録されます。Simulation SpaceがLocalでも、記録済みの点は発生元の移動に合わせて動かず、記録した場所に残ります。

<span id="bounds-and-cost"></span>

## 描画範囲と負荷

RendererのCulling Boundsは、粒子本体だけでなく軌跡も含む範囲に設定します。長い履歴や発生元の移動によって軌跡が範囲外へ伸びると、カメラの向きによって見えなくなることがあります。

Max TrailsとPoints Per Trailを増やすほど、位置履歴の保持や描画に必要なリソースが増えます。実装ではPoints Per Trailに2つを加えた数の履歴・管理用Bufferと、Points Per Trailから1つを引いた数の描画区間を用意します。粒子数だけでなく、点数も控えめな値から調整してください。

モジュールを無効にしても、構成として確保されるリソースは残ります。軌跡を使わない構成にする場合は、モジュールを削除して再生成します。

<span id="when-trails-are-missing"></span>

## 表示されないとき

- Trailsが有効で、WidthとColorのアルファが0より大きいか確認します。
- 粒子が移動し、2点以上を記録できる時間だけ生存しているか確認します。
- Durationに0を指定していないか確認します。0は生成時の検証でエラーになります。
- Max Trailsを小さくしている場合は、記録対象から外れる粒子があることを確認します。小さなParticle Countの構成で両者を同じ値にすると比較できます。
- 軌跡を含むCulling Boundsになっているか確認します。

設定変更後はプレビューをRestartし、履歴がたまってから見た目を比較してください。
