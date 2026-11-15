<span id="texture-animation-and-blinking"></span>
<span id="テクスチャアニメーションと点滅"></span>

# テクスチャアニメーション

Texture Sheet Animationはテクスチャ内のコマを切り替えます。**MODULES → Rendering → Add Module** から追加します。

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

<span id="時間とタイミング"></span>
<span id="targetとブレンド"></span>
<span id="変化しない場合"></span>
<span id="time-and-timing"></span>
<span id="target-and-blending"></span>
<span id="when-nothing-changes"></span>

<span id="blink"></span>

## 点滅はBrightnessで設定する

明るさのばらつき・明滅・点滅は[Brightness](./brightness.md)で設定します。旧Blinkの設定は[移行手順](./brightness.md#migration)を確認してください。
