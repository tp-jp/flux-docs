# カスタムモジュール入門 {#custom-module-quickstart}

生成メニューで上向きに加速するモジュールを作り、プレビューで動かしてから計算を変更します。最初はContractやHandleを手で書く必要はありません。

::: info 利用できる環境
この生成機能は現在、開発版に実装されています。リリース版への収録は未確認です。**Tools → FluxFX → Create Custom Module...** がない場合は、この手順を利用できません。手動で作成する方法は[カスタムモジュール](./custom-modules.md)を参照してください。
:::

## 1. 生成する {#create}

Play Modeを終了し、**Tools → FluxFX → Create Custom Module...** を開きます。まずは次の初期値を使います。

| 入力 | 初期値・役割 |
| --- | --- |
| Module Name | `CustomAcceleration`。クラス名の基部 |
| Namespace | `MyCompany.FluxFX`。実際の親namespaceは`MyCompany.FluxFX.CustomAcceleration` |
| Parent Folder | `Assets`。Project内の既存フォルダーを指定する |
| Generate Runtime API | OFF。外部Udon用の型付きHandleが必要な場合だけON |
| Destination | 自動計算される生成先。初期値では`Assets/CustomAcceleration` |

**Create Module** を押し、Unityのコンパイル完了を待ちます。既存フォルダーには生成できません。同名の生成物がある場合は、別のModule Nameを指定してください。

画面の主要ラベルはFluxFX Inspectorの言語設定に従います。このページでは英語のラベルを使用します。入力検証の詳細エラーは英語です。

## 2. 追加して動かす {#preview}

1. [クイックスタート](./quickstart.md)と同様に、同梱の **FluxParticleSystem Prefab** を配置します。Authoring単体では動作しません。
2. ルートのFluxParticleAuthoring Inspectorで **Modules → Velocity Update → Add Module → Custom → Custom Acceleration Module** を選びます。
3. 以下の確認用設定を入力します。他の動きのモジュールは外して比較してください。
4. Sceneビューの **FluxFX Preview** で **Play** を押します。プレビューの初期状態は停止です。

| 場所 | 確認用設定 |
| --- | --- |
| Main | Particle Count = 64、Simulation Space = Local、Start Lifetime = 3、Start Speed = 0 |
| Mainの再生設定 | Start Delay = 0、Duration = 5、Loop = ON。Play ModeではPlay On AwakeもON |
| Renderer | Start Size = 1 |
| Emission | Rate over Time = 8、Burstなし |
| Custom Acceleration Module | Strength = 2、Direction = (0, 1, 0)、Enabled = ON |

これは動きを見やすくするための設定例です。生成機能が既存Systemへ自動適用する値ではありません。粒子が見えない場合は[クイックスタート](./quickstart.md)の描画設定も確認してください。

生成された処理は、Simulation Spaceの座標系で`Direction × Strength × 経過秒数`を速度へ加えます。既定値では上向きの速度が毎秒2ずつ増えます。Directionは正規化されず、長さも加速度に掛かります。負のStrengthは方向を反転します。Enabledをオフにすると加速が止まりますが、既存の速度はゼロになりません。

## 3. HLSLを少し変える {#edit-hlsl}

初期値で生成した場合は、`Assets/CustomAcceleration/Editor/CustomAcceleration.hlsl`を開きます。`float3 acceleration = ...`が加速度の式で、続く次の行が速度への適用です。

```hlsl
ctx.valueParticleVelocity += acceleration * ctx.valueStepDeltaTime;
```

最初は`+=`を`-=`へ変更し、保存します。

```hlsl
ctx.valueParticleVelocity -= acceleration * ctx.valueStepDeltaTime;
```

Unityへ戻り、**対象の選択を一度外して選び直し、プレビューを作り直してPlay**します。同じ設定で下向きに加速することを確認してください。Play Modeの場合は停止してから再度Playします。

::: tip HLSL変更の反映
PreviewのRestartは状態をリセットする操作で、ソースの再ビルドを保証しません。HLSLの自動ホットリロードには対応していません。
:::

