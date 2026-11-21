# カスタムモジュールのリファレンス {#reference}

生成エラーの切り分け、動作確認、負荷の比較は[検証と性能](./validation-and-performance.md)を参照してください。

標準のValue ID・Operation ID、依存関係、HLSLの実装規約を確認するためのページです。設計の考え方は[データと実行モデル](./data-and-execution.md)、一式の実装手順は[カスタムモジュール](./custom-modules.md)を参照してください。

## HLSLの実装規約 {#hlsl-conventions}

### ファイルと関数の登録 {#hlsl-registration}

Operationの`hlslPath`にUnityプロジェクトから参照できるHLSLのパス、`entryPoint`に関数名を指定します。ファイルを移したら登録パスも更新します。生成側はContextの型定義を出力してからHLSLをincludeするため、Contextを自分で再定義しません。

関数名・補助関数・include guardには固有の名前を付けます。Operation IDが異なっても、HLSLの関数名まで自動で別名に変換されるわけではありません。

### Operationの関数形式 {#operation-hlsl}

Operationは`void`を返し、生成されたContextを`inout`で受け取ります。CustomLiftのDefinitionと組み合わせる例です。

```hlsl
#ifndef FLUXFX_CUSTOM_LIFT_INCLUDED
#define FLUXFX_CUSTOM_LIFT_INCLUDED

void FluxFX_CustomLift(inout FluxCustomLiftContext ctx)
{
    float strength = ctx.parameterCustomLiftStrength * (0.5 + 0.5 * sin(ctx.valueStepTime * 2.0));
    ctx.valueParticleVelocity += ctx.parameterCustomLiftDirection * strength * ctx.valueStepDeltaTime;
}

#endif
```

Contextには`reads`と`writes`のValueの集合、および`parameters`のParameterが入ります。呼び出し前に入力値とParameterが設定されます。出力はContextのValueフィールドへ書き、Definitionの`writes`にも宣言します。入力フィールドやParameterを書き換えるだけでは、状態保存や設定変更にはなりません。

`Replace`と`Initialize`では出力を明示的に代入します。`Modify`では元の値を`reads`に含め、計算式を書きます。`switchable: true`では生成側がEnabledを判定し、無効時は関数を呼ばず入力を引き継ぎます。

### Contextとフィールドの名前・型 {#hlsl-names}

| 元になるID | 生成される名前 |
| --- | --- |
| Operation `custom-lift` | `FluxCustomLiftContext` |
| Value `particle.velocity` | `valueParticleVelocity` |
| Value `step.delta-time` | `valueStepDeltaTime` |
| Parameter `custom-lift.strength` | `parameterCustomLiftStrength` |

IDの`.`・`-`・`_`を区切りとして除き、各部分の先頭を大文字にします。Contextには前後に`Flux`・`Context`、フィールドには先頭に`value`または`parameter`を付けます。その他の文字はUTF-16コードに基づく表記へ変換されます。

`custom-lift`と`custom.lift`は同じContext名になります。ID自体が異なっていても、変換後のContext名やValue・Parameterのフィールド名が衝突すると生成エラーになります。正確な変換はEditor側の`FluxParticleHlslNames.Context`・`Value`・`Parameter`で確認できます。

Float・Float2・Float3・Float4はHLSLのfloat・float2・float3・float4、UIntはuintになります。ContractのBool・Enumはfloatとして渡され、意味上の制約はContractが検証します。MaterialのProperty名はContextとは別のエンコード規則なので、フィールド名と混同しないでください。

### Derived Providerの関数形式 {#derived-hlsl}

Derived ProviderはContextを受け取りません。`inputs`の宣言順でValueを受け取り、続いて`parameters`の宣言順でParameterを受け取り、Valueの型に合う結果を返します。例えばFloat入力を二乗する関数は次の形です。

```hlsl
float Example_Square(float value)
{
    return value * value;
}
```

