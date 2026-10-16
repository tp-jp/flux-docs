# カスタムモジュール {#custom-modules}

カスタムモジュールを作ると、独自の粒子処理をInspectorの **Add Module** から追加できます。ここでは、FluxFX 0.0.3の実装例`CustomLift`を基に、時間で強さが変わる加速度を追加します。モジュール作者向けの章です。[モジュールの基本](./modules.md)と[実行時のパラメーター変更](./runtime-parameters.md)を先に確認してください。

## カスタムモジュールの全体像 {#overview}

カスタムモジュールは、Inspectorに保存した設定を使って、FluxFXの粒子処理に独自の計算を組み込む仕組みです。この章のCustomLiftでは、利用者がStrength（加速度の強さ）とDirection（方向）を設定し、GPUが更新ごとに粒子の速度へ加速度を加えます。UdonSharpからは、実行中にその強さや方向を変更できます。

設定を保存するクラス、処理を組み立てるEditorコード、GPUで動くHLSL、UdonSharpから操作するハンドルを分けて用意します。各部分の役割は次のとおりです。

| 構成 | 役割 |
| --- | --- |
| Module | Inspectorに保存する設定。`FluxParticleModule`を継承する通常のC#クラス |
| Contract | パラメーターのID・型・変更方針と、ハンドルで使う番号を定義する |
| Definition | Moduleの設定からパラメーター、読み書きする値、実行処理を登録するEditorコード |
| HLSL | GPUで行う粒子処理 |
| Handleと拡張メソッド | UdonSharpから設定を変更するための入口 |

Module自体はUdonSharpBehaviourでもGameObjectへ追加するComponentでもありません。Inspectorのモジュール一覧に保存し、ビルド時にGPU処理へ変換します。HLSLだけを置いてもモジュールとして登録されません。

### 設定から実行までの流れ {#lifecycle}

1. **Inspectorで設定する**：ModuleがStrengthやDirectionの値を保存します。Definitionが登録されたModuleはAdd Moduleから追加できます。
2. **Editorで処理を組み立てる**：プレビューや実行用構成を生成するとき、DefinitionがModuleの値を読み、Contractに従って初期値を登録します。同時に、どの粒子データを読み書きし、どのHLSL関数を呼ぶかを指定します。
3. **FluxFXが実行用データを生成する**：登録内容から処理順を解決し、シェーダーやパラメーター、ハンドル用の対応情報を生成します。
4. **GPUで粒子を更新する**：生成された処理がHLSL関数を呼び出します。HLSLは渡された値を使って粒子の速度などを計算します。
5. **UdonSharpから値を変える**：Handleを通じて実行用パラメーターを変更します。`Live`の値は以降の計算で使われます。これはInspectorに保存したModuleのフィールドを書き換える操作ではありません。

### ContractとDefinitionの違い {#contract-and-definition}

**Contract（契約）は、パラメーターのルールです。** 例えばStrengthについて、「IDは`custom-lift.strength`、型はfloat、実行中の変更を許可する」と宣言します。また、そのパラメーターをハンドルの何番で扱うかも決めます。粒子の加速方法やInspectorで設定した値そのものは、Contractには記述しません。

**Definition（定義）は、そのルールを使って処理を登録するコードです。** Moduleから読み取ったStrengthを`Bind`でContractへ結び付け、計算の入力・出力とHLSLを指定します。実際の「方向 × 強さ × 更新間隔を速度へ加える」という式はHLSLに書きます。

Strengthを例にすると、次のようにつながります。

| 部分 | Strengthの扱い |
| --- | --- |
| Module | Inspectorで指定した値を保存する。初期値は2 |
| Contract | `custom-lift.strength`をfloat・`Live`として宣言し、`CustomLiftParameter.Strength`の番号に対応させる |
| Definition | `Bind`でModuleの値を初期値として登録し、Operationが使うパラメーターに含める |
| HLSL | `ctx.parameterCustomLiftStrength`として受け取り、加速度を計算する |
| Handle | `SetStrength(5f)`などの呼び出しを、対応する実行用パラメーターの変更へつなぐ |

### GPU処理の登録に使う用語 {#processing-terms}

