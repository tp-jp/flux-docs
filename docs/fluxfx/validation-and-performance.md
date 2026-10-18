# 検証と性能 {#validation-and-performance}

カスタムモジュールは、定義が登録できること、GPU計算が正しいこと、想定する環境で負荷が許容範囲に収まることを分けて確認します。[全体構成](./architecture.md)と[データと実行モデル](./data-and-execution.md)を前提に、問題を切り分ける手順をまとめます。

## 最小構成から確認する {#workflow}

1. 同梱Prefabに開発中のモジュールだけを追加し、少ないParticle Countで始めます。初速や発生条件を単純にし、期待する変化を決めます。
2. UnityのConsoleで最初のC#エラーを解消し、Add Moduleに表示されることを確認します。
3. Editorプレビューで生成エラーとHLSLのコンパイルエラーを確認します。表示されたら、Enabledのオン・オフや入力値を変えて結果を比較します。
4. Play Modeで構成生成とUdonSharpコンパイルを確認し、Handleから値を変更します。Setの戻り値と表示の両方を確認します。
5. 標準モジュールとの併用、Local・World、停止・再開など、対応する条件を一つずつ増やします。
6. 実際に使う粒子容量・描画方式・対象環境で負荷を比較します。

変更する条件は一度に一つにします。例えばCustomLiftなら、Start Speedを0にして、Directionがゼロなら加速しない、上方向なら上へ加速する、負のStrengthなら逆方向へ加速する、といった期待値を用意できます。

## 失敗した段階を見分ける {#debugging}

| 段階・症状 | 主な確認箇所 |
| --- | --- |
| C#がコンパイルできない | using、asmdefの参照、RuntimeとEditorの配置、型付きDefinitionのoverride |
| Add Moduleに出ない | Definitionの登録、Module型のSerializableと公開引数なしコンストラクター、同じ型を追加済みでないか |
| 構成の生成で例外 | 最初のエラーに含まれるModule・Value・Operation IDをDefinitionと照合する |
| Shaderがコンパイルできない | HLSLパス、entryPoint、Context名、型、入力・出力・Parameterの宣言 |
| プレビューだけ成功する | U# Assembly Definition、SceneFlowの生成処理、Prefabの実行用接続 |
| Handle取得やSetが失敗する | モジュールの組み込み、enum番号、型、Policy、入力制約 |
| 表示が想定と異なる | 座標空間、更新間隔、読み取る時点、実行順、Culling Bounds |

SceneFlowの確認方法は[導入](./installation.md)を参照してください。生成されたShaderや設定を調べることはできますが、修正はModule・Contract・Definition・HLSLへ戻して行います。生成物だけを編集しても次の生成で置き換わります。

### 宣言・配置に関するエラー {#compiler-errors}

| エラー | 意味と対処 |
| --- | --- |
| `Missing Spawn initializer` | 状態ValueのSpawn初期化がない |
| `Value cannot have both State writer and Provider` | 同じValueを状態とProviderの両方で供給している。用途を分ける |
| `Modify requires an explicit read` | ModifyするValueをreadsへ明示する |
| `Multiple read versions in one Context are not supported` | 同じValueの複数時点を一つのOperationへ要求している。処理やデータの設計を見直す |
| `Update operation cannot fit in one RGBA Page` | 結合されるUpdate出力の成分数が4を超える。関連するWriter全体の出力を見直す |
| `Intermediate cross-Page version is not materialized` | 別ページから、保存されていない中間Writerの結果を要求している。最終結果を使うか、必要な中間結果を別の状態として設計する |
| `UInt State requires an exact float32 storage bound` | UInt状態に正確に保存できる上限指定が必要。`MaximumUIntValue`は16,777,216以下 |

出力を別Operationへ分けるだけでは、同じValueへの書き込みを通じてページが結合され、制約が解消しない場合があります。独立した状態か、どの時点の結果を必要とするかを先に整理します。ID衝突や依存関係の確認は[リファレンス](./custom-module-reference.md)を参照してください。

## 動作確認の項目 {#behavior-checks}

| 観点 | 確認すること |
| --- | --- |
| 生成と再利用 | 新規粒子の初期値、寿命後に再利用されるスロットの独自状態、生成直後の表示 |
| 時間 | 複数の更新間隔で意図した動きになるか。SpawnとUpdateの違い、年齢と共通時間の違い |
| 座標 | 対応するLocal・World、エミッターの移動・回転時の方向と位置 |
| Enabled | 初期状態のオン・オフ、実行中の切り替え、無効時に引き継ぐ値 |
| Parameter | 0、負数を許す場合の負数、上下限と範囲外、NaN・Infinity。拒否後に元の値が残るか |
| 変更方針 | Staticの更新開始前後、Liveの既存粒子への影響、SpawnLockedの新旧粒子の違い |
| 併用 | 同じValueを書く標準・独自モジュールとの順序、任意依存先がない構成 |
| 再生 | Play・Pause・Stop・Restart・Clearの前後。期待する動作は各APIの仕様に合わせる |

