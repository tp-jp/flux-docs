# カスタムモジュール {#custom-modules}

カスタムモジュールを作ると、独自の粒子処理をInspectorの **Add Module** から追加できます。ここでは、FluxFX 0.0.3の実装例`CustomLift`を基に、時間で強さが変わる加速度を追加します。モジュール作者向けの章です。[モジュールの基本](./modules.md)と[実行時のパラメーター変更](./runtime-parameters.md)を先に確認してください。

## この章の進め方 {#reading-guide}

[クイックスタート](./quickstart.md)でFluxParticleSystemを配置し、プレビューできるプロジェクトを用意してください。この章では、Inspectorから追加でき、UdonSharpから強さ・方向・有効状態を変えられるCustomLiftを作ります。

1. [全体像](#overview)で、設定・契約・処理・ハンドルのつながりを確認します。
2. [必要なファイル](#structure)から順にコードを作り、[Inspectorで追加して確認する](#try-it)まで進めます。
3. 独自の処理へ変更するときに、後半の[Value ID一覧](#standard-value-ids)と[Operation ID・実行順](#standard-operation-ids)を参照します。

コード例はファイルごとに分かれています。途中では未作成のクラスへの参照があるため、必要なファイルを揃えてからコンパイル結果を確認してください。

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

Module IDはモジュール種別、Parameter IDは設定値、Value IDは計算で扱うデータ、Operation IDは処理を識別します。CustomLiftではそれぞれ`custom.fluxfx.lift`、`custom-lift.strength`、`particle.velocity`、`custom-lift`です。似た名前でも用途が異なります。

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

`Editor/CustomLiftDefinition.cs`に保存します。`FluxParticleModuleDefinition<CustomLiftModule>`を継承し、`ModuleId`と型付きの`Contribute`をoverrideします。基底クラスが`ModuleType`を型引数から決め、設定を`CustomLiftModule`として渡すため、手動のキャストは不要です。

```csharp
using TpLab.Flux.FX.Editor.Compilation.Definitions;
using TpLab.Flux.FX.Editor.Modules;
using TpLab.Flux.FX.Editor.Modules.Shared;

namespace TpLab.Flux.FX.CustomModules.Editor
{
    public sealed class CustomLiftDefinition : FluxParticleModuleDefinition<CustomLiftModule>
    {
        public override string ModuleId => CustomLiftContract.Module.Id;

        public override void Contribute(CustomLiftModule lift, FluxParticleProgramContribution context)
        {
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
| `FluxParticleModuleDefinition<CustomLiftModule>` | 対象の設定クラスを指定する。`ModuleType`は基底クラスが提供する |
| `ModuleId` | ContractのModule IDを返す |
| `Contribute(CustomLiftModule lift, ...)` | 型付きの設定を受け取り、処理を登録する |
| `Bind` | ContractにInspectorの初期値を割り当てる |
| `reads` | 速度、更新の経過秒数、シミュレーション時間を読む |
| `writes` | `particle.velocity`を変更する |
| `hlslPath`・`entryPoint` | HLSLファイルと関数名を指定する |
| `switchable: true` | Enabledで処理の有効・無効を切り替える |
| `Complete()` | パラメーターの対応を検証し、実行時ハンドルへのBindingを確定する |

`step.time`のUniform Providerは、まだ登録されていない場合だけ追加します。パラメーターを契約に追加したら、対応するBindも追加してください。現在の構成では使わない項目は`UnavailableParameter`で明示します。

基底クラスは`IFluxParticleModuleDefinition`を実装しているため、継承したDefinitionもEditorが自動発見します。登録されるクラスは非abstractで、未指定の型パラメーターを持たず、公開された引数なしコンストラクターが必要です。この例の`CustomLiftDefinition`は条件を満たします。手動の登録メニューやパッケージ本体への追記は不要です。

### 処理順に注意する {#execution-order}

この例の`optionalDependencies`は、[速度の処理列](#operation-pipelines)に存在する標準Writerの後へ配置する指定です。Gravity、Force、Noise、Vortex、Drag、Limit Velocityの後で加速し、これらの標準モジュールがなくても使えます。

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

## 独自のモジュールへ変更する {#adapt-example}

CustomLiftが動いたら、変更したい内容に応じて次の部分を揃えます。

| 変更したいこと | 変更する部分 |
| --- | --- |
| 別のモジュールとして追加する | クラス名・名前空間・Module ID・Parameter ID・Operation IDを固有のものにし、Definition・Handleの参照、HLSLのContext名・関数名・パスを揃える |
| 設定項目を追加する | Moduleの保存フィールド、Contractとenum、DefinitionのBindと使用Parameter、Handleの取得・設定メソッドを追加する |
| 粒子の計算式を変える | HLSLを変更する。使う値が変わる場合はDefinitionのreads・writes・parametersも変更する |
| 他のモジュールと組み合わせる | 同じValueを書くOperationとの順序を宣言し、併用時と未追加時を確認する |

例えばStrengthを使う式だけを変えるなら、IDやハンドルを変更する必要はありません。新しいParameterをHLSLで使う場合は、ContractとBindだけでなく、Operationの`parameters`にも含めます。HLSLのContextのフィールドは、このOperationの宣言から生成されます。

## 標準のValue ID {#standard-value-ids}

`step.time`や`particle.velocity`は、FluxFXが定義する**Value ID**です。`custom-lift.strength`のようにContractで宣言する**Parameter ID**とは別の種類です。ValueはOperationの`reads`・`writes`で参照し、Parameterは`parameters`で指定します。同じ文字列でも種類が違う場合があり、例えば`render.size`にはValueとParameterの両方があります。

以下の標準IDは、独自の値の名前として使わないでください。標準のValueを読むときは既存の定義を参照し、`AddValue`で再登録しません。実装は接頭辞全体を予約語として禁止する方式ではなく、登録済みの同種のIDとの重複を拒否します。独自IDには固有の接頭辞を付けます。

### Coreが定義する値 {#core-values}

FluxFX 0.0.3のCoreは、次の13個のValueを定義します。型名は`FluxParticleValueType`の値です。「変更可」は`SharedMutable`を表し、書き込みにはOperationの宣言と適切な処理順が必要です。

| Value ID | 型 | 用途 | カスタムOperationからの書き込み |
| --- | --- | --- | --- |
| `particle.position` | Float3 | シミュレーション空間での粒子の位置 | 変更可 |
| `particle.velocity` | Float3 | シミュレーション空間での粒子の速度 | 変更可 |
| `particle.age` | Float | 粒子の年齢（秒）。生存判定にも使う | 不可：SystemManaged |
| `particle.spawn-key` | UInt | 粒子に保持する生成キー。乱数の再現などに使う | 不可：SystemManaged |
| `particle.lifetime` | Float | 粒子の寿命（秒） | 不可：ReadOnly |
| `particle.start-color` | Float4 | 初期色（RGBA） | 不可：ReadOnly |
| `particle.start-size` | Float | 初期サイズ | 不可：ReadOnly |
| `render.size` | Float | 描画時のサイズ | 変更可 |
| `render.uv-transform` | Float4 | 描画UVの倍率（xy）とオフセット（zw） | 変更可 |
| `render.color` | Float4 | 描画時の色（RGBA） | 変更可 |
| `step.time` | Float | システム共通のシミュレーション時間（秒） | 不可：ReadOnly |
| `step.delta-time` | Float | 今回の更新間隔（秒） | 不可：ReadOnly |
| `spawn.key` | UInt | 生成時に供給されるキー | 不可：ReadOnly |

`SystemManaged`はCoreが管理する値です。カスタムモジュールからは読み取りだけに使います。`ReadOnly`の値も、Operationの`writes`には指定できません。

Valueが定義されていることと、値を供給するProviderが登録されていることは別です。`step.delta-time`と`spawn.key`、寿命・初期色・初期サイズのProviderは標準の構築処理が登録します。**`step.time`のProviderは必要とするモジュールが登録します。** CustomLiftの例と同様に、`context.Providers.ContainsKey("step.time")`で重複を避けてUniform Providerを追加します。

### 設定に応じて追加される値 {#conditional-values}

次のValueはすべての構成に存在するわけではありません。

| Value ID | 型・書き込み方針 | 追加される条件と用途 |
| --- | --- | --- |
| `emitter.row0`・`emitter.row1`・`emitter.row2` | Float4・ReadOnly | Simulation SpaceがWorld。エミッターのlocal-to-world行列の先頭3行 |
| `spawn.direction` | Float3・ReadOnly | ShapeがSphere・Hemisphere・Circle・Cone。生成方向を供給する |
| `render.rotation` | Float3・SharedMutable | Start Rotationがランダム、定数がゼロ以外、またはこのValueへ書くOperationがある。描画時の回転 |
| `particle.start-rotation` | Float3・ReadOnly | Start RotationがRandom Between Two Constants。粒子ごとの初期回転 |

標準モジュールが追加する補助Valueもあります。以下はモジュールやモードに依存するため、常に存在する共通入力としては扱いません。いずれもReadOnlyです。

| Value ID | 型 | 登録するモジュール・条件 |
| --- | --- | --- |
| `velocity-over-lifetime.center-offset` | Float3 | Velocity over Lifetime |
| `color.normalized-age`・`color.gradient` | Float・Float4 | Color over LifetimeのGradientモード |
| `size.normalized-age`・`size.curve` | Float・Float | Size over LifetimeのCurveモード |
| `rotation.normalized-age`・`rotation.curve` | Float・Float | Rotation over LifetimeのCurveモード |

独自の正規化年齢やCurve・Gradientが必要な場合は、`contribution.NormalizedAge`・`Curve`・`Gradient`へ独自IDを渡して登録できます。

### 読み取る値の時点を指定する {#value-read-versions}

Value IDだけでなく、`FluxParticleValueRead`の第2引数で読み取り方を指定します。

| ReadVersion | 用途 |
| --- | --- |
| `Provided` | Providerが供給する値。時間、寿命、初期色など。Providerの登録と、そのPhaseで利用可能な入力が必要 |
| `StepPrevious` | Updateで、更新前の粒子状態を読む。速度の処理列では先行Writerの結果へ接続される場合がある |
| `AfterOperation` | 同じPhase内の指定したOperationが書いた結果を読む。第3引数にOperation IDを指定する |
| `Committed` | Renderで、更新済みの粒子状態を読む |

例えばCustomLiftは`particle.velocity`を`StepPrevious`、`step.time`と`step.delta-time`を`Provided`で読みます。Valueが存在しない、Providerがない、Phaseや依存関係が合わない場合は構成のコンパイルに失敗します。

## 標準のOperation IDと実行順 {#standard-operation-ids}

Operation IDは、処理そのものを識別するIDです。Value IDやModule IDとは別で、依存関係にはこのOperation IDを指定します。例えばGravityのOperation IDは`gravity`です。同じOperation IDの重複登録はできません。以下はFluxFX 0.0.3の標準構成が登録する処理です。

### Coreと設定から追加される処理 {#core-operations}

| Operation ID | Phase | 役割・追加条件 |
| --- | --- | --- |
| `spawn.position` | Spawn | 粒子の位置と年齢を初期化する。Shape・Simulation Spaceに応じて実装が変わる |
| `spawn.velocity` | Spawn | 粒子の速度と生成キーを初期化する。Start Speedなどに応じて実装が変わる |
| `velocity.identity` | Update | 速度をそのまま次の状態へ渡す。速度を書くUpdate Operationが一つもない場合だけ追加される |
| `motion` | Update | 最後の速度更新結果から位置を進め、年齢を更新する |
| `render.start` | Render | 初期色から描画色を設定する |
| `render.uv-start` | Render | UV変換を倍率1・オフセット0に設定する |
| `render.size-start` | Render | 初期サイズから描画サイズを設定する |
| `render.rotation-start` | Render | 初期回転から描画回転を設定する。`render.rotation`が必要な構成で追加される |
| `render.intensity` | Render | 描画色にRendererのIntensityを適用する。他の描画色Writerの後に配置される |

### 標準モジュールが追加する処理 {#module-operations}

対応するモジュールを追加すると登録されます。EnabledをオフにしてもOperationは残るため、依存先としての有無はEnabledでは判断しません。

| Operation ID | Phase | モジュール・主な出力 |
| --- | --- | --- |
| `gravity` | Update | Gravity：速度 |
| `force` | Update | Force：速度 |
| `noise` | Update | Noise：速度 |
| `vortex` | Update | Vortex：速度 |
| `drag` | Update | Drag：速度 |
| `limit-velocity` | Update | Limit Velocity：速度 |
| `velocity-over-lifetime` | Update | Velocity over Lifetime：`motion`の後で位置を変更する |
| `render.color` | Render | Color over Lifetime：描画色 |
| `render.blink` | Render | Blink：描画色 |
| `render.size-over-lifetime` | Render | Size over Lifetime：描画サイズ |
| `render.rotation-over-lifetime` | Render | Rotation over Lifetime：描画回転 |
| `render.texture-sheet-animation` | Render | Texture Sheet Animation：描画UV変換 |

TrailsはこのOperation一覧には入りません。パラメーターとハンドルの対応を登録し、履歴更新・描画は別の処理で行います。また、この章で作成する`custom-lift`はサンプル独自のIDです。

### 依存関係の指定方法 {#operation-dependencies}

依存先は「自分より前に実行する処理」です。`A`に`B`への依存を指定すると、実行順は`B → A`になります。通常の`dependencies`と`AfterOperation`は同じPhase内の処理を指定します。Spawn・Update・Renderをまたぐ依存は指定できません。

| 指定方法 | 意味・使いどころ |
| --- | --- |
| `dependencies: new[] { "motion" }` | 必須の先行処理。順序を指定するだけで、読み取るValueは別途宣言する。対象がないとエラー |
| `new FluxParticleValueRead("particle.position", FluxParticleReadVersion.AfterOperation, "motion")` | `motion`が書いた位置を読む。`contribution.Operation`はこの読み取りから必須依存も追加する |
| `optionalDependencies: new[] { "gravity", "force" }` | 対象が存在する場合のWriter順序制約。現在は後述の速度・描画色の処理列に限って解決される |

`AfterOperation`では、指定した処理がそのValueを書いている必要があります。独自Operationに名前を付けただけでは順序は決まりません。Inspectorでの追加順、Stage、IDの名前順に頼らず、必要な依存関係を宣言します。

### 自動で接続される処理列 {#operation-pipelines}

標準のビルド処理は、**Updateの`particle.velocity`**と**Renderの`render.color`**について、Writer間の順序を解決します。`optionalDependencies`は、依存元・依存先の両方がその処理列のWriterである場合だけ使われます。別のValueへの書き込みや別PhaseのOperationを指定しても、この指定では順序は付きません。

標準モジュールがすべて存在する場合の主な順序は次のとおりです。省略したモジュールは列から外れます。

```text
Update: gravity → force → noise → vortex → drag → limit-velocity → motion → velocity-over-lifetime
Render: render.start → render.color → render.blink → render.intensity
```

速度の最後のWriterの結果は`motion`へ渡されます。速度Writerがなければ`velocity.identity → motion`になります。描画サイズ・回転・UVの処理は、それぞれの`render.*-start`への必須依存で接続されます。これらと描画色の列の間に一律の実行順があるわけではありません。

速度・描画色の列では、各Writerの入力が直前のWriterの結果へ接続し直されます。例えばBlinkは`render.start`を読む宣言ですが、Color over Lifetimeもある場合はその結果を受け取ります。一方、任意のValueで同じ自動接続が行われるわけではありません。

### カスタム処理の順序を決める例 {#custom-operation-order}

CustomLiftの例では、標準の速度Writerをすべて`optionalDependencies`に指定しています。結果は`… → limit-velocity → custom-lift → motion`となり、CustomLiftで追加した速度も位置の更新に使われます。ただし、その追加分には同じ更新のDragやLimit Velocityは適用されません。

別のカスタム速度WriterをCustomLiftの後に置く場合は、そのOperationに`dependencies: new[] { "custom-lift" }`を指定できます。この場合はCustomLiftも必須です。CustomLiftがない構成も許可するなら、`optionalDependencies`に`custom-lift`を加え、標準の速度Writerとの順序も明示します。

位置を`motion`の後に変更する処理では、上表の`AfterOperation`で`particle.position`を読み、同じValueを書きます。Velocity over Lifetimeも使うなら、その処理との前後関係も指定してください。位置の処理には`optionalDependencies`による自動接続はありません。

同じPhaseで同じValueを書く複数の処理には、互いの順序が必要です。順序が一意に決まらない、依存が循環する、必須の対象がない場合はエラーになります。特に`render.intensity`は他の描画色Writerを先行させるため、独自の描画色Writerから`render.intensity`への依存を追加すると循環します。

## 問題が起きたとき {#troubleshooting}

| 症状 | 確認すること |
| --- | --- |
| Add Moduleに表示されない | Definitionのコンパイル、基底クラスに指定したModule型、Serializable、引数なしコンストラクターを確認する。同じ型を追加済みならメニューには出ない |
| `Duplicate Module ID` / `Duplicate Module type` | 同じサンプルや定義を二重に導入していないか |
| `Unassigned Module handle slot` | Contractの全項目をBindまたはUnavailableParameterで処理し、Completeを呼んでいるか |
| HLSLが見つからない・コンパイルに失敗する | パス、entryPoint、Context名、フィールド名、型が一致しているか |
| Writerの順序や依存関係のエラー | 同じ値を更新するOperationの順序を明示しているか、循環がないか |
| UdonSharpからHandleを使えない | U# Assembly DefinitionのSource Assembly、参照アセンブリ、コンパイル分岐を確認する |
| `CustomLift()`がnull | 対象システムにモジュールを追加し、実行用構成を生成したか |
| 無効にしてもビルドエラーが残る | 無効化してもDefinitionは収集される。定義を修正するかモジュールを削除する |

FluxFXは開発初期段階です。更新時はModule、Contract、Definition、HandleのAPIを合わせて確認してください。