最初は関数本体の計算だけを変更してください。生成されたContext型名、Parameterフィールド名、entryPointを変更する場合は、DefinitionやContractとの整合が必要です。

## 生成されたファイルの役割 {#files}

ここからは拡張するときに参照してください。`N`はModule Name、`R`は`Namespace.N`です。最小構成は.metaを除いて7ファイルです。

| ファイル | 役割 |
| --- | --- |
| `Scripts/NModule.cs` | Inspectorで保存するStrength・Directionなどの設定 |
| `Scripts/R.Scripts.asmdef` | 設定用アセンブリ。U#アセンブリにはしない |
| `Editor/NContract.cs` | ID、パラメーター、Live変更方針と入力検証 |
| `Editor/NDefinition.cs` | 設定とGPU処理の接続。Editorが自動発見する |
| `Editor/NLiveInspectorProvider.cs` | Play中のInspector編集とRuntimeの接続 |
| `Editor/N.hlsl` | 最初に編集するGPUの計算 |
| `Editor/R.Editor.asmdef` | Editor専用アセンブリと参照 |

ID・HLSL関数名・GUID・アセンブリ参照は自動生成されます。HLSLはGUIDで参照されるため、対応する.metaを保持してください。生成物は通常のソースとして編集できます。再実行による更新や自動再生成は行いません。

## 必要になったらUdonから操作する {#runtime-api}

生成時に **Generate Runtime API** をONにすると、`Udon`フォルダーへParameterのenum、Handleと取得用拡張メソッド、asmdef、U# Assembly Definitionの4ファイルが追加されます。Editor側の参照も設定されます。OFFでも通常のPreview・Playと対応項目のLive Inspector編集は使用できます。

初期値の名前では、生成namespaceは`MyCompany.FluxFX.CustomAcceleration.Udon`、取得メソッドは`system.Modules.CustomAcceleration()`です。`system`にはFluxParticleSystemを使います。対象モジュールが組み込まれていない場合、取得結果はnullです。

Handleには`GetStrength`／`SetStrength`、`GetDirection`／`SetDirection`、`GetEnabled`／`SetEnabled`があります。変更はRuntime限りで、Authoringの保存値を書き換えません。独自asmdefの呼び出し元には生成された`R.Udon`への参照が必要です。Handleをフィールドへ保持するときは、[既存のRuntime APIの例](./runtime-parameters.md)と同様にobject型で保持して利用時にキャストします。

## 名前・配置で困ったとき {#constraints}

- Module NameはASCII英字・数字・underscoreによるC#識別子で64文字以内、Namespaceは識別子をドットでつなぎ128文字以内です。先頭の数字・予約語・Windowsデバイス名・既存Runtime APIのメソッド名などは使用できません。
- Parent FolderはAssets内の既存フォルダーです。Editor、Editor Default Resources、StreamingAssets配下や、シンボリックリンク・junctionには生成できません。生成パスは240文字未満に収めます。
- 既存フォルダー・ファイル・孤立した.meta、検出可能なアセンブリ名・型・IDなどの衝突は生成前に拒否されます。名前の大文字小文字だけを変えても別Module IDにはなりません。
- 保存済みModuleのクラス名・namespace・アセンブリ名の変更はSerializeReferenceの互換性に関わるため、移行が必要です。asmdefとU#参照、.metaの整合を保持してください。

生成処理は既存の速度Writerの後へ接続します。独自のWriterをさらに追加する場合は[依存関係と実行順](./custom-module-reference.md)を確認してください。独自翻訳や同期処理はテンプレートに含まれません。

## 次に読む {#next}

設定を増やすときは[カスタムモジュール](./custom-modules.md)、仕組みを理解するときは[全体構成](./architecture.md)と[データと実行モデル](./data-and-execution.md)へ進んでください。生成テンプレートは一定の加速度、Custom Liftの手動作成例は時間で強さが変わる加速度を扱います。
