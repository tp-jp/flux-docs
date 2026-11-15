# Distance Fade

カメラがシステムから離れるにつれて描画を薄くします。Authoring Inspectorの **Modules → Rendering → Add Module → Distance Fade** で追加します。粒子を削除したり、シミュレーションを停止したりする機能ではありません。

## 設定 {#settings}

| 項目 | 初期値 | 意味 |
| --- | --- | --- |
| Start Distance | 5 | フェードを開始する距離。0以上 |
| End Distance | 10 | フェードが完了する距離。0以上 |
| Target | Rgb | RGBの明るさ、またはAlphaの不透明度を減衰させる |

Start Distance以下では係数1、End Distance以上では0になり、その間をsmoothstepで滑らかにつなぎます。**End DistanceがStart Distance以下ならフェードしません。**

距離はシステム原点からカメラまでを測り、親オブジェクトの影響を含むScaleの倍率で割って求めます。XYZ軸の倍率が等しい一様スケールに対応し、粒子ごとの位置は使いません。例えば、親を含めたScaleが`(2, 2, 2)`なら、初期値の開始・終了距離はワールド座標で10・20の距離に相当します。XYZ軸で倍率が異なるスケールには対応していません。

Targetは[Rendererのブレンド](./renderer.md)に合わせて選びます。RgbはRGBだけ、AlphaはAlphaだけを減衰させます。Alphaを下げても、Alphaを使わないブレンドでは消えません。

## 試す {#try-it}

1. [クイックスタート](./quickstart.md)で粒子が表示できる状態にしたSystemへ追加します。ここでは距離を確認しやすくするため、Systemと親オブジェクトのScaleをすべて`(1, 1, 1)`にします。
2. Start Distanceを5、End Distanceを10に設定し、ブレンドに合うTargetを選びます。
3. 透視投影のSceneビューでPreviewを再生し、カメラをシステム原点から遠ざけます。

正投影カメラではフェードしません。ステレオ描画では左右の目の中点をカメラ位置として使います。透明になっても粒子の更新や描画処理の削減は保証されないため、負荷対策として停止やカリングの代わりに使わないでください。

## Runtimeから変更する {#runtime}

`target.Modules.DistanceFade`から取得します。拡張メソッドの名前空間は`TpLab.Flux.FX.Udon.Modules`、Targetのenumは`TpLab.Flux.FX.Udon.FluxParticleDistanceFadeTarget`です。

| 取得／変更 | 対象 |
| --- | --- |
| GetStartDistance / SetStartDistance | 開始距離 |
| GetEndDistance / SetEndDistance | 終了距離 |
| GetTarget / SetTarget | RgbまたはAlpha |
| GetEnabled / SetEnabled | 有効状態 |

すべてLive変更に対応し、Authoring Inspectorの対応項目もPlay中に編集できます。保存する初期設定はPlayを終了して変更します。共通のnull確認・変更結果の確認は[Runtime API](./runtime-parameters.md)を参照してください。

独自の色処理との組み合わせは[リファレンス](./custom-module-reference.md#input-appearance)を参照してください。
