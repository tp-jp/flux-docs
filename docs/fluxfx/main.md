# Main

FluxParticleAuthoringのMainで、粒子の容量、Systemの追従、再生条件、生成時の初期値を設定します。Particle CountとPlay On AwakeもAuthoringに保存され、Play開始・ビルド時にSystemへベイクされます。発生頻度は[Emission](./emission.md)、方向と発生領域は[Shape](./shape.md)で指定します。

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

## Systemの追従（System Follow） {#system-follow}

System Followは、FluxParticleSystemのGameObjectを指定対象へ追従させる共通設定です。雪や雨など、ローカルプレイヤーの周囲で発生し続ける演出に使えます。通常のModuleではなく、**FluxParticleAuthoring → Main → System Follow** で設定します。

| 英語UI | 日本語UI・意味 | 既定 |
| --- | --- | --- |
| System Follow | Systemの追従。追従先を選ぶ | OFF |
| Follow Transform | 追従先Transform。Specified Transformで表示する | 未指定 |
| Follow Offset | 追従位置のオフセット | `(0, 0, 0)` |
| Follow Offset Space | オフセットの座標系 | World |
| Follow Rotation | 回転の追従 | None |

| 追従先 | 動作 |
| --- | --- |
| OFF | 追従しない。System Follow追加前のデータもこの設定として扱う |
| Local Player Position（ローカルプレイヤーの位置） | ローカルプレイヤーの基準位置へ追従する |
| Local Player Head（ローカルプレイヤーの頭部） | 頭部トラッキング位置へ追従する |
| Specified Transform（指定Transform） | Follow Transformへ追従する。System自身やその子孫は指定できない |

Specified Transformでは、MainのFollow Transformの指定が必須です。未指定やSystem自身・子孫を指定した状態では、Preview・Play・ビルド用の構成生成がエラーになります。Preview専用の追従先を選んでも、この設定の代わりにはなりません。

### オフセットと回転 {#follow-offset-and-rotation}

Follow Offset Spaceが **World（ワールド）** ならワールド軸を基準にオフセットを加え、**Target Rotation（追従先の向き）** なら追従先の向きを基準に加えます。追従先のScaleはオフセットに適用しません。

| Follow Rotation | 動作 |
| --- | --- |
| None（なし） | Systemの回転を維持する |
| Horizontal Only（水平回転のみ） | 水平の向きだけ追従する |
| Full Rotation（全回転） | 傾きを含めて追従する |

オフセットの座標系と回転追従は別設定です。例えば、Follow Offset SpaceをTarget Rotation、Follow RotationをNoneにすると、Systemの回転を維持しながら、追従先の向きに応じた位置オフセットを使えます。

### 実行時の動作 {#follow-runtime}

- SystemのGameObjectが動くため、子オブジェクトも移動します。追従先のScaleはコピーしません。
- Simulation Spaceが **World** なら、発生済み粒子はSystemの移動に連れて移動しません。**Local** なら、発生済み粒子もSystemとともに移動します。
- 実行開始後、初めて追従先を取得できるまでは、発生・シミュレーションを待機します。一度取得した後に対象が失われても、そのことによってシミュレーションは停止せず、最後の位置・回転と現在の再生状態を維持します。
- `Pause()`中は粒子の発生・シミュレーションが止まりますが、Systemの追従は続きます。更新順は[全体構成](./architecture.md#runtime)を参照してください。
- ローカルプレイヤー追従は各クライアントで動作します。System Follow自体はネットワーク同期を追加しません。

追従設定はPlay開始前にAuthoringで行います。追従設定を変更するUdon Runtime APIはありません。

**Culling BoundsもSystemとともに移動します。** World空間に残った粒子やTrailsを覆う範囲を[Renderer](./renderer.md#描画範囲を設定する)で設定してください。Boundsの自動拡張や、粒子を周囲へ循環配置する処理は行いません。

### 設定例：プレイヤーの周囲に降る雪 {#follow-snow-example}

1. 雪の発生・落下を設定したSystemを用意します。初めて使う場合は[クイックスタート](./quickstart.md)から始めてください。
2. MainのSimulation Spaceを **World** にします。
3. System Followを **Local Player Position** にします。
4. Follow Offset Spaceを **World** にし、Follow OffsetのYを調整して発生位置を上方へ移します。Follow Rotationは **None** にします。
5. [Previewを再生](./inspector-preview.md#preview-follow)し、まず **Fixed at Placement（配置位置で固定）** で発生範囲を調整します。
6. **Follow Scene Camera（Sceneカメラに追従）** に切り替え、Sceneカメラを動かして発生を確認します。
7. **Freeze Follow Position（追従位置を固定）** を押し、カメラを離して粒子やTrailsを観察します。
8. Systemの移動前に発生した粒子も覆うように、Culling Boundsを調整します。

発生範囲・寿命・落下速度・プレイヤーの移動速度に合わせて調整してください。

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