| 用語 | 意味とこの例での使い方 |
| --- | --- |
| Parameter | 設定として渡す値。StrengthやDirectionなど。粒子ごとに別の値を持つものではない |
| Value | 計算で読み書きする値。`particle.velocity`は粒子ごとの速度、`step.time`はシステム共通の時間 |
| Provider | Valueを供給する仕組み。ここでは`step.time`をUniformとしてGPUへ渡す |
| Operation | 一つの処理の登録。実行するPhase、読むValue、書くValue、使用するParameter、HLSL関数、依存関係をまとめる |
| Context | HLSL関数に渡される構造体。Operationの宣言を基にFluxFXが生成し、必要なValueとParameterをフィールドとして持つ |

CustomLiftのOperationはUpdateで動き、速度と時間を読み、速度を書き換えます。読み書きするValueと処理間の依存関係を宣言することで、FluxFXが他のモジュールと組み合わせた処理順を決められます。Inspectorの表示グループを決めるStageとは役割が異なります。

## 必要なファイル {#structure}

以下は利用先プロジェクトのAssets内へ作成する例です。VCCで導入したパッケージにサンプルフォルダーが存在することは前提にしていません。同名のCustomLiftを既に導入している場合は重複作成せず、既存の定義を使ってください。

```text
Assets/FluxFX/Samples/CustomLift/
├─ Runtime/
│  ├─ CustomLiftModule.cs
│  ├─ CustomLiftIds.cs
│  ├─ CustomLiftParameter.cs
│  ├─ CustomLiftHandle.cs
│  ├─ TpLab.Flux.FX.Samples.CustomLift.asmdef
│  └─ TpLab.Flux.FX.Samples.CustomLift.asset  ← U# Assembly Definition
└─ Editor/
   ├─ CustomLiftContract.cs
   ├─ CustomLiftDefinition.cs
   └─ CustomLift.hlsl
```

## アセンブリを準備する {#assemblies}

Runtimeフォルダーに次のasmdefを作成します。UdonSharp用ハンドルを含むため、通常のUnityのアセンブリ定義に加え、U# Assembly Definitionも必要です。

```json
{
  "name": "TpLab.Flux.FX.Samples.CustomLift",
  "rootNamespace": "TpLab.Flux.FX.CustomModules",
  "references": [
    "VRC.Udon",
    "UdonSharp.Runtime",
    "TpLab.Flux.FX.Udon",
    "TpLab.Flux.FX.Scripts"
  ],
  "autoReferenced": true
}
```

Unityでこのasmdefを選び、**Assets → Create → U# Assembly Definition** を実行します。生成されたアセットの **Source Assembly** が上のasmdefを参照していることを確認してください。

この配置ではEditorフォルダーはRuntimeのasmdefの外側です。独自の親asmdefがない場所へ置き、Editorコードは通常のEditorアセンブリでコンパイルします。既存のasmdef配下へ組み込む場合は、Editor専用アセンブリを分け、Runtime側のアセンブリ、`TpLab.Flux.FX.Editor`、`TpLab.Flux.FX.Editor.Contracts`、`TpLab.Flux.FX.Scripts`への参照を揃えます。Runtime側からEditorコードを参照しないでください。

## Inspectorの設定クラスを作る {#module-settings}

`Runtime/CustomLiftModule.cs`に保存します。初期値はStrengthが2、Directionが上方向です。

```csharp
using System;
using TpLab.Flux.FX.Scripts.Modules;
using UnityEngine;

namespace TpLab.Flux.FX.CustomModules
{
    [Serializable]
    public sealed class CustomLiftModule : FluxParticleModule
    {
        [SerializeField]
        float strength = 2.0f;

        [SerializeField]
        Vector3 direction = Vector3.up;

        public float Strength => strength;

        public Vector3 Direction => direction;

        public override FluxParticleExecutionStage Stage => FluxParticleExecutionStage.VelocityUpdate;

        public override FluxParticleAttribute ReadAttributes => FluxParticleAttribute.Velocity;

        public override FluxParticleAttribute WriteAttributes => FluxParticleAttribute.Velocity;
    }
}
```

`[Serializable]`と公開された引数なしコンストラクターが必要です。このクラスではコンストラクターを省略しているため、自動的に条件を満たします。`[SerializeField]`のフィールドが設定として保存されます。基底クラスのEnabledを引き継ぐため、同じ有効フラグを追加する必要はありません。

StageはInspectorの表示グループを決めます。読み書きする属性も処理に合わせて宣言しますが、これだけではHLSLの実行順や入出力は登録されません。後述するDefinitionで具体的な処理を登録します。

## IDとパラメーターの契約を作る {#parameter-contract}

`Runtime/CustomLiftIds.cs`に、ModuleのIDを置きます。