利用するには、出力のFloat ValueとDerived Providerを登録し、Floatの入力Valueを1つ指定して`entryPoint`を`Example_Square`にします。関数だけでは登録されません。ContextのフィールドがID順に生成されることと、Providerの引数の宣言順は別です。入力やParameterのPhase制約は[Providerの説明](./data-and-execution.md#providers)を参照してください。

### 座標・時間・状態へのアクセス {#hlsl-data}

Contractが検証するのはParameterへの入力です。HLSL内でゼロ除算や不正な正規化を行って生じるNaN・Infinityまで防ぐものではありません。式の定義域を確認し、必要ならHLSL側でも条件分岐などで処理します。

`particle.position`と`particle.velocity`はシミュレーション空間の値です。Local・Worldのどちらで計算するかを揃えます。CustomLiftのDirectionは正規化されず、長さも加速度に影響します。

`step.delta-time`は更新間隔（秒）、`step.time`はシステム共通のシミュレーション時間（秒）です。粒子ごとの時間には`particle.age`を使います。加速度を速度へ積分するときは、CustomLiftのように更新間隔を掛けます。

状態のRenderTexture上の配置やチャンネルはコンパイラーが決めます。通常の粒子処理ではContextやProviderの入力を使い、Buffer配置を固定した直接参照に依存しないようにします。読み取り時点・書き込み権限は[データと実行モデル](./data-and-execution.md#reads-and-writes)で確認してください。

## 標準のValue ID {#standard-value-ids}

`step.time`や`particle.velocity`は、FluxFXが定義する**Value ID**です。`custom-lift.strength`のようにContractで宣言する**Parameter ID**とは別の種類です。ValueはOperationの`reads`・`writes`で参照し、Parameterは`parameters`で指定します。同じ文字列でも種類が違う場合があり、例えば`render.size`にはValueとParameterの両方があります。

以下の標準IDは、独自の値の名前として使わないでください。標準のValueを読むときは既存の定義を参照し、`AddValue`で再登録しません。実装は接頭辞全体を予約語として禁止する方式ではなく、登録済みの同種のIDとの重複を拒否します。独自IDには固有の接頭辞を付けます。

### Coreが定義する値 {#core-values}

FluxFXのCoreは、次の13個のValueを定義します。型名は`FluxParticleValueType`の値です。「変更可」は`SharedMutable`を表し、書き込みにはOperationの宣言と適切な処理順が必要です。

| Value ID | 型 | 用途 | カスタムOperationからの書き込み |
| --- | --- | --- | --- |
| `particle.position` | Float3 | シミュレーション空間での粒子の位置 | 変更可 |
| `particle.velocity` | Float3 | シミュレーション空間での粒子の速度 | 変更可 |
| `particle.age` | Float | 粒子の年齢（秒）。生存判定にも使う | 不可：SystemManaged |
| `particle.spawn-key` | UInt | 粒子に保持する生成キー。乱数の再現などに使う | 不可：SystemManaged |
| `particle.lifetime` | Float | 粒子の寿命（秒） | 不可：ReadOnly |
| `particle.start-color` | Float4 | 初期色（RGBA） | 不可：ReadOnly |
| `particle.start-size` | Float | 初期サイズ | 不可：ReadOnly |
| `render.size` | Float | 描画時のサイズ | 変更可 |
| `render.uv-transform` | Float4 | 描画UVの倍率（xy）とオフセット（zw） | 変更可 |
| `render.color` | Float4 | 描画時の色（RGBA） | 変更可 |
| `step.time` | Float | システム共通のシミュレーション時間（秒） | 不可：ReadOnly |
| `step.delta-time` | Float | 今回の更新間隔（秒） | 不可：ReadOnly |
| `spawn.key` | UInt | 生成時に供給されるキー | 不可：ReadOnly |

`SystemManaged`はCoreが管理する値です。カスタムモジュールからは読み取りだけに使います。`ReadOnly`の値も、Operationの`writes`には指定できません。

Valueが定義されていることと、値を供給するProviderが登録されていることは別です。`step.delta-time`と`spawn.key`、寿命・初期色・初期サイズのProviderは標準の構築処理が登録します。**`step.time`のProviderは必要とするモジュールが登録します。** CustomLiftの例と同様に、`context.Providers.ContainsKey("step.time")`で重複を避けてUniform Providerを追加します。

### 設定に応じて追加される値 {#conditional-values}

次のValueはすべての構成に存在するわけではありません。

| Value ID | 型・書き込み方針 | 追加される条件と用途 |
| --- | --- | --- |
| `emitter.row0`<br>`emitter.row1`<br>`emitter.row2` | Float4・ReadOnly | Simulation SpaceがWorld。エミッターのlocal-to-world行列の先頭3行 |
| `spawn.direction` | Float3・ReadOnly | ShapeがSphere・Hemisphere・Circle・Cone。生成方向を供給する |
| `render.rotation` | Float3・SharedMutable | Start Rotationがランダム、定数がゼロ以外、またはこのValueへ書くOperationがある。描画時の回転 |
| `particle.start-rotation` | Float3・ReadOnly | Start RotationがRandom Between Two Constants。粒子ごとの初期回転 |

標準モジュールが追加する補助Valueもあります。以下はモジュールやモードに依存するため、常に存在する共通入力としては扱いません。いずれもReadOnlyです。

| Value ID | 型 | 登録するモジュール・条件 |
| --- | --- | --- |
| `velocity-over-lifetime.center-offset` | Float3 | Velocity over Lifetime |
| `color.normalized-age`・`color.gradient` | Float・Float4 | Color over LifetimeのGradientモード |
| `size.normalized-age`・`size.curve` | Float・Float | Size over LifetimeのCurveモード |
| `rotation.normalized-age`・`rotation.curve` | Float・Float | Rotation over LifetimeのCurveモード |

独自の正規化年齢やCurve・Gradientが必要な場合は、`contribution.NormalizedAge`・`Curve`・`Gradient`へ独自IDを渡して登録できます。

### 読み取る値の時点を指定する {#value-read-versions}

Value IDだけでなく、`FluxParticleValueRead`の第2引数で読み取り方を指定します。

| ReadVersion | 用途 |
| --- | --- |
| `Provided` | Providerが供給する値。時間、寿命、初期色など。Providerの登録と、そのPhaseで利用可能な入力が必要 |
| `StepPrevious` | Updateで、更新前の粒子状態を読む。速度を更新する処理では、その前に実行されたWriterの結果を読む場合がある |
| `AfterOperation` | 同じPhase内の指定したOperationが書いた結果を読む。第3引数にOperation IDを指定する |
| `Committed` | Renderで、更新済みの粒子状態を読む |

例えばCustomLiftは`particle.velocity`を`StepPrevious`、`step.time`と`step.delta-time`を`Provided`で読みます。Valueが存在しない、Providerがない、Phaseや依存関係が合わない場合は構成のコンパイルに失敗します。

## 標準のOperation IDと実行順 {#standard-operation-ids}

Operation IDは、処理そのものを識別するIDです。Value IDやModule IDとは別で、依存関係にはこのOperation IDを指定します。例えばGravityのOperation IDは`gravity`です。同じOperation IDの重複登録はできません。以下はFluxFXの標準構成が登録する処理です。

### Coreと設定から追加される処理 {#core-operations}

| Operation ID | Phase | 役割・追加条件 |
| --- | --- | --- |
| `spawn.position` | Spawn | 粒子の位置と年齢を初期化する。Shape・Simulation Spaceに応じて実装が変わる |
| `spawn.velocity` | Spawn | 粒子の速度と生成キーを初期化する。Start Speedなどに応じて実装が変わる |
| `velocity.identity` | Update | 速度をそのまま次の状態へ渡す。速度を書くUpdate Operationが一つもない場合だけ追加される |
| `motion` | Update | 最後の速度更新結果から位置を進め、年齢を更新する |
| `render.start` | Render | 初期色から描画色を設定する |
| `render.uv-start` | Render | UV変換を倍率1・オフセット0に設定する |
| `render.size-start` | Render | 初期サイズから描画サイズを設定する |
| `render.rotation-start` | Render | 初期回転から描画回転を設定する。`render.rotation`が必要な構成で追加される |

### 標準モジュールが追加する処理 {#module-operations}

対応するモジュールを追加すると登録されます。EnabledをオフにしてもOperationは残るため、依存先としての有無はEnabledでは判断しません。

| Operation ID | Phase | モジュール・主な出力 |
| --- | --- | --- |
| `gravity` | Update | Gravity：速度 |
| `force` | Update | Force：速度 |
| `noise` | Update | Noise：速度 |
| `vortex` | Update | Vortex：速度 |
| `drag` | Update | Drag：速度 |
| `limit-velocity` | Update | Limit Velocity：速度 |
| `velocity-over-lifetime` | Update | Velocity over Lifetime：`motion`の後で位置を変更する |
| `render.color` | Render | Color over Lifetime：描画色 |
| `render.brightness` | Render | Brightness：描画色 |
| `brightness.initialize` | Spawn | Brightness：音声状態を初期化。Audio EnabledがONでIndependent Responseを使う構成のみ |
| `brightness.update` | Update | Brightness：独自の音声応答。Audio EnabledがONでIndependent Responseを使う構成のみ |
| `audio-input.initialize` | Spawn | Audio Input：入力の更新状態と応答を初期化 |
| `audio-input.update-freshness` | Update | Audio Input：入力の更新状態 |
| `audio-input.update-response` | Update | Audio Input：従来のFloat3応答 |
| `audio-input.channel.{id}.response.initialize` | Spawn | Audio Input：チャンネル応答を0に初期化 |
| `audio-input.channel.{id}.response.update` | Update | Audio Input：freshness更新後にチャンネル応答を更新 |
| `render.distance-fade` | Render | Distance Fade：描画色 |
| `render.size-over-lifetime` | Render | Size over Lifetime：描画サイズ |
| `render.rotation-over-lifetime` | Render | Rotation over Lifetime：描画回転 |
| `render.texture-sheet-animation` | Render | Texture Sheet Animation：描画UV変換 |

TrailsはこのOperation一覧には入りません。パラメーターとハンドルの対応を登録し、履歴更新・描画は別の処理で行います。また、この章で作成する`custom-lift`はサンプル独自のIDです。

### 依存関係の指定方法 {#operation-dependencies}

依存先は「自分より前に実行する処理」です。`A`に`B`への依存を指定すると、実行順は`B → A`になります。通常の`dependencies`と`AfterOperation`は同じPhase内の処理を指定します。Spawn・Update・Renderをまたぐ依存は指定できません。

<div class="development-figure">
  <a class="diagram-light" href="../diagrams/fluxfx-dependency-reads-ja-light.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-dependency-reads-ja-light.svg" alt="custom-positionがmotionへ依存するとmotionが先に実行されます。AfterOperationではmotionが書いた位置を読み、必須依存も追加されます。" width="480" height="580" /></a>
  <a class="diagram-dark" href="../diagrams/fluxfx-dependency-reads-ja-dark.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-dependency-reads-ja-dark.svg" alt="custom-positionがmotionへ依存するとmotionが先に実行されます。AfterOperationではmotionが書いた位置を読み、必須依存も追加されます。" width="480" height="580" /></a>
</div>

図の`custom-position`は説明用のOperation IDです。矢印は先行処理から後続処理への向きです。下段では値の受け渡しも表し、`contribution.Operation`が`AfterOperation`から必須依存を追加します。

| 指定方法 | 意味・使いどころ |
| --- | --- |
| `dependencies: new[] { "motion" }` | 必須の先行処理。順序を指定するだけで、読み取るValueは別途宣言する。対象がないとエラー |
| `new FluxParticleValueRead("particle.position", FluxParticleReadVersion.AfterOperation, "motion")` | `motion`が書いた位置を読む。`contribution.Operation`はこの読み取りから必須依存も追加する |
| `optionalDependencies: new[] { "gravity", "force" }` | 対象が存在する場合のWriter順序制約。現在は後述する速度・描画色の更新処理に限って解決される |

`AfterOperation`では、指定した処理がそのValueを書いている必要があります。独自Operationに名前を付けただけでは順序は決まりません。Inspectorでの追加順、Stage、IDの名前順に頼らず、必要な依存関係を宣言します。

### 自動的に順序が決まる処理 {#operation-pipelines}

標準のビルド処理は、**Updateの`particle.velocity`**と**Renderの`render.color`**について、Writer間の順序を解決します。`optionalDependencies`は、依存元・依存先の両方が同じ値を更新するWriterである場合だけ使われます。別のValueへの書き込みや別PhaseのOperationを指定しても、この指定では順序は付きません。

標準モジュールがすべて存在する場合の主な順序は次のとおりです。省略したモジュールは列から外れます。

<div class="development-figure">
  <a class="diagram-light" href="../diagrams/fluxfx-standard-pipelines-ja-light.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-standard-pipelines-ja-light.svg" alt="Updateでは標準の速度Writerの結果がmotionへ渡り、Velocity over Lifetimeがその後で位置を変更します。別PhaseのRenderではrender.start、render.color、render.brightnessの順に描画色を渡します。" width="480" height="662" /></a>
  <a class="diagram-dark" href="../diagrams/fluxfx-standard-pipelines-ja-dark.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-standard-pipelines-ja-dark.svg" alt="Updateでは標準の速度Writerの結果がmotionへ渡り、Velocity over Lifetimeがその後で位置を変更します。別PhaseのRenderではrender.start、render.color、render.brightnessの順に描画色を渡します。" width="480" height="662" /></a>
</div>

速度の最後のWriterの結果は`motion`へ渡されます。速度Writerがなければ`velocity.identity → motion`になります。描画サイズ・回転・UVの処理は、それぞれの`render.*-start`への必須依存で接続されます。これらと描画色の列の間に一律の実行順があるわけではありません。

速度・描画色の列では、各Writerの入力が直前のWriterの結果へ接続し直されます。例えばBrightnessは`render.start`を読む宣言ですが、Color over Lifetimeもある場合はその結果を受け取ります。一方、任意のValueで同じ自動接続が行われるわけではありません。

### カスタム処理の順序を決める例 {#custom-operation-order}

CustomLiftの例では、標準の速度Writerをすべて`optionalDependencies`に指定しています。結果は`… → limit-velocity → custom-lift → motion`となり、CustomLiftで追加した速度も位置の更新に使われます。ただし、その追加分には同じ更新のDragやLimit Velocityは適用されません。

<div class="development-figure">
  <a class="diagram-light" href="../diagrams/fluxfx-custom-order-ja-light.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-custom-order-ja-light.svg" alt="標準の速度WriterがあればCustomLiftはその後、motionの前に入ります。標準WriterがなくてもCustomLiftからmotionへ速度を渡します。" width="480" height="618" /></a>
  <a class="diagram-dark" href="../diagrams/fluxfx-custom-order-ja-dark.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-custom-order-ja-dark.svg" alt="標準の速度WriterがあればCustomLiftはその後、motionの前に入ります。標準WriterがなくてもCustomLiftからmotionへ速度を渡します。" width="480" height="618" /></a>
</div>

下段はCustomLift以外に速度Writerがない構成です。`optionalDependencies`の対象が存在しなくてもCustomLiftは登録されます。Enabledをオフにしただけでは対象Operationはなくなりません。

別のカスタム速度WriterをCustomLiftの後に置く場合は、そのOperationに`dependencies: new[] { "custom-lift" }`を指定できます。この場合はCustomLiftも必須です。CustomLiftがない構成も許可するなら、`optionalDependencies`に`custom-lift`を加え、標準の速度Writerとの順序も明示します。

位置を`motion`の後に変更する処理では、上表の`AfterOperation`で`particle.position`を読み、同じValueを書きます。Velocity over Lifetimeも使うなら、その処理との前後関係も指定してください。位置の処理には`optionalDependencies`による自動接続はありません。

同じPhaseで同じValueを書く複数の処理には、互いの順序が必要です。順序が一意に決まらない、依存が循環する、必須の対象がない場合はエラーになります。`render.intensity`はParameterであり、Operationの依存先には指定できません。Intensityは描画シェーダーで[Intensity Mask](./renderer.md#intensity-mask)に応じてRGBへ適用されます。


## Audio InputとDistance Fadeの接続 {#input-appearance}

### 追加されるID {#input-appearance-ids}

| 種類 | ID | 型・Phase・用途 |
| --- | --- | --- |
| Module | `tplab.fluxfx.audio-input` | Audio Input |
| Module | `tplab.fluxfx.distance-fade` | Distance Fade |
| Value | `audio-input.raw-bands` | Float4・ReadOnly。AudioLinkの未加工4帯域。内部の共有入力 |
| Value | `audio-input.frame` | Float・ReadOnly。更新カウンター。未取得は-1 |
| Value | `audio-input.bands` | Float4・ReadOnly。共通入力処理後、平滑化前の4帯域 |
| Value | `audio-input.sample` | Float3・ReadOnly。Derived Providerが供給する入力と更新カウンター |
| Value | `audio-input.freshness` | Float2・OwnerManaged。前回の更新カウンターと、入力が更新されていない時間 |
| Value | `audio-input.response` | Float3・OwnerManaged。外部モジュールが読む平滑化した応答 |
| Operation | `audio-input.initialize` | Spawn。freshnessを(-1, 0)、responseを0に初期化 |
| Operation | `audio-input.update-freshness` | Update。入力の更新状態を計算 |
| Operation | `audio-input.update-response` | Update。freshness更新後に応答を計算 |
| Operation | `render.distance-fade` | Render。render.colorのRGBまたはAlphaへ距離係数を掛ける |

これらは対応モジュールを追加した構成にだけ存在します。Audio Inputが所有する状態へ、利用側から書き込まないでください。平滑化済みの応答にはRead／ReadChannel、独自の応答にはReadBands／ReadSample／ReadFreshnessの公開契約を使います。

Parameter IDはDistance Fadeが`distance-fade.start-distance`、`distance-fade.end-distance`、`distance-fade.target`、`distance-fade.enabled`です。Audio Inputは`audio-input.`にband、gain、noise-floor、strength、attack、release、slow-response、average-gain、timeout、enabledを続けたIDです。いずれもLiveです。設定値の範囲は[Distance Fade](./distance-fade.md)と[Audio Input](./audio-input.md)を参照してください。

### 音声応答を読む {#audio-response-read}

利用側のDefinitionでは`TpLab.Flux.FX.Editor.Modules.AudioInput`の`FluxParticleAudioInputOutputs`を使います。通常の利用側がAudioLinkテクスチャを直接読み直す必要はありません。

| 契約 | 型と内容 | 読み取り |
| --- | --- | --- |
| `ReadBands()` | Float4。xyzw＝Bass／Low Mid／High Mid／Treble。共通処理後、未平滑化 | Provided |
| `ReadSample()` | Float3。x＝Bandで選んだ帯域、y＝4帯域平均、z＝更新カウンター（未取得は-1） | Provided |
| `ReadFreshness()` | Float2。x＝最後のカウンター、y＝変化がない秒数 | Updateでaudio-input.update-freshnessのAfterOperation |
| `ReadChannel(id, phase)` | 指定した固定IDの平滑化済みFloat応答 | UpdateはChannelUpdate(id)のAfterOperation、RenderはCommitted |
| `Read(phase)` | 従来のFloat3応答。x＝選択帯域の速い応答、y＝その遅い応答、z＝平均の応答 | Updateはaudio-input.update-responseのAfterOperation、RenderはCommitted |

Read／ReadChannelをOperationの`reads`へ渡すと、Updateでは当該Stepの応答更新後に読む依存関係も宣言されます。Renderでは確定済みの応答を読みます。UpdateのOperationをRenderのdependenciesへ指定しないでください。Spawnを渡すと例外になり、応答状態自体はSpawnで0へ初期化されます。

同じSystemへAudio Inputを追加し、ReadChannelでは対応するチャンネルも作成してください。読み取り宣言だけでは自動追加しません。存在しないIDはビルドエラーで、他のチャンネルへ置き換えません。

独自の応答を計算するUpdate処理では、未平滑化のReadBands／ReadSampleとReadFreshnessを使い、Audio InputのEnabled、カウンターが0以上、未更新時間がTimeout未満という条件を合わせて確認します。BandsにはGain・Noise Floor・Strength、Sampleの平均にはAverage Gainも適用済みです。平均は未加工の4帯域から求めてから共通処理を行うため、Bandsの4成分の平均とは一致しない場合があります。

ReadBands／ReadSample自体はEnabledやTimeoutを判定しません。無効化中や更新停止中にも入力値が残る場合があるため、値が0かどうかだけで有効性を判断しないでください。ReadFreshnessはUpdate用であり、RenderやSpawnのreadsには渡しません。

生成されるHLSLでは、従来の応答は`ctx.valueAudioInputResponse`、4帯域は`ctx.valueAudioInputBands`です。利用側は対象Valueのreads・writesと他Writerとの順序も宣言します。Audio Inputの所有状態へ書き込まず、独自の応答状態は利用側が所有してください。

### チャンネルごとのID {#audio-channel-ids}

`{id}`はInspectorに表示される完全なChannel IDです。表示名や配列番号ではありません。空・重複・小文字ASCII英数字以外を含むChannel IDは拒否されます。Parameter IDは`audio-input.channel.{id}.`にsource、gain、attack、releaseを続けた文字列です。

| 種類 | IDまたは生成用API | 意味 |
| --- | --- | --- |
| Value | `ChannelSample(id)` → `audio-input.channel.{id}.sample` | Float・ReadOnly。固有Gain適用後、未平滑化の入力 |
| Value | `ChannelResponse(id)` → `audio-input.channel.{id}.response` | Float・OwnerManaged。Audio Inputが管理する平滑化済み応答 |
| Operation | `audio-input.channel.{id}.response.initialize` | Spawn。チャンネル応答を0に初期化 |
| Operation | `ChannelUpdate(id)` → `audio-input.channel.{id}.response.update` | Update。freshness更新後に応答を更新 |

チャンネルのParameterはいずれもLiveで、契約は`FluxParticleAudioChannelContract(id)`で取得します。ChannelSample／ChannelResponse／ChannelUpdateはFluxParticleAudioInputOutputsのメソッドです。各チャンネルは独立してfreshness更新後に処理され、従来のresponseや別チャンネルとの順序は指定しません。応答更新後に読む必要がある利用側はReadChannelを使います。設定範囲とRuntime APIは[Audio Input](./audio-input.md#runtime)を参照してください。

### 距離フェードと色処理の順序 {#distance-fade-order}

Distance Fadeは、登録時に存在するRender Phaseのrender.color Writerと、`render.color`を任意の先行Operationとして集めます。独自の色処理はDistance Fadeより先に登録し、処理順を確認してください。後から追加した独自Writerまで自動検出するわけではありません。

上の図は標準モジュールの基本的な処理順序を示しています。Distance Fadeを含む構成では、その前に登録した色処理の後へ`render.distance-fade`が続きます。

独自の処理で密度などを取得するために、生成されたRenderプログラムを利用する場合、include前の`FLUXFX_INTRINSIC_RENDER`定義により距離フェードが省略されます。共通HLSL `Runtime/Shaders/DistanceFade.hlsl`を別の描画処理から呼ぶ場合は、元のSystemの原点と、親を含む一様スケールの倍率を渡してください。

## Brightnessの契約 {#brightness}

Module IDは`tplab.fluxfx.brightness`です。Parameter IDは`brightness.`にbase-minimum、base-maximum、waveform、period、period-minimum、period-maximum、random-phase、time-mode、minimum、maximum、duty、smoothness、target、audio-boost、audio-attack、audio-release、audio-source、enabledを続けた値です。Audio EnabledとAudio ChannelはAuthoringの構築時設定で、RuntimeのParameterスイッチではありません。

`brightness.audio`はFloatのValueですが、選択した音声方式によって所有権とProviderが変わります。

| 構成 | brightness.audio | Spawn／Update | Renderでの読み取り |
| --- | --- | --- | --- |
| Audio EnabledがON、Independent Response | OwnerManaged | brightness.initialize／brightness.updateを追加 | Committed |
| Audio EnabledがON、チャンネル選択 | ReadOnly。チャンネルのresponseを返すDerived Provider | Brightness自身の音声状態・更新は追加しない | Provided |
| Audio EnabledがOFF | ReadOnly。0を返すDerived Provider | Brightness自身の音声状態・更新は追加しない | Provided |

独立した応答では[ReadSample・ReadBands・ReadFreshness](#audio-response-read)を使います。Audio SourceがAverageならsample.y、それ以外はbandsの対応成分を読み、BrightnessのAudio Attack／Releaseで更新します。brightness.initializeはSpawnで0に初期化し、brightness.updateはfreshness更新後に実行します。従来のaudio-input.update-responseとの順序は指定しません。Brightnessを無効にしても、独立した応答を減衰させるUpdateは続きます。

チャンネル選択時は、指定したChannelResponseをDerived Providerでそのまま返します。BrightnessのAudio Attack／Releaseを再適用しません。チャンネルの更新はAudio Inputが管理し、Brightnessを無効にしても継続します。

`render.brightness`はRenderで倍率を適用します。登録時に存在するRenderの色Writerとrender.colorを任意の先行処理として集めるため、独自の色処理は先に登録してください。旧render.blinkは廃止されているため、[移行](./brightness.md#migration)を確認してください。
