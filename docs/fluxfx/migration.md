# Authoring集約に伴う移行 {#authoring-migration}

編集設定は`FluxParticleAuthoring`に集約され、Particle Count・Play On AwakeもAuthoringで保持します。`FluxParticleSystem`は外部Udonから参照するRuntimeの入口です。以前の構成で作ったPrefabやSceneは、旧Systemに保存された設定をAuthoringへ移行してください。

## 移行手順 {#steps}

1. Playを停止し、編集中のPrefabを保存します。
2. **Tools → FluxFX → Migration → Migrate Prefabs and Open Scenes** を実行します。
3. 対象のルートにあるAuthoring Inspectorで、Particle Count・Play On Awakeなどの設定を確認します。
4. 変更状態になったSceneを保存します。

未保存のPrefab編集や読み取り専用のPrefabがあると、移行がエラーで止まる場合があります。Consoleの対象パスを確認し、保存・編集可能な状態にしてから再実行してください。

## 対象と保存範囲 {#scope}

| 対象 | 移行と保存 |
| --- | --- |
| `Assets`配下の対象Prefab | 移行し、変更したPrefabを保存する |
| 現在開いているScene | 対象を移行する。Sceneは自動保存しない |
| 閉じているScene | 一括移行の対象外。必要なSceneを開いて再実行し、保存する |

Prefabの参照元を先に処理し、Prefab／Variant・入れ子Prefabの項目単位の継承とオーバーライドを保持します。移行後も、継承する設定と個別に上書きした設定を確認してください。

Authoring Inspectorに移行要求が表示されている間は、通常の設定編集を行えません。**Migrate Settings** でその対象と参照元Prefabを移行するか、上記メニューでまとめて移行します。いずれの場合も、変更されたSceneは自分で保存します。

## Play・ビルド時のフォールバック {#fallback}

未移行のデータも、Play開始・ビルド時には旧SystemのParticle Count・Play On Awakeを読み取るフォールバックがあります。これはベイクに使う値の解決であり、保存元のPrefabやSceneを永続的に移行する処理ではありません。Playで動いたことを移行完了の代わりにせず、メニューによる移行と保存を行ってください。

## 移行後の操作 {#after-migration}

- 設定編集・Curve／Gradient・標準／カスタムModuleの編集はAuthoringで行います。
- 設定全体の **Copy Component／Paste Component Values** は[Authoringを対象](./inspector-preview.md#copy-settings)にします。
- PreviewとPlay中の対応項目のLive編集は[Authoring Inspector](./inspector-preview.md#baking-and-live-editing)を使います。
- 外部Udonの参照先は引き続き[FluxParticleSystem](./runtime-parameters.md)です。SystemはUdonSharp標準Inspectorを使用し、設定用SerializeFieldは非表示です。

## 変更内容と公開状況 {#release-status}

Authoring集約は、編集設定の保存先を変更する移行を伴う更新です。この変更は0.1.0でリリースされました。0.1.0より前のデータを使用する場合は、上記の手順で移行してください。
