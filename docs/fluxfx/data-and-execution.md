# データと実行モデル {#data-and-execution}

カスタムモジュールでは、計算式に加えて「いつ実行するか」「何を保存するか」「どの値を読むか」を宣言します。このページでは、[全体構成](./architecture.md)を前提に、その設計と検証ルールを説明します。ファイル一式の作成手順は[カスタムモジュール](./custom-modules.md)を参照してください。

## 最初に決めること {#design}

| 設計すること | 選択する仕組み |
| --- | --- |
| 生成時・更新時・描画時のどこで計算するか | OperationのPhase |
| 粒子ごとに結果を次の更新へ残すか | Spawnで初期化する状態Value |
| 入力からその都度計算できるか | Providerが供給するValue |
| 利用者が設定・変更する値か | Contractで宣言するParameter |
| 他の処理の結果を使うか | ReadVersionとOperationの依存関係 |

例えばCustomLiftでは、強さと方向をParameterにし、既存の状態Valueである速度をUpdateで変更します。時間はProviderから読みます。独自の状態Valueを追加する必要はありません。

## Phaseと粒子のライフサイクル {#phases}

<div class="development-figure">
  <a class="diagram-light" href="../diagrams/fluxfx-phase-flow-ja-light.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-phase-flow-ja-light.svg" alt="今回生成する粒子はSpawn、それ以外の生存粒子はUpdateで状態を更新します。保存した状態を次の更新やRenderで読みます。" width="480" height="514" /></a>
  <a class="diagram-dark" href="../diagrams/fluxfx-phase-flow-ja-dark.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-phase-flow-ja-dark.svg" alt="今回生成する粒子はSpawn、それ以外の生存粒子はUpdateで状態を更新します。保存した状態を次の更新やRenderで読みます。" width="480" height="514" /></a>
</div>

| Phase | 実行対象 | 代表的な処理 |
| --- | --- | --- |
| `Spawn` | 今回生成する粒子 | 状態の初期化、生成時の設定値を保存する |
| `Update` | 更新開始時に生存している既存粒子 | 速度・位置などの更新 |
| `Render` | 描画評価 | 色・サイズ・回転・UVなどの計算 |

GPUの更新処理は生成対象ならSpawn、それ以外の生存粒子ならUpdateへ分岐します。**同じ更新で新規粒子にSpawnとUpdateの両方を適用するわけではありません。** 生成時から必要な独自状態は、Updateを待たずにSpawnで初期化します。

標準の生存判定は`particle.age >= 0`かつ`particle.age < particle.lifetime`です。Coreが年齢と失効を管理し、寿命に達した粒子を非生存状態にします。非生存になっても、独自Valueの全成分が自動でゼロになるわけではありません。スロットが再利用されるときの値はSpawnで設定します。

Renderは描画シェーダー内の評価であり、シミュレーションの更新回数と同じ頻度で一度だけ呼ばれる処理ではありません。フレームをまたぐ蓄積や状態変更はSpawn・Updateで設計します。Phase間を`dependencies`でつなぐことはできません。

## Valueの保存方法と所有者 {#values}

ValueはID・型・書き込み方針・所有者を持ちます。`context.AddValue`で独自Valueを追加する場合、所有者にはそのDefinitionのModule IDを指定します。標準Valueの再定義や、別のModuleが所有するValueの新規登録はできません。

| 扱い | 宣言と制約 |
| --- | --- |
| 状態として保存する | SpawnまたはUpdateが書くValue。必ずSpawnの初期化が必要で、同じValueにProviderを登録できない |
| Providerから供給する | `Provided`で読む。値を供給する方法を別途登録する |
| Render内だけで使う | Render Operationが結果を渡す。Spawn・Updateが書く状態Valueへの書き戻しは禁止 |

Updateだけで独自Valueを書こうとすると`Missing Spawn initializer`になります。読み取り時点を指定しても、その宣言だけでBufferや初期値が作られるわけではありません。

### 書き込み方針 {#write-policy}

| WritePolicy | 誰が書けるか |
| --- | --- |
| `SystemManaged` | Coreのみ。標準の年齢・生成キーなど |
| `OwnerManaged` | Valueと同じOwner IDのOperationのみ |
| `SharedMutable` | 複数のOperation。Writer間の順序指定が必要 |
| `ReadOnly` | Operationからの書き込みは禁止。Providerから供給する値など |

