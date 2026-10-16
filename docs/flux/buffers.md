<span id="buffers-and-data-layout"></span>

# Bufferとデータ構造

`FluxBuffer`は、GPU上で扱うデータを保持するコンポーネントです。Inspectorで必要な要素数を指定し、UploadやKernelの書き込み先として使います。

<span id="four-components-per-element"></span>

## 1要素は4成分のデータ

Bufferの1要素は、RenderTextureの1ピクセルに対応します。各要素には4成分の浮動小数点データを保存できます。成分にどのような意味を持たせるかは、用途に合わせて決めます。

| 扱う場所 | 型 | 成分の対応 |
| --- | --- | --- |
| CPUからのアップロード | `Vector4` | x、y、z、w |
| シェーダー内の計算 | `float4` | x、y、z、w |
| CPUへの読み戻し | `Color` | r、g、b、a |

例えば、XYZに3次元の座標、Wに重みを入れられます。読み戻した`Color`は色として解釈する必要はなく、`(Vector4)data[i]`で4成分の値として扱えます。

4成分では足りない場合は、複数のBufferを使い、同じインデックスの要素を対応させます。例えば座標用と速度用を分け、それぞれの要素数を揃えます。

<span id="add-a-buffer"></span>

## Bufferを配置する

GameObjectに`FluxBuffer`を追加し、Inspectorの **Initial Count** に初期の有効要素数を指定します。初期値は1です。実行時には`Start`、または`Texture`・`Count`・`Capacity`などの最初の利用時にRenderTextureが作成されます。

作成直後の内容を計算の入力として使わず、まずUploadや初期化用Kernelで必要なデータを書き込んでください。

<span id="count-and-capacity"></span>

## CountとCapacity

| プロパティ | 意味 |
| --- | --- |
| `Count` | 現在の有効要素数。処理対象はインデックス0からCount−1まで |
| `Capacity` | 確保済みの最大要素数。テクスチャの幅×高さ |
| `Texture` | Bufferが保持するRenderTexture |

テクスチャは正方形で、1辺の長さは`ceil(sqrt(Initial Count))`です。そのため、有効要素数より容量が大きくなる場合があります。

| Initial Count | テクスチャサイズ | 初期Count | Capacity |
| --- | --- | --- | --- |
| 1 | 1×1 | 1 | 1 |
| 4 | 2×2 | 4 | 4 |
| 5 | 3×3 | 5 | 9 |
| 16 | 4×4 | 16 | 16 |
| 512 | 23×23 | 512 | 529 |

<span id="change-the-valid-count"></span>

### 有効要素数を変える

次のコードは、Initial Countが5のBufferを参照する`buffer`に対して実行する例です。

```csharp
buffer.SetCount(3); // Countは3、Capacityは9のまま
buffer.SetCount(8); // 確保済みの容量内なので変更できる
```

`SetCount`で指定できるのは0以上Capacity以下です。範囲外ではエラーを出力し、Countは変更しません。Countを増やしてもデータの初期化は行われないため、新しく有効にした要素へ値を書き込んでから読み取ります。

`SetCount`はテクスチャの拡張や縮小を行いません。必要な最大要素数に合わせて、実行前にInitial Countを設定してください。確保後にInspectorの値を変更しても、その場で再確保されるわけではありません。

<span id="array-to-texture-mapping"></span>

## 配列とテクスチャの対応

データはX方向に並び、行の終わりで次のYへ進みます。幅3、Countが5の例は次のとおりです。

```text
         x=0     x=1     x=2
y=0       0       1       2
y=1       3       4      無効
y=2      無効    無効    無効
```

インデックスは`y * width + x`です。シェーダーでは[FluxCommon.hlslの補助関数](./kernels.md#indices-and-bounds)を使って、インデックスとピクセル中心のUVを変換できます。

無効な領域もテクスチャの一部です。Kernelのシェーダーでは有効範囲を判定し、読み戻し時には配列全体ではなく`readback.Count`までを読み取ります。

<span id="texture-settings"></span>

## テクスチャの設定

FluxBufferは次の設定でRenderTextureを作成します。

| 設定 | 値 |
| --- | --- |
| フォーマット | `ARGBFloat` |
| フィルタリング | `Point` |
| ラップモード | `Clamp` |
| 深度バッファ | なし |
| ミップマップ | なし |

BufferをKernelへ渡す場合は`SetBuffer`、描画など別の用途でテクスチャを参照する場合は`Texture`を使います。Bufferのデータ配置を維持するため、取得したテクスチャのサイズや設定は変更せずに使ってください。

<span id="release-and-reuse"></span>

## 解放と再利用

不要になったBufferは`Release()`でテクスチャを解放できます。GameObjectの破棄時にも自動的に解放されます。

```csharp
buffer.Release();
```

解放後、次に`Texture`・`Count`・`Capacity`などを利用すると、Initial Countに基づいて再確保されます。以前のデータや`SetCount`で変更したCountは引き継がれません。例えばInitial Countが5なら、再確保後のCountは5です。

読み戻し要求の処理中に解放しないでください。また、`SetBuffer`でKernelに設定済みのテクスチャ参照は自動で差し替わらないため、再確保後にもう一度`SetBuffer`を呼びます。

<span id="next-steps"></span>

## 次に読む

[Kernelとシェーダー](./kernels.md)で、Bufferのデータを読み取り、計算結果を別のBufferへ書き込みます。