実装のCustomLift検証では、初期Enabledの保持、同じHandleの再利用、有限値の受け付け、NaN・Infinityの拒否、無効時と有効時の速度を確認しています。独自モジュールでも、見た目の確認に加えてParameter検証と粒子状態の期待値を分けると、原因を絞りやすくなります。

EditorのテストでGPU計算を確かめても、UdonSharpでの動作確認は別に必要です。最終的にはPlay Modeと対象環境で確認します。

## 生成結果から負荷を確認する {#generated-cost}

Editorコードから`FluxParticleBuildPipeline.Build(authoring)`を呼ぶと、`FluxParticleBuildResult`を取得できます。これは構成のコンパイルとシェーダーソース生成であり、実行用Prefabの構成や実測まで行う操作ではありません。

| 確認対象 | 見るもの |
| --- | --- |
| 計算用Pass | `result.Shaders.Passes`。モジュール追加前後で数と内容を比較する |
| 状態配置 | `result.Shaders.Compilation.StateLayout`。独自Valueがどのページ・成分に配置されたか |
| 初期値・公開操作 | `result.InitialValues`と`result.ModuleBindings` |
| 描画処理 | `result.RendererSource`。追加したRender処理が含まれるか |

実行用構成の生成時には`Program Backend assigned: ... (N Passes)`というログも出ます。これは生成された計算用Pass数であり、描画・Trails・補助処理を含む全GPU負荷の指標ではありません。Pass数が同じでも、HLSLの計算量やTexture参照が増えれば負荷は変わります。

## 性能上の注意 {#performance}

計算用Pass数だけで全体の負荷を判断せず、生成結果の確認と対象環境での実測を組み合わせます。

### 状態Valueとページ {#state-cost}

状態ページはRGBAの4成分へ配置され、読み書きを切り替えるためにBufferを2枚持ちます。独自Valueの追加でページ数が増えると、メモリと更新時の転送量が増える可能性があります。Spawn専用の状態は既存ページの空き成分へ配置される場合もあるため、Value数だけでは増分を判断できません。

ARGBFloatのデータ部分は1テクセル16バイトです。Textureの1辺をW、状態ページ数をPとすると、状態Bufferの概算は`W × W × 16 × 2 × P`バイトです。発生入力・集計用Buffer・Lookup Texture・Mesh・Trailsなどは別です。容量と概算例は[制約と性能](./limitations.md#buffers-and-memory-estimates)を参照してください。

保存する必要のない値はProviderで計算する選択肢があります。ただし、保存コストが減る代わりに計算が増えるため、常に高速になるわけではありません。

### OperationとHLSL {#operation-cost}

1モジュール・1Operationが1Passに対応するわけではありません。出力ページやページ間依存によって実行計画が決まります。複雑なループ、繰り返しのTexture参照や計算は、同じPass数でも負荷を増やします。

Renderの計算は描画側で評価されます。Meshの頂点数、描画回数、画面上での重なりも含めて比較し、シミュレーションの負荷だけで判断しないでください。Trailsには履歴用の状態と専用の更新・描画処理もあります。

### 無効化・容量・読み戻し {#runtime-cost}

Enabledをオフにしても、組み込んだ状態ページやParameterが削除されるわけではありません。無効化とモジュールを削除して再生成した場合を区別します。

Rateを下げても確保済みのParticle Countや描画Meshは小さくなりません。Executorは生成専用Passを発生要求がないときに省略しますが、生存粒子数に比例して全処理が小さくなるわけではありません。Stop後も更新は続き、Pauseでも描画と確保済みメモリは残ります。

GPU読み戻しを計測のため毎フレーム追加すると、その負荷が結果に混ざります。標準の生存数取得は非同期で、要求間隔と同時要求に制限があります。確認方法は[状態と粒子数の取得](./state-and-count.md)を参照してください。

## 比較結果を残す {#measurements}

同じ容量・発生条件・描画方式・カメラ位置・実行環境で、モジュールなし、有効、無効を比較します。生成・初期化の時間と、実行中のCPU・GPU負荷を分けて測ります。読み戻しや大量のログを止めた状態でも確認してください。

記録には、使用パッケージ、GPUと実行環境、再現設定、最初のエラー、期待値と実際の結果、状態ページ数・Pass数、計測条件を含めます。固定の粒子数やPass数を万能な性能目標にせず、実際の用途で判断します。
