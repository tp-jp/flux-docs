# Main

Mainでは、粒子の容量、再生条件、生成時の初期値を設定します。発生頻度は[Emission](./emission.md)、方向と発生領域は[Shape](./shape.md)で指定します。

<span id="capacity-and-simulation-space"></span>

## 容量とシミュレーション空間

| 項目 | 意味 |
| --- | --- |
| Particle Count | 確保する粒子スロット数。1以上を指定する |
| Simulation Space | LocalまたはWorldを選択する |

Particle Countは生存粒子数や毎秒の発生数ではありません。一定の寿命で連続発生させる場合、`Rate over Time × Start Lifetime`が同時に存在する粒子数の目安になります。例えば毎秒8個、寿命3秒なら約24個です。Burstや寿命のばらつきがある場合は余裕も考慮します。

容量の技術的上限はGPUや描画Meshによって変わります。大きくするほど使用するリソースも増えるので、必要な規模から調整してください。

| 空間 | 動作 |
| --- | --- |
| Local | オブジェクトのローカル座標で粒子を扱う。生成済み粒子もオブジェクトの移動・回転に追従する |
| World | 発生時の位置・速度をワールド空間へ変換する。発生元を移動しても、生成済み粒子は元のワールド位置から動き続ける |

まずScaleを`(1, 1, 1)`にして比較すると違いを確認しやすくなります。Worldでも描画範囲の指定はRendererローカルなので、[Culling Bounds](./renderer.md#描画範囲を設定する)も確認してください。

<span id="playback-settings"></span>

## 再生条件

| 項目 | 意味 |
| --- | --- |
| Play On Awake | 実行開始時に自動で再生する |
| Start Delay | 発生開始までの待機秒数。0以上 |
| Duration | 1周期の発生時間。0.01秒以上 |
| Loop | 発生周期を繰り返す |

Durationは粒子1個の寿命ではありません。LoopをオフにするとDuration経過後は新しい粒子の発生が終わりますが、生成済み粒子は寿命まで更新されます。

Start Delayは開始時の待機です。ループのたびに繰り返す待機時間ではありません。周期とBurstの組み合わせは[Emission](./emission.md#周期と開始遅延)で説明します。

<span id="initial-particle-values"></span>

## 生成時の初期値

| 項目 | 意味 |
| --- | --- |
| Start Lifetime | 寿命を秒で指定する |
| Start Speed | 初速度の大きさ。方向はShapeに従う |
| Start Color | 初期色とAlpha |
| Start Size | 描画形状に掛ける初期サイズの倍率 |
| Start Rotation | 初期回転を度で指定する |

Lifetime、Speed、Sizeには0以上の値を使います。LifetimeやSizeが0では表示を確認しにくいため、最初は寿命3、サイズ0.1など正の値で試してください。Speedを0にすると初速度はなくなりますが、後から追加した力などのモジュールで動かすことはできます。

初期値の後に寿命に応じた変化を付けるには、Color／Size／Rotation over Lifetimeなどのモジュールを使います。

Start Sizeはワールド単位の直径ではありません。Billboardの基準の板は一辺0.1なので、Scaleが`(1, 1, 1)`でStart Sizeが1なら一辺0.1、0.1なら一辺0.01です。Meshでは元Meshの頂点座標へ倍率を掛けます。

<span id="constant-values-and-random-ranges"></span>

## Constantとランダム範囲

各初期値のModeには、次の2種類があります。

| Mode | 設定 |
| --- | --- |
| Constant | すべての粒子に同じ値を使う |
| Random Between Two Constants | MinとMaxの2つの値の間から、粒子ごとの値を決める |

例えばStart Lifetime Minを1、Maxを3にすると、寿命にばらつきを付けられます。Start Colorのランダム設定は、2色の間を補間した色になります。RGBAを無関係に組み合わせる方式ではありません。

回転はBillboardではZ軸のみ対応します。MeshではXYZを設定できます。MeshからBillboardへ切り替えたときにXやYの回転が残っていたら、0へ戻してください。ランダム回転の場合はMinとMaxの両方を確認します。

<span id="adjustment-examples"></span>

## 調整例

毎秒8個を生成する設定で、寿命を3秒から1秒にすると、早く消えて密度が下がります。速度を1から2にすると、同じ寿命でも遠くへ移動します。粒子を増やしたい場合は、容量だけを増やすのではなくEmissionも調整してください。
