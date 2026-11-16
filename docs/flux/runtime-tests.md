# Runtime Tests

Runtime TestsはFluxの転送・計算・読み戻しをUdon VM上で確認するサンプルです。通常のPlayとUnity Test Runnerから同じテスト本体を実行できます。

## インポートと前提 {#setup}

1. Flux・VRChat Worlds SDK（UdonSharpとClientSimを含む）・SceneFlowを[導入](./installation.md)します。
2. **Window → Package Manager**でFluxを選び、**Samples → Runtime Tests → Import**を実行します。
3. インポートされたRuntime Testsフォルダーの`Scenes/RuntimeTest.unity`を開きます。Package Managerが示すインポート先を使ってください。

サンプルにはTextMeshProによる結果表示と、Unity Test Frameworkを使うEditorテストが含まれます。Test Runnerが使えるようTest Frameworkを導入し、コンパイルエラーを解消してください。ClientSimを有効にし、Enter Play Mode設定では**Scene Reloadを有効**にします。迷う場合はEnter Play Mode Optionsを無効にし、通常のPlay設定で確認します。

このスイートは標準Scatterを含むため、**Direct3D 11、ARGBFloat RenderTexture、非同期GPU Readback**に対応する環境が必要です。GPUを無効にする`-nographics`では実行しないでください。このスイートのD3D11条件をFlux全機能の要件と混同しないでください。

配布パッケージのサンプル位置は`Samples~/RuntimeTests`です。開発用チェックアウトではリリース処理がサンプルを収録する構成のため、Package ManagerにImportが見えても実体がない場合があります。Runtime Testsを収録した配布パッケージを使用してください。

## 通常のPlayで実行する {#play}

編集中のSceneを保存し、RuntimeTestシーンでPlayを開始します。SceneFlowがKernel Materialを準備し、ClientSim内のUdon VMでテストが順に実行されます。完了後、シーンの結果表示に各テストのPASS／FAILと成功・失敗件数が出ます。Consoleの先行エラーも確認してください。

## Test Runnerで自動実行する {#test-runner}

1. Playを停止し、編集中のSceneを保存します。
2. **Window → General → Test Runner → EditMode**を開きます。
3. `TpLab.Flux.RuntimeTests.Editor.FluxRuntimeSceneTests.RuntimeScenePassesInUdonVm`を選んで実行します。

この統合テストはUdonSharpのPlayer用・Editor用コンパイルを行い、RuntimeTestシーンを開いてPlayへ入ります。C#のテスト本体を直接呼ぶ方式ではなく、UdonBehaviourのHeap上の完了状態・成功件数・Udon実行フラグを確認します。EditModeタブに表示されても、検証対象はC#のみではありません。

シーンはGUIDで検索するため、インポート先の絶対パスへ依存しません。シーンに登録されたテスト数を期待件数として、欠けた参照・空のスイート・失敗・予期しないエラーログ・Play移行後180秒以内に完了しない状態を検出します。終了処理ではPlayを止め、開始前のシーン構成とPlay Mode Start Sceneを復元します。

Test Runnerに表示される**1件の統合テスト**と、シーン内で順に実行する**複数件のUdonテスト**は別の件数です。成功判定にはTest Runnerの結果と、記録されたUdonの件数・実行状態の両方を使います。コンパイル成功だけではGPU結果の成功を意味しません。

## 再インポートと問題の切り分け {#reimport}

サンプルを更新するときは変更したファイルを退避し、Package Managerで再インポートしたサンプルを開いて、通常PlayとTest Runnerの両方を確認します。古いコピーを複数残して同じGUIDや型が重複しないようにしてください。UdonSharpスクリプトと対応するProgram Assetを揃えて保持します。

| 症状 | 確認すること |
| --- | --- |
| テストが表示されない | Test Frameworkとサンプル内Editorテストの導入、コンパイルエラー |
| ClientSim／Scene Reloadの検証で止まる | ClientSimを有効にし、Scene Reloadを無効にする設定を解除 |
| Shader・GPUの検証で止まる | D3D11とGPU Readbackの対応。SceneFlowのMaterial準備エラーも確認 |
| テストが完了しない | 最初のConsoleエラー、Udonの停止、Readbackの失敗、シーン内参照 |

この実行はEditor Play／ClientSimでのUdon VMとGPU処理の確認です。VRChat実クライアント、他GPU／他Graphics APIでの動作や、利用先の出力・見た目・性能は別に検証します。
