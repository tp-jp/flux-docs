<span id="module-basics"></span>

# モジュールの基本

モジュールは、粒子の基本設定に動きや見た目の変化を追加する機能です。Prefabのルートを選び、FluxParticleSystemのInspectorにある **MODULES** から設定します。

<span id="add-and-adjust-a-module"></span>

## 追加して調整する

1. Play Modeを終了し、対象のInspectorを開きます。
2. MODULES内の処理グループを開きます。
3. **Add Module** から追加するモジュールを選びます。
4. 追加したモジュールの項目を編集し、[プレビュー](./inspector-preview.md)をRestartして比較します。

同じ種類のモジュールを複数追加することはできません。追加済みの種類は追加メニューから除かれます。最初は1つずつ追加すると、どの設定が見た目を変えたか把握しやすくなります。

<span id="processing-groups"></span>

## 処理グループ

| グループ | 標準モジュール | 主な役割 |
| --- | --- | --- |
| Velocity Update | Gravity、Force、Noise、Vortex、Drag、Limit Velocity | 保存される速度を更新する |
| Position Update | Velocity over Lifetime | 通常の移動に追加の移動量を与える |
| Rendering | Color・Size・Rotation over Lifetime、Texture Sheet Animation、Blink、Trails | 描画時の見た目や軌跡を設定する |

登録されたモジュールに応じて、Spawnなど別のグループが表示される場合もあります。

<span id="disable-or-remove"></span>

## 無効化と削除

モジュールの有効状態をオフにすると、その設定を残したまま効果を比較できます。削除する場合はモジュールの削除メニューから **Remove Module** を選びます。

無効化は削除と同じではありません。モジュールが組み込まれた構成と設定は残ります。負荷やリソース構成を比較する場合は、削除した状態も確認してください。

Missing Moduleや未対応モジュールの警告が出る場合は、無効化だけではビルド可能になりません。対応する定義を揃えるか、該当モジュールを削除します。

<span id="combining-modules-and-execution-order"></span>

## 組み合わせと処理順序

移動に関わる標準モジュールをすべて追加すると、次の順に処理されます。

```text
Gravity → Force → Noise → Vortex → Drag → Limit Velocity
                                      ↓
                         更新した速度で通常の移動
                                      ↓
                         Velocity over Lifetimeの移動
```

順序はモジュール定義の依存関係で決まります。追加した順番を変えて計算順を入れ替える操作ではありません。

例えばGravityで加速してからDragで減衰し、最後にLimit Velocityで速度の大きさを制限します。Velocity over Lifetimeは位置へ追加する別の処理なので、その移動分はDragやLimit Velocityの対象になりません。

<span id="coordinate-reference"></span>

## 座標の基準

力・速度・中心位置のベクトルは、粒子のシミュレーション空間を基準に設定します。Localではローカル座標、Worldではワールド座標です。これらのモジュールごとに別の空間を選択する項目はありません。Trailsの履歴は、Simulation Spaceにかかわらずワールド座標で記録されます。

例えばWorldでVortexのCenterを`(0, 0, 0)`にすると、基準はワールド原点です。発生元の位置に自動追従する中心だと考えず、[Simulation Space](./main.md#容量とシミュレーション空間)と一緒に確認してください。

<span id="next-steps"></span>

## 次に読む

- [力と速度](./forces.md)：一定の加速、減速、速度上限
- [動きの変化](./motion.md)：揺らぎ、渦、寿命に応じた移動
- [寿命に応じた見た目](./lifetime-appearance.md)：色・サイズ・回転の変化
- [テクスチャアニメーションと点滅](./texture-animation-blink.md)：コマの切り替えと周期的な明暗
- [Trails](./trails.md)：移動経路の記録と軌跡の表示
- [カスタムモジュール](./custom-modules.md)：C#とHLSLによる独自モジュールの作成