自分のモジュール内だけで更新する状態には`OwnerManaged`、他のモジュールからの更新も許す値には`SharedMutable`を使い分けます。`SharedMutable`でも競合する処理が自動的に安全な順序へ並ぶわけではありません。

## Providerで値を供給する {#providers}

Valueの定義とProviderの登録は別です。`Provided`で読むにはProviderが必要で、同じValueへのProviderの重複登録は拒否されます。

| ProviderKind | 供給方法 | 注意点 |
| --- | --- | --- |
| `Uniform` | 共有Shader Property | 宣言だけでは実行時の値は供給されない。標準の時間などは既存の実行処理が設定する |
| `SpawnInput` | 生成時の入力テクスチャ | Spawnでのみ使用できる |
| `Derived` | 入力ValueとParameterをHLSL関数で計算する | 入力と使用Parameterを登録する。Providerの循環依存は禁止 |
| `LookupTable` | ベイク済みデータを参照する | Renderでのみ使用できる。入力はFloat、出力はサンプルに対応するFloatまたはFloat4 |

独自のUniformを登録しても、Executorが任意のIDへ値を自動設定するわけではありません。利用者が変更する設定値は、通常はParameterとして宣言します。

DerivedのHLSLはOperationと呼び出し形式が異なります。Operationは生成されたContextを受け取りますが、Derivedは宣言順の入力Value、続いてParameterを関数引数として受け取り、計算結果を返します。入力のProviderがSpawn専用なら、それを使うDerivedもUpdateやRenderでは利用できません。

