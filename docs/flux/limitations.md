<span id="limitations"></span>

# 制約

このページはFluxの制約をまとめています。必要な環境と導入手順は[導入](./installation.md)、エラーへの対処は[トラブルシューティング](./troubleshooting.md)を参照してください。

<span id="buffer-format-and-capacity"></span>

## Bufferの形式と容量

Bufferは正方形のARGBFloat RenderTextureです。1要素は4成分の浮動小数点データで、任意の構造体や可変長データをそのまま保存するAPIはありません。必要な情報を4成分へ割り当てるか、複数のBufferに分けます。

1辺の長さは`ceil(sqrt(Initial Count))`で決まります。Countと容量は異なり、Count外にもテクスチャ領域があります。

| 操作 | 制約 |
| --- | --- |
| Initial Count | Inspectorでは1以上を設定する |
| SetCount | 0以上Capacity以下。有効要素数のみ変更する |
| 容量変更 | 動的な拡張APIはない。必要容量を実行前に用意する |
| Countの増加 | 新しく有効になる要素の初期化は行わない |
| Release後の利用 | 初期設定で再確保する。過去のデータと変更後のCountは保持しない |

Flux独自の最大Buffer要素数は定義されていません。ただし、実際に確保できるサイズは実行環境のテクスチャ対応とGPUメモリに依存します。実装はサイズに応じた分割や、確保失敗時の代替形式への切り替えを行いません。

<span id="cpu-uploads"></span>

## CPUからのアップロード

標準のFluxUploadには次の制約があります。

- 1回の転送は512要素以下。
- 配列の長さと転送先のCountが一致していること。
- 開始位置、部分更新、追記の指定はできない。
- 戻り値や転送完了イベントはない。

512要素はUploadの上限であり、BufferやKernelの要素数上限ではありません。GPU上で初期値を生成する場合は、入力なしのKernelを使う構成も可能です。

標準UploadシェーダーはCount外へ0を書き込みます。配列を分割して同じBufferに連続Uploadしても、全体をつなげて保存する動作にはなりません。

<span id="kernel-execution"></span>

## Kernelの実行

KernelはVRCGraphics.Blitでシェーダーを実行します。APIにスレッドグループ数やPass番号を指定する引数はありません。出力サイズは出力先テクスチャによって決まり、有効範囲の処理はシェーダーが行います。

| 項目 | 呼び出し側で扱うこと |
| --- | --- |
| 入出力の参照 | null参照や同一Bufferの指定は自動検証されない。入力と出力を分ける |
| 出力のCount | Dispatchで自動変更されない。計算に合わせて設定する |
| Count外の領域 | 自動的に処理対象外にならない。シェーダーで判定する |
| 追加入力 | SetBufferはTextureのみ設定する。追加BufferのCountやサイズは必要に応じて別途渡す |
| 入力なしのDispatch | 主入力のCountやサイズは更新・リセットされない |
| パラメーター | Materialに保持される。用途を切り替える場合は設定し直す |

Materialの生成はSceneFlowのFluxBuildPassに依存します。実行時に未準備のKernelへアクセスしても、FluxKernel自身がMaterialを生成することはありません。

<span id="asynchronous-readback"></span>

## 非同期読み戻し

1つのFluxReadbackが同時に処理できる要求は1件です。追加の要求は拒否され、キューには入りません。自動再試行・キャンセル・タイムアウトを設定する公開APIもありません。

`TryRequest`のtrueは要求の受付を示すだけです。CPUで結果を使えるのは、完了通知でSucceededを確認した後になります。完了までのフレーム数はAPIで保証されません。

読み戻す配列の長さは要求時のCapacityに対応し、有効要素数は`readback.Count`で確認します。Countを小さくしても、要求はテクスチャ全体に対して行われます。標準APIには部分領域の読み戻し指定はありません。

取得配列は後続の要求で再利用されます。過去の結果を残す場合はコピーが必要です。失敗時にはDataがnullになり、詳細な失敗理由を表すプロパティは公開されません。

## Reduction

SourceのCountは1以上、Reduction Factorは2以上である必要があります。Source、Destination、Workspace A、Workspace Bはすべて別のBufferを用意し、両Workspaceに`ceil(Source.Count / Reduction Factor)`以上の容量を確保します。

集約内容はシェーダーで定義します。Reduction Factorとシェーダーの処理数の一致は自動検証されません。入力が1要素の場合でも最後のKernelは実行されるため、シェーダーは少数要素と端数に対応させます。

結果のCountは1になり、処理に使うWorkspaceのCountと内容も変更されます。Reduceには成否の戻り値がないため、設定エラーのログと計算結果を確認してください。

<span id="networking-and-numerical-behavior"></span>

## ネットワーク同期と数値の扱い

Fluxの各Udonコンポーネントは同期なしで動作します。Bufferの内容、Kernelのパラメーター、計算結果を他のクライアントへ自動配信する機能はありません。ネットワーク上で状態を共有する場合は、入力や結果の同期を呼び出し側で設計します。

GPU計算の結果を、全環境でビット単位に一致する値として扱わないでください。特にReductionでは加算順序が変わるため、CPUで順に計算した値と差が出る場合があります。比較には用途に合う許容誤差を使います。

<span id="execution-environment-and-performance"></span>

## 実行環境と性能

FluxはARGBFloatのRenderTexture、シェーダーによる描画、読み戻しを行う場合はVRCAsyncGPUReadbackを利用します。プラットフォームごとの代替処理やCPU計算への切り替えは実装されていません。対象の環境で、転送・計算・読み戻しの結果を確認してください。

実装だけから「何要素まで一定のフレームレートで動くか」は決まりません。容量、Buffer数、Dispatch回数、シェーダーの計算量、読み戻し頻度を合わせて評価します。Countを減らしてもテクスチャ容量は変わらないため、必要以上に大きいBufferを確保しない構成にします。

Fluxは開発初期段階です。バージョン更新時は、APIとパッケージ構成、利用するサンプルの前提を確認してください。
