<span id="installing-fluxfx"></span>

# FluxFXの導入

VRChat Creator Companion（VCC）に配布リポジトリを登録し、ワールドプロジェクトへFluxFXを追加します。

<span id="requirements"></span>

## 必要な環境

| 項目 | 必要なバージョン |
| --- | --- |
| Unity | 2022.3 |
| VRChat Worlds SDK | 3.10.5以上、4.0.0未満 |
| SceneFlow | 2.1.0以上、3.0.0未満 |
| Flux | 0.0.4 |

依存関係はFluxFXのバージョンによって変わる場合があります。導入するパッケージが要求する依存関係に従ってください。

<span id="add-the-repository-to-vcc"></span>

## VCCへリポジトリを登録する

次のどちらか一方の方法で追加します。Fluxの導入時に登録済みの場合は、再登録は不要です。

- [配布リポジトリ](https://tp-jp.github.io/vpm-repos/)を開き、**Add to VCC** をクリックする。
- VCCの **Settings → Packages → Add Repository** に次のURLを追加する。

```text
https://tp-jp.github.io/vpm-repos/index.json
```

<span id="add-it-to-the-project"></span>

## プロジェクトに追加する

1. VCCで導入先のワールドプロジェクトを選択します。
2. **Manage Project** から **Manage Packages** を開きます。
3. 一覧の **FluxFX** の右にある **＋** ボタンをクリックします。バージョンを指定する場合は **Installed Version** から選びます。
4. 依存パッケージの追加・更新内容を確認して適用します。Flux、SceneFlow、Worlds SDKが必要です。
5. Unityでプロジェクトを開き、インポートとコンパイルが終わるまで待ちます。

Consoleにコンパイルエラーがある場合は、Prefabを配置する前に依存パッケージの導入状態を確認してください。

<span id="verify-the-installation"></span>

## 導入を確認する

ProjectウィンドウでPackages内のFluxFXを開き、次のPrefabがあることを確認します。

```text
Packages/com.tplab.flux.fx/Runtime/Prefabs/FluxParticleSystem.prefab
```

制作にはこのPrefabを使います。同じフォルダーのBufferやStepなどのPrefabは内部構成用です。

**Tools → SceneFlow → Debug Window** では、`FluxFXCompileBuildPass`と`FluxBuildPass`が検出されることを確認します。FluxFXの設定から実行用構成を生成した後、Flux側のKernel用Materialを準備する順序になっています。

Play Modeで確認するときは、通常のシーンリロードを有効にします。**Edit → Project Settings → Editor** でEnter Play Modeの高速化設定を変更している場合は、まずEnter Play Mode Optionsを無効にして確認してください。

<span id="next-steps"></span>

## 次に読む

[クイックスタート](./quickstart.md)でPrefabを配置し、Inspectorから最初のエフェクトを設定します。