```csharp
namespace TpLab.Flux.FX.CustomModules
{
    public static class CustomLiftIds
    {
        public const string Module = "custom.fluxfx.lift";
    }
}
```

`Runtime/CustomLiftParameter.cs`に、ハンドルとContractで共有する番号を定義します。

```csharp
namespace TpLab.Flux.FX.CustomModules
{
    public enum CustomLiftParameter
    {
        Strength,
        Direction
    }
}
```

`Editor/CustomLiftContract.cs`に保存します。

```csharp
using TpLab.Flux.FX.Editor.Contracts;
using UnityEngine;

namespace TpLab.Flux.FX.CustomModules.Editor
{
    public static class CustomLiftContract
    {
        public static FluxParticleParameterContract<float> Strength { get; } =
            FluxParticleParameter.Float("custom-lift.strength")
                .ApiName("Strength")
                .Policy(FluxParticleParameterPolicy.Live)
                .Build();
        public static FluxParticleParameterContract<Vector3> Direction { get; } =
            FluxParticleParameter.Vector3("custom-lift.direction")
                .ApiName("Direction")
                .Policy(FluxParticleParameterPolicy.Live)
                .Build();
        public static FluxParticleModuleContract Module { get; } =
            new FluxParticleModuleContractBuilder(CustomLiftIds.Module)
                .Handle("CustomLiftHandle")
                .Accessor("CustomLift")
                .Enabled("custom-lift.enabled")
                .Parameter(CustomLiftParameter.Strength, Strength)
                .Parameter(CustomLiftParameter.Direction, Direction)
                .Build();
    }
}
```

Strengthはfloat、DirectionはVector3で、どちらも`Live`なので実行中に変更できます。この契約では負のStrengthも許可します。NaNやInfinityは拒否されます。`Static`を選ぶと初回シミュレーション更新後の変更が制限されます。

enumの番号は0から連続させ、ContractとHandleで同じ対応を使います。Module ID、Parameter ID、後述するOperation IDは他のモジュールと衝突しない値にしてください。独自モジュールへ発展させるときは、自分の名前空間や固有の接頭辞へ変更し、参照先も揃えます。

`.Handle()`と`.Accessor()`は契約に名前を宣言します。この記述だけでC#のハンドルクラスや取得メソッドが作成されるわけではなく、後述のコードも用意します。

## GPU処理を登録する {#definition}

`Editor/CustomLiftDefinition.cs`に保存します。

```csharp
using System;
using TpLab.Flux.FX.Editor.Compilation.Definitions;
using TpLab.Flux.FX.Editor.Modules;
using TpLab.Flux.FX.Editor.Modules.Shared;
using TpLab.Flux.FX.Scripts.Modules;

namespace TpLab.Flux.FX.CustomModules.Editor
{
    public sealed class CustomLiftDefinition : IFluxParticleModuleDefinition
    {
        public Type ModuleType => typeof(CustomLiftModule);

        public string ModuleId => CustomLiftContract.Module.Id;

        public void Contribute(FluxParticleModule module, FluxParticleProgramContribution context)
        {
            var lift = (CustomLiftModule)module;
            var contribution = new FluxParticleModuleContribution(context, CustomLiftContract.Module, lift.Enabled);
            var strength = contribution.Bind(CustomLiftContract.Strength, lift.Strength);
            var direction = contribution.Bind(CustomLiftContract.Direction, lift.Direction);
            if (!context.Providers.ContainsKey("step.time"))
            {
                context.AddProvider(new FluxParticleValueProvider("step.time", FluxParticleProviderKind.Uniform));
            }
            contribution.Operation("custom-lift", FluxParticlePhase.Update,
                reads: new[]
                {
                    new FluxParticleValueRead("particle.velocity", FluxParticleReadVersion.StepPrevious),
                    new FluxParticleValueRead("step.delta-time", FluxParticleReadVersion.Provided),
                    new FluxParticleValueRead("step.time", FluxParticleReadVersion.Provided)
                },
                writes: new[] { new FluxParticleValueWrite("particle.velocity", FluxParticleWriteKind.Modify) },
                hlslPath: "Assets/FluxFX/Samples/CustomLift/Editor/CustomLift.hlsl", entryPoint: "FluxFX_CustomLift",
                switchable: true, parameters: new[] { strength, direction },
                optionalDependencies: new[] { "gravity", "force", "noise", "vortex", "drag", "limit-velocity" });
            contribution.Complete();
        }
    }
}
```

