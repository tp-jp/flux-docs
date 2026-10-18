# FluxFXの全体構成 {#architecture}

FluxFXは、Inspectorの設定をEditorでGPU処理へ変換し、実行時はUdonSharpが再生とパラメーターを制御するパーティクルシステムです。このページはカスタムモジュールの開発者向けに、設定から生成・実行・描画までのつながりを説明します。

[クイックスタート](./quickstart.md)で基本的な動作を確認してから読むと、各要素の役割を追いやすくなります。

## 設定から描画まで {#flow}

<div class="architecture-figure">
  <a class="diagram-light" href="../diagrams/fluxfx-architecture-ja-light.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-architecture-ja-light.svg" alt="FluxFXの全体構成。Editorで設定から実行用構成を生成し、実行時はUdonSharpがGPUでの粒子更新と描画を制御します。" width="480" height="780" /></a>
  <a class="diagram-dark" href="../diagrams/fluxfx-architecture-ja-dark.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-architecture-ja-dark.svg" alt="FluxFXの全体構成。Editorで設定から実行用構成を生成し、実行時はUdonSharpがGPUでの粒子更新と描画を制御します。" width="480" height="780" /></a>
</div>

| 段階 | 主な担当 | 結果 |
| --- | --- | --- |
| 設定 | `FluxParticleAuthoring`、各Module | Inspectorで編集する設定値 |
| 処理の組み立て | Core、Contract、Definition | 計算の入力・出力・パラメーター・依存関係 |
| コンパイル・生成 | `FluxParticleBuildPipeline`、`FluxParticleProgramBuild` | シェーダー、実行手順、Unityの実行用構成 |
| 実行 | `FluxParticleSystem`、Emitter、Executor | 発生要求、粒子状態の更新 |
| 描画 | `FluxParticleRenderer`、生成された描画シェーダー | 粒子の表示 |

FluxはRenderTextureとシェーダーを使ったGPU計算の基盤です。FluxFXはその上に、粒子の設定、計算の生成、再生制御、描画を組み立てます。カスタムモジュールでは、通常、BufferやKernelを手動で配置せず、DefinitionとHLSLで必要な処理を宣言します。

## Inspectorの設定とModule {#authoring}

`FluxParticleAuthoring`はMain・Shape・Rendererやモジュール一覧など、実行用構成の生成に必要な設定を保持します。各Moduleはその一覧に保存される設定オブジェクトです。例えばCustomLiftはStrengthとDirectionを保持します。

Moduleは、個別に毎フレーム実行されるUdonSharpBehaviourではありません。Editorがその設定を読み、対応するDefinitionを通してGPU処理へ組み込みます。InspectorのStageは表示グループを決め、実際の実行順はOperationの依存関係で決まります。

## Editorで処理を組み立てる {#compilation}

`FluxParticleBuildPipeline`は、次の順に設定を実行可能な計算へ変換します。

1. Authoringの設定を検証し、粒子の位置・速度・寿命などのCore定義を用意します。
2. 各ModuleのDefinitionから、設定に応じたParameter・Provider・Operationなどを収集します。
3. 速度と描画色のWriterの順序を解決し、後続処理へ接続します。
4. コンパイラーが読み書きと依存関係を検証し、保持するデータの配置とGPUのPassを決めます。
5. 計算用シェーダーと描画用シェーダーを生成します。

| モジュール作者が用意するもの | 生成処理での役割 |
| --- | --- |
| Module | Inspectorに保存した値を渡す |
| Contract | Parameterの型・変更方針・ハンドル番号などを定義する |
| Definition | Moduleの値をBindし、読むValue・書くValue・使用Parameter・HLSL・依存関係を登録する |
| HLSL | 生成されたContextを受け取り、粒子の計算を行う |
| Handleと拡張メソッド | 生成された対応情報を使い、UdonSharpからParameterを操作する |

Operationは論理的な処理単位です。**1モジュールや1Operationが、そのまま1つのBufferやGPU Passになるわけではありません。** 必要な状態と読み書きに応じて、コンパイラーが実行計画を作ります。

