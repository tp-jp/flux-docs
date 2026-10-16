<span id="troubleshooting"></span>

# トラブルシューティング

Fluxが動かないときは、Consoleの最初のエラーから確認します。設定不備でUploadやReductionが中断されても、後続の処理が実行される場合があります。最後の読み戻し結果だけで判断せず、先行するエラーを解消してください。

<span id="first-checks"></span>

## 最初に確認すること

1. コンパイルエラーがある場合は、実行前に解消します。Flux、Worlds SDK、SceneFlowの導入状態は[導入](./installation.md)を参照してください。
2. InspectorのBuffer、Kernel、Shaderなどの参照を確認します。
3. Consoleで`[Flux]`を検索し、以下の該当項目を確認します。参照エラーやSceneFlowのエラーはこの文字列を含まない場合があるため、Console全体も確認します。
4. 処理を[クイックスタート](./quickstart.md)程度の要素数に縮め、Upload、Kernel、Readbackの順に問題の発生箇所を切り分けます。

<span id="compilation-or-material-generation-fails"></span>

## コンパイルやMaterial生成で止まる

<span id="flux-or-sceneflow-types-are-missing"></span>

### FluxやSceneFlowの型が見つからない

VCCのパッケージ管理画面で、Fluxと依存パッケージが導入されていることを確認します。`TpLab.Flux.Udon`が見つからない場合はFlux、`TpLab.SceneFlow.Editor`が見つからない場合はSceneFlowの導入状態と、その前に発生しているコンパイルエラーを確認してください。

<span id="kernel-parameter-calls-or-dispatch-produce-reference-errors"></span>

### Kernelのパラメーター設定やDispatchで参照エラーになる

KernelのMaterialはSceneFlowの`FluxBuildPass`が生成します。次の順で確認してください。

1. 対象のFluxKernelの **Shader** が設定されているか。
2. **Tools → SceneFlow → Debug Window** のPass一覧に`FluxBuildPass`があるか。
3. Consoleに`Error in pass FluxBuildPass`や`SceneFlow Pipeline failed`がないか。
4. シーンリロードを伴う通常のPlay Modeで実行しているか。

Pass一覧に表示されるだけでは、Materialの生成成功を意味しません。先行するPassの例外でも処理は止まります。ログを詳しく確認する場合は **Tools → SceneFlow → Enable Logging** を有効にします。

FluxBuildPassは非アクティブなGameObjectのKernelも対象にするため、現在使っていないKernelのShader設定も確認してください。

<span id="buffer-or-upload-errors"></span>

## BufferやUploadのエラー

Consoleのメッセージには、以下の文字列が含まれます。数値部分は実行時の値です。

| メッセージ | 原因と対処 |
| --- | --- |
| `Count must be between 0 and Capacity` | SetCountの値が範囲外です。0以上Capacity以下にします。容量が不足する場合は、実行前のInitial Countを見直します |
| `Upload count must match the destination count` | 配列の長さと転送先のCountが異なります。CapacityではなくCountに合わせます |
| `Upload count exceeds the maximum of 512` | 1回の転送が512要素を超えています。標準Uploadの上限内に収めます |

範囲外のSetCountはCountを変更しません。SetCountのエラーを無視すると、その後のUploadでもCount不一致が発生する場合があります。

<span id="upload-produces-reference-errors"></span>

### Uploadで参照エラーになる

配列と転送先Bufferに加え、FluxUploadの **Upload Kernel**、そのKernelの **Shader** を確認します。標準転送では`Flux/Upload`を使います。Uploadはnull参照を検証しません。

<span id="reused-buffer-data-disappears"></span>

### 再利用したBufferのデータが消える

`Release()`後の利用では、Initial Countに基づいてテクスチャが再確保されます。以前の値は保持されないので再初期化します。別のKernelへ`SetBuffer`で渡していた場合は、新しいテクスチャを設定し直してください。

<span id="unexpected-kernel-results"></span>

## Kernelの結果が期待と違う