| 登録 | この例の意味 |
| --- | --- |
| `ModuleType` | 設定クラスとの対応 |
| `Bind` | ContractにInspectorの初期値を割り当てる |
| `reads` | 速度、更新の経過秒数、シミュレーション時間を読む |
| `writes` | `particle.velocity`を変更する |
| `hlslPath`・`entryPoint` | HLSLファイルと関数名を指定する |
| `switchable: true` | Enabledで処理の有効・無効を切り替える |
| `Complete()` | パラメーターの対応を検証し、実行時ハンドルへのBindingを確定する |

`step.time`のUniform Providerは、まだ登録されていない場合だけ追加します。パラメーターを契約に追加したら、対応するBindも追加してください。現在の構成では使わない項目は`UnavailableParameter`で明示します。

Definitionは`IFluxParticleModuleDefinition`の実装としてEditorが自動発見します。非abstract・非ジェネリックで、公開された引数なしコンストラクターが必要です。手動の登録メニューやパッケージ本体への追記は不要です。

### 処理順に注意する {#execution-order}

`optionalDependencies`は、指定したOperationが存在するとき、その後へ配置する指定です。この例はGravity、Force、Noise、Vortex、Drag、Limit Velocityの後で加速します。これらの標準モジュールがなくても使えます。

したがって、**この例で加えた速度には、その更新のDragやLimit Velocityは適用されません**。最大速度で制限したい場合は、速度を書き換えるOperation間の依存関係を見直します。Inspectorで追加する順番やStageを変えるだけでは順序を指定できません。

速度の処理列では、コンパイラーが先行するWriterの結果へ読み取りを接続します。`StepPrevious`が書かれていても、標準モジュールの計算結果を常に無視するという意味ではありません。複数のカスタムモジュールが同じ値を書き換える場合も、順序を明確にし、循環依存を避けます。

## HLSLを書く {#hlsl}

`Editor/CustomLift.hlsl`に保存します。フォルダーを変えた場合はDefinitionの`hlslPath`も変更してください。

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

`FluxCustomLiftContext`はOperation IDの`custom-lift`から生成されます。Contextを自分で再定義する必要はありません。宣言した値とパラメーターが次のフィールドへ対応します。

| ID | Contextのフィールド |
| --- | --- |
| `particle.velocity` | `valueParticleVelocity` |
| `step.delta-time` | `valueStepDeltaTime` |
| `step.time` | `valueStepTime` |
| `custom-lift.strength` | `parameterCustomLiftStrength` |
| `custom-lift.direction` | `parameterCustomLiftDirection` |

強さは`0.5 + 0.5 * sin(time * 2)`で0〜1倍に変化し、Direction × 強さ × 更新間隔（秒）を速度へ加算します。`step.time`はシステム共通のシミュレーション時間で、粒子ごとの年齢ではありません。そのため、発生時刻が異なる粒子も同じタイミングで加速度が変化します。

Directionは粒子のシミュレーション空間で指定し、正規化されません。長さを2にすると加速度も2倍、ゼロなら加速せず、負のStrengthなら方向が逆になります。Enabledをオフにすると加速度の追加が止まりますが、すでに得た速度は残ります。

## UdonSharp用ハンドルを作る {#runtime-handle}

`Runtime/CustomLiftHandle.cs`に保存します。

```csharp
using TpLab.Flux.FX.Udon.Parameters;
using TpLab.Flux.FX.Udon;
using TpLab.Flux.FX.Udon.Modules;
using UnityEngine;

namespace TpLab.Flux.FX.CustomModules
{
    public class CustomLiftHandle : FluxParticleModuleHandle
    {
    }

    public static class CustomLiftHandleExtensions
    {
        public static CustomLiftHandle CustomLift(this FluxParticleModules modules)
        {
#if COMPILER_UDONSHARP
            return (CustomLiftHandle)FluxParticleModuleHandleFactory.Get(modules, CustomLiftIds.Module);
#else
            return FluxParticleModuleHandleFactory.Get<CustomLiftHandle>(modules, CustomLiftIds.Module);
#endif
        }
        public static float GetStrength(this CustomLiftHandle handle) => handle.GetValue((int)CustomLiftParameter.Strength).x;
        public static bool SetStrength(this CustomLiftHandle handle, float strength) => handle.SetValue((int)CustomLiftParameter.Strength, FluxParticleValueType.Float, new Vector4(strength, 0, 0, 0));
        public static Vector3 GetDirection(this CustomLiftHandle handle) => handle.GetValue((int)CustomLiftParameter.Direction);
        public static bool SetDirection(this CustomLiftHandle handle, Vector3 direction) => handle.SetValue((int)CustomLiftParameter.Direction, FluxParticleValueType.Float3, direction);
    }
}
```