`FluxParticleProgramBuild`は生成結果をUnityの実行用構成へ反映し、Buffer・Kernel・Material、パラメーターの初期値やハンドルの対応情報を接続します。SceneFlowでは`FluxFXCompileBuildPass`がこの処理を行い、その後にFlux側の`FluxBuildPass`が実行されます。

## 実行時の役割分担 {#runtime}

| 要素 | 役割 |
| --- | --- |
| `FluxParticleSystem` | 再生・停止・一時停止を管理し、更新を進める入口 |
| `FluxParticleEmitter` | Emissionの設定と再生状況から、今回の発生要求数・生成キーなどを用意する |
| `FluxParticleEmissionScheduler` | Start Delay・Duration・Loop・Rate・Burstに従って発生スケジュールを計算する |
| `FluxParticleExecutor` | 生成された実行手順に従い、FluxのBufferとKernelを使ってGPU処理を実行する |
| `FluxParticleRenderer` | 容量と描画方式に応じたMeshを用意し、描画Materialを設定する |

更新時はSystemがEmitterを進め、その発生要求と更新間隔をExecutorへ渡します。ExecutorはGPU上で生成先の割り当てと粒子の更新を行います。UdonSharpが各粒子の位置を配列で計算し、毎フレーム転送する構成ではありません。

`Stop`は新しい発生を止め、既存粒子の更新は継続します。`Pause`はシミュレーションの進行を止めます。APIごとの違いは[再生と停止](./playback.md)を参照してください。

## GPU上の状態と描画 {#gpu-and-rendering}

フレームをまたいで必要な粒子状態は、FluxBufferのRenderTextureへ配置されます。Executorは読み取り側と書き込み側を分け、更新済みのBufferを次の状態として使います。すべてのValueを保存するわけではなく、Providerから供給・計算する値もあります。

| Phase | 役割と例 |
| --- | --- |
| Spawn | 新しく生成する粒子を初期化する。位置・速度・生成キーなど |
| Update | 粒子の状態を更新する。加速度、移動、年齢など |
| Render | 描画時に使う値を計算する。色・サイズ・回転・UVなど |

Renderの処理は描画用シェーダーへ組み込まれます。Updateと同じように、すべての結果を状態Bufferへ書き戻す処理ではありません。描画シェーダーは粒子状態を参照し、BillboardまたはMeshを表示します。

Trailsは粒子状態に加えて位置などの履歴を保持し、専用の更新・描画処理を使います。標準モジュールのOperation一覧にTrailsのOperationがないのは、このためです。

## 実行中に変更できる範囲 {#runtime-changes}

Handleを使うと、生成済みのParameterを変更できます。変更可否や反映時点はContractの変更方針と値の検証に従います。これはAuthoringやModuleに保存したフィールドを編集する操作ではありません。

モジュールの追加、読み書きするValueの変更、HLSLや依存関係の変更には、Editorで実行用構成を生成し直す必要があります。`SetEnabled`は、すでに組み込まれた処理の有効状態を切り替える機能です。実行時に新しいDefinitionをコンパイルする機能ではありません。

## プレビューと実行環境の違い {#preview}

Editorプレビューもコンパイル結果を使いますが、`FluxParticleEditorPreview`と`FluxParticleProgramGpuSession`がEditor側のGPU実行環境を管理します。Play Modeやワールドでは、SceneFlowで生成された構成をUdonSharp側が実行します。

したがって、プレビューで見た目を確認した後に、Play Modeで構成の生成・再生・Handleからの変更を確認します。プレビューの成功だけではUdonSharp用のアセンブリ設定や実行時の接続まで確認できません。

## カスタムモジュール開発へ進む {#next-steps}

実装後の確認手順と負荷の調べ方は[検証と性能](./validation-and-performance.md)を参照してください。

[データと実行モデル](./data-and-execution.md)では、Phaseの実行対象、状態とProviderの使い分け、読み書きの宣言、Parameterの変更方針を説明します。

[カスタムモジュール](./custom-modules.md)では、CustomLiftを例に各ファイルを作成します。データや処理を選ぶときは、リファレンスの[Value ID一覧](./custom-module-reference.md#standard-value-ids)と[Operation ID・実行順](./custom-module-reference.md#standard-operation-ids)を参照してください。性能上の制約は[制約と性能](./limitations.md)にまとめています。
