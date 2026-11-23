# リリースノート {#release-notes}

## 0.7.0：System FollowとPreview追従操作を追加 {#v0-7-0}

2026年11月23日に[GitHub Releaseと配布ファイル](https://github.com/tp-jp/FluxFX/releases/tag/0.7.0)の公開を確認しました。

SystemのGameObjectをローカルプレイヤーの位置・頭部・指定Transformへ追従させる **System Follow** を追加しました。通常のModuleではなく、AuthoringのMainで設定します。既定はOFFで、既存データの配置・動作を維持します。

- 追従位置のオフセット、World／追従先の向きを基準にしたオフセット、回転追従を設定できます。設定はPlay開始前に行い、変更用のUdon Runtime APIは追加していません。
- System Follow有効時のPreviewに、配置位置・Sceneカメラ・指定Transformを明示的に選ぶ操作を追加しました。既定は配置位置で固定です。Previewの指定Transformが未指定でも、Sceneカメラや実行時の参照へ自動的には切り替えません。
- Previewの追従位置と向きを固定・解除できます。粒子のPauseとは別操作で、再生を続けながら外側から観察できます。
- Preview操作は保存内容を変更しません。モジュール編集などによるPreview再構築では追従先・固定状態を保持し、Inspectorが作り直されると既定に戻ります。

設定と雪の例は[Main](./main.md#system-follow)、操作手順は[Previewの追従操作](./inspector-preview.md#preview-follow)を参照してください。World空間の粒子を残す場合は、Systemとともに移動する[Culling Bounds](./renderer.md#描画範囲を設定する)も調整します。

### 検証範囲 {#verification-0-7-0}

以下は実装時の記録に基づく結果です。このドキュメント更新でUnityのテストを再実行した結果ではありません。

| 対象 | 確認結果 |
| --- | --- |
| C#コンパイル | System Follow実装時・Preview拡張後ともPASS |
| Player／Editor用Udonコンパイル | System Follow実装時に両方PASS。Preview拡張後は再実行していない |
| 関連EditModeテスト | Preview拡張後、63件すべてPASS。全回帰ではない |
| Preview画像比較 | World／Local × MSAA 1／4の4条件で最大RGBA差0。Trails・Distance Fadeを含む |
| Preview操作 | 固定中の姿勢保持とGPUシミュレーション継続、解除後の追従、再構築時の追従先・固定状態の保持、日英UIを確認 |
| 保存内容への影響 | Authoring・Runtime・Transform・再ベイク結果の一致、Scene変更状態の維持を確認 |
| Play／ClientSim | System Follow実装時に4種類の追従先、World／Local、初期非アクティブ、再有効化、回転・オフセットなどを確認。Preview拡張後は再実行していない |
| VRChat実機・VRヘッドセット | 未検証 |

記録は`Temp/SystemFollow/verification.txt`と`Temp/PreviewFollow/verification.txt`です。前者のPreview仕様は拡張前のもので、現在の操作は後者に従います。Temp内のため記録が消失する可能性があります。

## 0.6.1：生成物の管理情報をUserSettingsへ移動 {#v0-6-1}

パッチ更新です。2026年11月23日に[GitHub Releaseと配布ファイル](https://github.com/tp-jp/FluxFX/releases/tag/0.6.1)の公開を確認しました。

生成物の管理情報をUserSettingsへ移動しました。既存の台帳・整理予約・実行間隔を自動で引き継ぎます。各環境の生成状態に対応する管理情報を、共有するプロジェクト設定から分離します。

- 所有台帳と整理予約・走査時刻の保存先を、`ProjectSettings/FluxFXGeneration`から`UserSettings/FluxFXGeneration`へ変更しました。
- Editor読み込み時と管理情報の読み書き前に移行を確認します。自動整理がOFFでも移行し、内容の一致を確認してから旧ファイルを削除します。
- 途中まで移行したファイルが移行元とバイト単位で一致すれば再実行できます。競合・破損・読み書きエラーでは上書きせず停止し、不明なファイルや空でないフォルダーを残します。
- 生成Assetの保存先、Library内の実行履歴、公開API、通常の操作手順は変更していません。自動整理の既定ON・起動時のみ・最大24時間に1回の仕様、既存のON／OFF設定と参照保護も維持します。

詳細は[保存先の移行](./generated-assets.md#metadata-migration)と[Gitでの扱い](./generated-assets.md#git)を参照してください。

### 検証範囲 {#verification-0-6-1}

実装時の検証記録では、C#コンパイル、移行テスト17件、既存の生成・整理・参照保護テスト65件がPASSしています。FluxFX開発プロジェクトの実データの移行と、旧保存先の整理も確認されています。この変更に対するUdonコンパイル・Play Mode・VRChat実機確認は未実施です。

記録は`Temp/GenerationMetadataMigration/verification.txt`に保存されています。Temp内のため消失する可能性があります。上記は実装時の結果であり、このドキュメント更新でテストを再実行した結果ではありません。

## 0.6.0：生成物の整理機能を刷新し、起動時の自動整理を既定で有効化 {#v0-6-0}

生成物整理に関する変更です。2026年11月23日に[GitHub Releaseと配布ファイル](https://github.com/tp-jp/FluxFX/releases/tag/0.6.0)の公開を確認しました。

FluxFXが管理する未使用のShader・固定HLSL・Materialなどの整理機能を刷新しました。手動では削除候補と保持理由を確認でき、自動ではプロジェクト起動時に必要な整理を行います。使用中の生成物と、その依存ファイルは保持します。

### 主な変更 {#cleanup-changes}

- 自動整理を未設定時にONへ変更しました。保存済みのOFF設定は維持します。
- 編集中の周期的な実行と生成終了後の60秒待機を廃止し、初期Import・コンパイル・セッション復旧後の起動ごとの判定に変更しました。予約または保持期限を迎えた対象があり、前回の自動全体走査から24時間以上経過した場合に実行します。
- 自動整理に進捗表示とキャンセルを追加しました。全体走査開始後のキャンセル・失敗でも24時間制限と未完了の予約を維持します。
- 手動整理は、分析結果の候補・容量・保持理由・参照元を確認してから削除する方式になりました。削除前に参照を再確認し、確認済み候補だけを対象にします。
- この版では所有台帳をProjectSettingsへ移し、Libraryの実行履歴から分離しました。Libraryを再作成しても所有情報が残ります。保存先は[0.6.1](#v0-6-1)でUserSettingsへ変更しました。
- 自動整理では説明用の詳細な参照元特定を省き、参照保護の判定は維持します。
- 拡張APIに分析・確認済み候補の整理・詳細結果の取得を用意しました。

操作・保持期間・保存先・APIは[生成物の管理](./generated-assets.md)を参照してください。自動整理を見送る条件と次回起動への持ち越しは[起動時の自動整理](./generated-assets.md#automatic-cleanup)にまとめています。

### 検証範囲 {#verification}

以下は実装時に報告された確認結果です。過去のTemp検証ログは現在残っておらず、今回のドキュメント更新でテストを再実行した結果ではありません。

- C#コンパイルと関連Editorテスト65件がPASS。仕上げ後の18件もPASSしました。18件は再検証であり、合計83件の独立したケースではありません。
- 最小検証プロジェクトで、製品の起動処理・スケジュールの実ソースを使用し、実起動時の動作、再読込時の再実行防止、24時間以内に再起動しても自動整理が再実行されないことを確認しました。
- 本体Editorの再起動、今回の変更後のPlay描画・Udonコンパイル・VRChat実機確認は未実施です。