`FluxParticleModuleContribution`の`NormalizedAge`、`Curve`、`Gradient`は、独自IDのValueとProviderをまとめて登録する補助メソッドです。Curve・GradientはLookupTableを使うため、Renderで利用します。標準の`step.time`を使う場合の登録例は[CustomLiftのDefinition](./custom-modules.md#definition)を参照してください。

## 読み書きの宣言 {#reads-and-writes}

Operationの`reads`は入力、`writes`は出力、`parameters`は使用する設定値を指定します。HLSLで使用するフィールドがContextへ生成されるよう、必要な値を宣言します。

<div class="development-figure">
  <a class="diagram-light" href="../diagrams/fluxfx-operation-data-ja-light.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-operation-data-ja-light.svg" alt="状態などのValue、Providerが供給するValue、ParameterがContextに入力されます。OperationのHLSLが計算し、宣言したValueへ結果を書きます。" width="480" height="670" /></a>
  <a class="diagram-dark" href="../diagrams/fluxfx-operation-data-ja-dark.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-operation-data-ja-dark.svg" alt="状態などのValue、Providerが供給するValue、ParameterがContextに入力されます。OperationのHLSLが計算し、宣言したValueへ結果を書きます。" width="480" height="670" /></a>
</div>

図は入力と出力の関係です。すべての入力が必須という意味ではありません。使用できるReadVersionとProviderはPhaseに従い、Renderの出力は粒子状態へ書き戻しません。

| ReadVersion | 読む値 |
| --- | --- |
| `StepPrevious` | Update開始時の状態。Updateでのみ指定できる |
| `AfterOperation` | 同じPhase内で指定したOperationが書いた結果 |
| `Committed` | シミュレーション後の状態。Renderでのみ指定できる |
| `Provided` | Providerの供給値。Providerとその入力のPhase制約に従う |

`AfterOperation`には第3引数でOperation IDを渡します。指定先は対象Valueを書いている必要があり、`contribution.Operation`がその必須依存を追加します。速度・描画色の処理列では入力が先行Writerへ接続し直されるため、[実行順の説明](./custom-module-reference.md#operation-pipelines)も確認してください。

| WriteKind | 意味・制約 |
| --- | --- |
| `Initialize` | Spawnの初期化。Spawnの書き込みはこの種類のみ |
| `Replace` | 値を置き換える。Spawn以外で使用する |
| `Modify` | 読み取った値を基に更新する。Spawn以外で使用する |

`Modify`を指定しても加算式は自動生成されません。必要な入力を`reads`へ宣言し、HLSLで計算します。複数のWriterが同じValueを同じPhaseで変更する場合は、依存関係で順序を明確にします。

### Enabledで切り替える処理 {#enabled}

`switchable: true`のOperationには、ContractのEnabledが必要です。対応するPhaseはUpdateまたはRenderで、すべての書き込みを`Modify`とし、書くValueを入力としても明示します。

無効時はHLSL関数の呼び出しを省略し、入力値を引き継ぎます。ゼロへリセットする動作ではありません。例えばCustomLiftを無効にすると加速は止まりますが、得られた速度は残ります。無効なModuleも定義の収集・検証対象なので、無効化で不正な宣言を回避することはできません。

## Parameterを設計する {#parameters}

Parameterは粒子ごとの状態ではなく、システムの計算へ渡す設定値です。Contractで意味上の型と入力制約を決め、DefinitionでModuleの値を初期値としてBindします。

### 型と検証 {#parameter-types}

| Contractの型 | 計算用の型 |
| --- | --- |
| Float | Float |
| Vector2・Vector3・Vector4 | Float2・Float3・Float4 |
| Color | Float4 |
| Bool・Enum | Float。Contractで許可値を検証する |

Contractでは`ApiName`と`Policy`を指定します。数値には`Minimum`・`Maximum`・`Range`、整数制約には`Integer`、範囲の成分順には`OrderedComponents`などを使えます。Enumは`AllowedValues`で許可値を指定でき、省略した場合はenumで定義された値が対象です。NaN・Infinityは拒否されます。

Inspectorの属性だけでなく、Contractにも必要な制約を置きます。Bind時の初期値の検証と、Handle経由の変更の検証に使われます。不正な初期値は生成エラーとなり、実行時のSetは失敗を戻り値で通知します。自動で範囲内へ丸める前提にはしません。

### 変更方針 {#parameter-policies}

| Policy | 変更と反映 |
| --- | --- |
| `Static` | Executorの最初の有効なStep呼び出し以降は変更不可。PauseやStopだけでは解除されない |
| `Live` | 実行中に変更でき、以降の評価で新しい値を使う。既存粒子への影響は使用する処理による |
| `SpawnLocked` | 生成時に評価した結果を粒子の状態として保持する設計。変更後の設定を新しく生成する粒子へ使う |

`Live`でもSpawnでしか読まないParameterなら、既存粒子の保存済みの値は変わりません。「変更できるか」と「どのPhaseで読むか」を合わせて設計します。

`SpawnLocked`は、Policyを付けるだけで粒子ごとの保存先を自動生成するものではありません。Spawn OperationでParameterを評価し、独自Valueへ`Initialize`で保存します。以降はそのValueを読みます。UpdateやRenderのOperation、またはそれらが使うProviderからSpawnLocked Parameterを直接参照すると、状態への保存が必要として拒否されます。

### ContractからHandleまでつなぐ {#parameter-bindings}

1. Moduleへ保存する設定を追加します。
2. Contractへ固有ID・型・制約・変更方針を宣言し、共有enumの番号へ対応させます。
3. Definitionで`Bind`し、使うOperationまたはProviderのParameter一覧へ含めます。
4. 現在の構成で使わない項目は`UnavailableParameter`で明示し、最後に`Complete()`を呼びます。
5. Handleでは同じenum番号と計算用の型を使い、Setの戻り値を確認します。

enumの番号は0から連続させます。Contractに登録したすべての番号にBindまたはUnavailableParameterが必要です。複数のSetは一括処理ではないため、一部が失敗しても成功した変更は残ります。

## 設計を確認する {#checks}

具体的なデバッグ手順と動作確認項目は[検証と性能](./validation-and-performance.md)を参照してください。

HLSLの関数形式とContextの名前は[リファレンス](./custom-module-reference.md#hlsl-conventions)にまとめています。

独自状態にはSpawnの初期化があるか、Providerの入力はそのPhaseで使えるか、各Writerの順序が決まっているかを確認します。Enabledの切り替えとParameter変更についても、既存粒子と新規粒子を分けて確認してください。

実装手順は[カスタムモジュール](./custom-modules.md)、標準の入力は[Value ID一覧](./custom-module-reference.md#standard-value-ids)、既存処理との接続は[Operation IDと実行順](./custom-module-reference.md#standard-operation-ids)を参照してください。