通常のC#とUdonSharpではFactoryの取得方法が異なるため、`COMPILER_UDONSHARP`の分岐を残してください。UdonではDataListを使うため、ハンドルのコンストラクターやインスタンスフィールドへ状態を持たせません。

`target.Modules.CustomLift()`で取得します。未追加ならnull、無効状態で追加済みならハンドルが返ります。`SetEnabled`は共通拡張メソッドです。同じModule IDには常に同じハンドル型を対応させてください。同じシステムのハンドルは再利用されますが、システムの差し替えや構成の再生成後は取得し直します。

実行開始後に呼ぶ操作例です。`CustomLiftControl`をU# Scriptとして作成し、TargetにPrefabルートを割り当てます。独自のasmdef配下に置く場合はCustomLiftのRuntimeアセンブリを参照してください。

```csharp
using TpLab.Flux.FX.CustomModules;
using TpLab.Flux.FX.Udon;
using TpLab.Flux.FX.Udon.Modules;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class CustomLiftControl : UdonSharpBehaviour
{
    [SerializeField]
    FluxParticleSystem target;

    public void ApplyLift()
    {
        if (target == null || target.Modules == null) return;
        var lift = target.Modules.CustomLift();
        if (lift == null) return;

        bool accepted = lift.SetStrength(5f);
        accepted &= lift.SetDirection(Vector3.right);
        accepted &= lift.SetEnabled(true);
        if (!accepted)
        {
            Debug.LogWarning("CustomLiftの一部の設定が受け付けられませんでした。");
        }
    }
}
```

Setメソッドの戻り値を確認します。複数の変更は一括処理ではなく、一部が失敗しても成功した変更は残ります。再生状態を変える場合は[再生と停止](./playback.md)のAPIを使います。

## Inspectorで追加して確認する {#try-it}

1. ファイルを保存し、UnityのC#コンパイルエラーを解消します。
2. [クイックスタート](./quickstart.md)のFluxParticleSystemを配置します。
3. **MODULES → Velocity Update → Add Module → Custom → Custom Lift Module** を選びます。表示名は型名から生成されます。
4. Mainの **Simulation Space** をLocal、Start Speedを0、Start Lifetimeを3にし、Custom Lift ModuleのStrengthを2、Directionを`(0, 1, 0)`にします。他の動きのモジュールは外して比較します。
5. プレビューをRestartし、上向きに加速する粒子を確認します。Custom Lift ModuleのEnabledをオフにし、もう一度Restartして差を確認します。
6. 通常のシーンリロードを有効にしてPlay Modeへ入り、生成エラーがないことを確認します。実行開始後に`ApplyLift`を呼び、強さと方向が変わることを確認します。

読み取り・書き込み・パラメーター型が一致していても、HLSLの式が意図どおりかは実際の表示で確認します。移動範囲を含むCulling Boundsも設定してください。

## 問題が起きたとき {#troubleshooting}

| 症状 | 確認すること |
| --- | --- |
| Add Moduleに表示されない | Definitionのコンパイル、ModuleType、Serializable、引数なしコンストラクターを確認する。同じ型を追加済みならメニューには出ない |
| `Duplicate Module ID` / `Duplicate Module type` | 同じサンプルや定義を二重に導入していないか |
| `Unassigned Module handle slot` | Contractの全項目をBindまたはUnavailableParameterで処理し、Completeを呼んでいるか |
| HLSLが見つからない・コンパイルに失敗する | パス、entryPoint、Context名、フィールド名、型が一致しているか |
| Writerの順序や依存関係のエラー | 同じ値を更新するOperationの順序を明示しているか、循環がないか |
| UdonSharpからHandleを使えない | U# Assembly DefinitionのSource Assembly、参照アセンブリ、コンパイル分岐を確認する |
| `CustomLift()`がnull | 対象システムにモジュールを追加し、実行用構成を生成したか |
| 無効にしてもビルドエラーが残る | 無効化してもDefinitionは収集される。定義を修正するかモジュールを削除する |

FluxFXは開発初期段階です。更新時はModule、Contract、Definition、HandleのAPIを合わせて確認してください。
