<span id="installing-flux"></span>

# Fluxの導入

Fluxは、VRChat Creator Companion（VCC）に配布リポジトリを登録して導入します。VRChat Worlds SDKを導入済みのワールドプロジェクトを用意してください。

<span id="requirements"></span>

## 必要な環境

| 項目 | 必要なバージョン |
| --- | --- |
| Unity | 2022.3 |
| VRChat Worlds SDK | 3.10.5以上、4.0.0未満 |
| SceneFlow | 2.1.0以上、3.0.0未満 |

UdonSharpを使ってFluxを操作します。UdonSharpは[VRChat Worlds SDKに含まれています](https://creators.vrchat.com/worlds/udon/udonsharp/)。

<span id="install-through-vcc"></span>

## VCCで導入する

<span id="add-the-repository"></span>

### リポジトリを登録する

VCCをインストール済みの場合、次のどちらか一方の方法でリポジトリを追加します。

- [配布リポジトリのページ](https://tp-jp.github.io/vpm-repos/)にアクセスし、**Add to VCC**をクリックする。
- VCCの **Settings → Packages → Add Repository** を開き、次のURLを追加する。

```text
https://tp-jp.github.io/vpm-repos/index.json
```

<span id="add-flux-to-your-project"></span>

### プロジェクトにFluxを追加する

1. VCCで導入先のワールドプロジェクトを選択します。
2. **Manage Project** から **Manage Packages** を開きます。
3. 一覧の **Flux** の右にある **＋** ボタンをクリックします。バージョンを指定する場合は、**Installed Version** の選択欄から選びます。
4. 依存パッケージの追加・更新が表示されたら、内容を確認して適用します。FluxにはWorlds SDKとSceneFlowが必要です。
5. Unityでプロジェクトを開き、インポートとコンパイルが完了するまで待ちます。Consoleにエラーがないことを確認してください。

<span id="add-the-repository-with-vpm-cli"></span>

## VPM CLIでリポジトリを登録する

VPM CLIを使う場合は、コマンドラインで次のコマンドを実行します。

```sh
vpm add repo https://tp-jp.github.io/vpm-repos/index.json
```

このコマンドはリポジトリを登録するものです。Fluxのプロジェクトへの追加は、上記のVCCのパッケージ管理画面から行えます。

<span id="install-a-unitypackage"></span>

## unitypackageで導入する

リポジトリを使わずに導入する場合は、[FluxのReleases](https://github.com/tp-jp/Flux/releases)から対象バージョンの`.unitypackage`をダウンロードし、Unityプロジェクトへインポートします。

この方法でもWorlds SDKとSceneFlowが必要です。依存パッケージを先に導入してからFluxをインポートしてください。

<span id="verify-the-installation"></span>

## 導入できたことを確認する

ProjectウィンドウでFluxの導入先を開き、次のファイルを確認します。VCCで追加した場合はPackages内のFluxにあります。

| ファイル | 用途 |
| --- | --- |
| `Runtime/Udon/FluxBuffer.cs` | GPU上のデータを保持する |
| `Runtime/Udon/FluxKernel.cs` | シェーダーを実行する |
| `Runtime/Udon/FluxUpload.cs` | 配列をGPUへ送る |
| `Runtime/Udon/FluxReadback.cs` | GPUからデータを読み戻す |
| `Runtime/Shaders/FluxUpload.shader` | 転送用シェーダー |
| `Editor/FluxBuildPass.cs` | Kernel用Materialの生成処理 |

SceneFlowの**Tools → SceneFlow → Debug Window**では、検出されたPassを確認できます。`FluxBuildPass`が含まれることを確認してください。

<span id="preparation-by-sceneflow"></span>

## SceneFlowによる準備

`FluxKernel`には、InspectorでShaderを設定します。実行に必要なMaterialは、SceneFlowがシーンを処理するときに`FluxBuildPass`が生成して割り当てます。Materialを手作業で作る必要はありません。

Editorで試すときは、通常のシーンリロードを伴うPlay Modeを使ってください。SceneFlowは`IProcessSceneWithReport`から呼ばれます。**Edit → Project Settings → Editor**でEnter Play Modeの高速化設定を変更している場合は、まずEnter Play Mode Optionsを無効にして確認してください。

シーン処理が実行されない状態でKernelの`SetFloat`や`Dispatch`などを呼ぶと、Materialが未設定のままになり、エラーになることがあります。

<span id="next-steps"></span>

## 次のステップ

[クイックスタート](./quickstart.md)で、4要素のデータをGPUへ転送し、同じ値を読み戻して導入を確認します。

