<span id="uploading-data"></span>

# アップロード

`FluxUpload`は、CPU上の`Vector4[]`をFluxBufferへ転送します。UdonSharpで用意した値を、GPU計算の入力や初期状態として使うためのコンポーネントです。

<span id="prepare-the-components"></span>

## コンポーネントを準備する

| コンポーネント | 設定 |
| --- | --- |
| `FluxBuffer` | Initial Countに転送する要素数を設定する |
| `FluxKernel` | ShaderにFluxパッケージの`Runtime/Shaders/FluxUpload.shader`を設定する |
| `FluxUpload` | Upload Kernelに上のFluxKernelを割り当てる |

Shaderの名前は`Flux/Upload`です。Kernel用Materialは[SceneFlow](./installation.md#sceneflowによる準備)で生成されるため、転送はその準備が済んだ実行時に行います。

<span id="upload-an-array"></span>

## 配列を転送する

次のスクリプトをUdonSharpスクリプトとして作成し、GameObjectに追加します。InspectorでBufferとUploadを割り当て、BufferのInitial Countを4にしてください。

```csharp
using TpLab.Flux.Udon;
using UdonSharp;
using UnityEngine;

[UdonBehaviourSyncMode(BehaviourSyncMode.None)]
public class FluxUploadExample : UdonSharpBehaviour
{
    [SerializeField]
    FluxBuffer buffer;

    [SerializeField]
    FluxUpload upload;

    void Start()
    {
        if (buffer == null || upload == null)
        {
            Debug.LogError("BufferとUploadを設定してください。");
            return;
        }

        var values = new Vector4[4];
        for (var i = 0; i < values.Length; i++)
        {
            values[i] = new Vector4(i, i * 2f, i * 3f, 1f);
        }

        if (buffer.Count != values.Length)
        {
            Debug.LogError("配列の長さとBufferのCountを揃えてください。");
            return;
        }

        upload.Upload(values, buffer);
    }
}
```

配列のインデックスとBufferの要素インデックスはそのまま対応します。この例では、順に`(0, 0, 0, 1)`、`(1, 2, 3, 1)`、`(2, 4, 6, 1)`、`(3, 6, 9, 1)`を書き込みます。

<span id="upload-requirements"></span>

## 転送できる条件

| 条件 | 内容 |
| --- | --- |
| 配列の長さ | 転送先の`Count`と一致していること |
| 1回の上限 | 512要素以下であること |
| 参照 | 配列、転送先、Upload Kernel、KernelのShaderが設定されていること |

`Upload`が検証するのは配列の長さと上限です。違反するとConsoleにエラーを出力し、Kernelを実行せずに戻ります。null参照の検証は行わないため、呼び出し前に準備してください。

`Upload`に戻り値や完了イベントはありません。呼び出しただけで転送結果を検証できるわけではなく、値を確認するには[非同期読み戻し](./readback.md)を使います。

<span id="count-is-not-capacity"></span>

### Countと容量を混同しない

例えばInitial Countが5なら、Countは5、Capacityは9です。この状態で必要なのは長さ5の配列です。容量に合わせて長さ9にすると、Count不一致で拒否されます。

要素数を変える場合は、転送前に`SetCount`でCountを揃えます。次は、`buffer`、`upload`、`values`を準備済みの処理例です。

```csharp
if (values.Length > 512 || values.Length > buffer.Capacity)
{
    Debug.LogError("転送上限またはBufferの容量を超えています。");
    return;
}

buffer.SetCount(values.Length);
upload.Upload(values, buffer);
```

`SetCount`では容量を増やせません。容量の決まり方は[Bufferとデータ構造](./buffers.md#countとcapacity)を参照してください。512要素という制限はFluxUploadの転送上限であり、FluxBuffer全体の容量上限ではありません。

<span id="which-pixels-are-written"></span>

## 書き込まれる範囲

Uploadは配列をKernelの`_FluxUploadData`に設定し、転送先へDispatchします。標準の転送用Shaderは、Count内に配列の値を書き込み、Count外のピクセルには0を書き込みます。

開始位置や部分更新を指定する引数はありません。短い配列で既存データの一部だけを置き換える用途では、残りのデータが保持されると考えないでください。512要素を超える配列を分割して同じBufferへ順にUploadしても、追記にはなりません。

<span id="compute-after-uploading"></span>

## 転送後に計算する

GPUで処理を続ける場合は、転送したBufferを次のKernelへ渡します。以下では`source`と`destination`は別のBufferで、Countと容量を準備済みとします。

```csharp
upload.Upload(values, source);
kernel.Dispatch(source, destination);
```

CPUで結果を使わないなら、途中で読み戻す必要はありません。CPUで確認する場合は、最後の出力Bufferに対してReadbackを要求します。シーン配置から結果の比較までの一連の例は[クイックスタート](./quickstart.md)を参照してください。
