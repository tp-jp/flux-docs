<span id="texture-animation-and-blinking"></span>

# テクスチャアニメーションと点滅

Texture Sheet Animationはテクスチャ内のコマを切り替え、Blinkは色やアルファを周期的に変化させます。どちらも **MODULES → Rendering → Add Module** から追加します。

## Texture Sheet Animation

同じ大きさのコマを格子状に並べた画像を、[Renderer](./renderer.md)のTextureに指定して使います。

| 項目 | 初期値 | 意味 |
| --- | --- | --- |
| Tiles X | 1 | 横方向の分割数。1以上 |
| Tiles Y | 1 | 縦方向の分割数。1以上 |
| Cycles | 1 | 粒子の寿命全体でアニメーションを繰り返す回数。0以上 |

コマは左上から右へ進み、次の行へ移ります。例えばTiles Xが4、Tiles Yが2なら、順序は次のとおりです。

```text
0 → 1 → 2 → 3
4 → 5 → 6 → 7
```

Cyclesは1秒あたりのコマ数ではありません。寿命が4秒、8コマ、Cyclesが1なら、各コマの表示時間はおおむね0.5秒です。Cyclesを2にすると、同じ寿命の間に2周します。

Cyclesが0なら最初のコマを表示します。小数も設定でき、0.5なら寿命の間に半周します。計算は周期的に先頭へ戻るため、最後のコマを固定して保持する設定ではありません。

<span id="try-an-eight-frame-image"></span>

### 8コマの画像を試す

1. 横4列・縦2行の画像をRendererのTextureへ設定します。
2. RendererのTilingを`(1, 1)`、Offsetを`(0, 0)`にします。
3. Texture Sheet AnimationのTiles Xを4、Tiles Yを2、Cyclesを1にします。
4. Mainの寿命を4秒にしてプレビューをRestartします。

RendererのTilingとOffsetはコマ選択と組み合わせて適用されます。画像の一部しか見えないときは、まず上記の値へ戻して確認します。初期値の1×1ではコマが切り替わりません。

## Blink

描画色に、Minimumから1までの明るさ・透明度の倍率を掛けます。

| 項目 | 初期値 | 意味 |
| --- | --- | --- |
| Frequency | 2 | 1秒あたりの点滅回数。0以上 |
| Duty | 0.5 | 1周期に占める明るい区間の割合。0〜1 |
| Minimum | 0 | 暗い区間の倍率。0〜1 |
| Smoothness | 0 | 明暗の境界を滑らかにする度合い。0〜1 |
| Random Phase | 0 | 粒子ごとの点滅タイミングをずらす度合い。0〜1 |
| Time Mode | SystemTime | 周期計算に使う時間 |
| Target | Alpha | 倍率を掛ける成分 |

Frequencyが2、Dutyが0.5、Smoothnessが0なら、約0.25秒ずつ明暗が切り替わります。Minimumを0.2にすると、暗い区間も元の値の20%を残します。Smoothnessを増やすと切り替わりが緩やかになります。

<span id="time-and-timing"></span>

### 時間とタイミング

| Time Mode | 挙動 |
| --- | --- |
| SystemTime | システムのシミュレーション経過時間を使う。Random Phaseが0なら同じシステム内で周期が揃う |
| ParticleAge | 各粒子の発生からの経過時間を使う。発生時刻に応じて周期がずれる |

SystemTimeは現実の時計やネットワーク共通時刻ではありません。Random Phaseを増やすと、生成ごとに決まる値を使って粒子間の位相をずらします。

<span id="target-and-blending"></span>

### Targetとブレンド

| Target | 変化する成分 |
| --- | --- |
| Rgb | RGBだけを暗くする |
| Alpha | アルファだけを下げる |
| Both | RGBとアルファの両方を下げる |

透明になって消える点滅には、まずRendererのBlend ModeをAlpha、TargetをAlphaにして試します。Rgbは色を黒に近づける処理なので、Alphaブレンドでは黒い粒子が残ることがあります。Opaqueではアルファによる透過は行われません。

BothはRGBとアルファの両方に倍率が掛かります。Additiveなど、描画時にもアルファを使うブレンドでは、Rgbだけの場合より強く暗くなることがあります。[寿命に応じた色](./lifetime-appearance.md)も使っている場合は、その色へさらにBlinkの倍率が掛かります。

<span id="when-nothing-changes"></span>

### 変化しない場合

- Frequencyが0では、点滅による減衰を行いません。
- Dutyが1では、常に倍率1です。
- Minimumが1では、明暗の差がなくなります。
- Frequencyが正でDutyが0なら、常にMinimumの倍率です。

最初はFrequencyを2、Dutyを0.5、Minimumを0、SmoothnessとRandom Phaseを0にして比較します。Blinkは粒子本体への効果で、[Trails](./trails.md)の色や透明度には反映されません。