| 症状 | 確認すること |
| --- | --- |
| 一部の要素しか更新されない | 出力先のCountを確認する。Dispatchは入力に合わせてCountを変更しません |
| 末尾に余計な値が混ざる | シェーダーでCountの範囲判定を行う。読み戻しはreadback.Countまでを使います |
| 追加Bufferを読むと値がずれる | SetBufferはサイズを送信しません。主入力とサイズを揃えるか、追加入力用のUV計算を用意します |
| パラメーターを変えても反映されない | 表示名ではなく、`_Scale`などシェーダー内の名前を指定しているか確認する |
| 入力なしのDispatchで結果が不安定 | 主入力のメタデータは更新されません。入力なし用のシェーダーが主入力の情報を参照していないか確認する |
| 反復計算が1回分ずれる | Ping-pongで参照交換を行い、最新のBufferから結果を取得しているか確認する |

入力と出力には別のBufferを使います。追加入力のBufferも出力先と共用しないでください。具体例は[Kernelとシェーダー](./kernels.md)と[Ping-pong](./ping-pong.md)を参照してください。

<span id="readback-does-not-work"></span>

## 読み戻しができない

<span id="tryrequest-returns-false"></span>

### TryRequestがfalseを返す

同じReadbackが要求を処理中、またはBuffer・通知先がnullの場合に拒否されます。拒否された要求は待ち行列に入らず、その要求の完了イベントも発生しません。現在の要求が完了してから改めて要求してください。

`Request`は受付結果を返さないため、受付を調べるときは`TryRequest`を使います。

<span id="data-is-null"></span>

### Dataがnullになる

Dataは未要求・処理中・失敗時にnullです。完了イベント内で`Succeeded`を確認してからアクセスしてください。`HasError == false`だけでは成功とは判断できません。

<span id="haserror-is-true"></span>

### HasErrorがtrueになる

GPU側の要求がエラーになったか、結果の配列取得に失敗しています。FluxReadbackはこの2つを同じ失敗状態として公開します。Consoleの描画・GPU関連エラーと、要求中にBufferを解放していないかを確認してください。

自動再試行はありません。呼び出し側で再試行する場合は、失敗を記録し、無制限に要求を繰り返さないようにします。

<span id="the-completion-callback-does-not-arrive"></span>

### 完了通知が届かない

要求が受け付けられたかを確認し、通知先に`public void _OnFluxReadbackComplete()`があるか調べます。名前は完全一致、引数はなしです。通知先とReadbackを完了まで保持してください。

<span id="a-saved-result-changes-later"></span>

### 保存した結果が後から変わる

Readbackの内部配列は再利用されます。Dataの参照を変数に保存するだけでは過去の結果を保持できません。[結果の保存方法](./readback.md#結果を保存する)に従い、成功した完了イベント内で必要な要素をコピーします。

<span id="reduction-errors"></span>

## Reductionのエラー

| メッセージ | 原因と対処 |
| --- | --- |
| `Reduction source must contain at least one element` | SourceのCountを1以上にします |
| `Reduction factor must be greater than 1` | Reduction Factorを2以上にします |
| `Reduction source and destination must be different buffers` | SourceとDestinationを分けます |
| `Reduction workspaces must be different buffers` | Workspace AとBを分けます |
| `Reduction source and destination must not use the reduction workspaces` | 4つのBufferをすべて別にします |
| `Reduction destination must have a capacity of at least 1` | Destinationが有効なBufferで、容量1以上を確保できているか確認します |
| `Reduction workspace capacity is too small. Required:` | 両Workspaceに、表示された必要容量以上を確保します |

Workspaceが実際の計算で使われない小さな入力でも、両方の参照と容量は必要です。参照エラーの場合は、全BufferとReduction Kernel、Shaderの設定も確認します。

<span id="no-error-but-the-sum-or-maximum-is-wrong"></span>

### エラーはないが合計や最大値が違う

- Reduction Factorとシェーダーが1回に読む要素数を一致させます。
- 最後の端数グループではCount外の値を読みません。
- 最大値の初期値に0を使うと、全要素が負の場合に誤ります。最初の有効要素から比較します。
- 浮動小数点の合計は計算順序で差が出るため、用途に合った許容誤差で比較します。

詳細は[Reductionによる集約](./reduction.md)を参照してください。

<span id="information-to-record"></span>

## 問題を切り分けるときに記録する情報

再現に必要なのは、Flux・Unity・Worlds SDK・SceneFlowのバージョン、実行先、最初のエラー、各BufferのCountとCapacity、使用Shader、実行順序です。小さな入力と期待値も用意すると、設定の問題と計算内容の問題を分けやすくなります。
