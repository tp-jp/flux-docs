# Audio Input

AudioLinkの入力を読み取り、他のモジュールが使う音声応答を供給します。**追加しただけでは色・サイズ・動きは変わりません。** 音声増光を有効にした[Brightness](./brightness.md#audio)や、入力を読むカスタムモジュールと組み合わせます。

## 追加と準備 {#setup}

Authoring Inspectorの **Modules → Position Update → Add Module → Audio Input** で追加します。この表示グループにあっても、粒子位置を直接変更するモジュールではありません。

AudioLinkの導入は必須ではありません。構成を生成するときに`Packages/com.llealloo.audiolink/Runtime/Shaders/AudioLink.cginc`の導入状態を確認し、未導入なら入力をゼロとする処理を生成します。Inspectorにも案内が表示されます。音声へ反応させる場合は、AudioLinkを導入し、シーン内でAudioLinkへ音声を入力する設定を行ってください。Audio Input自体はAudioSourceの再生やAudioLinkのセットアップを行いません。

AudioLinkを後から導入した場合は、Previewを作り直すかPlay Modeへ入り直して構成を再生成します。

## 設定 {#settings}

| 項目 | 初期値 | 範囲・意味 |
| --- | --- | --- |
| Band | Bass | Bass / LowMid / HighMid / Trebleから選ぶ |
| Gain | 1 | 0〜4。選択音域と4音域平均の入力感度 |
| Noise Floor | 0.02 | 0〜0.5。差し引いて再スケールする無音閾値 |
| Strength | 1 | 0〜1。入力レベルを0〜1に制限した後に掛ける係数 |
| Attack | 0.2 | 0.01秒以上。応答が増えるときの追従時間 |
| Release | 0.8 | 0.01秒以上。応答が減るときの追従時間 |
| Slow Response | 0.4 | 0.01秒以上。速い応答へ遅い応答を追従させる時間 |
| Average Gain | 1.5 | 0〜4。4音域平均に追加で掛ける感度 |
| Timeout | 1 | 0.01秒以上。AudioLinkのフレーム更新が止まったと判断する時間 |

平滑化は指数関数による追従です。Attackなどの時間を指定しても、その時間で目標値に完全に到達するわけではありません。

## 応答の意味 {#response}

`audio-input.response`は粒子ごとに保持するFloat3です。各成分は0〜1で、Spawn時はゼロから始まり、生存粒子のUpdateで変化します。

| 成分 | 内容 |
| --- | --- |
| x | 選択音域の速い応答。Attack／Releaseで平滑化 |
| y | xへSlow Responseで追従する遅い応答 |
| z | 4音域の平均の応答。Average GainとAttack／Releaseを使用 |

入力が使えない場合、Timeoutを超えて更新が止まった場合、Enabledをオフにした場合は、応答がゼロへ減衰します。**無効化しても減衰用の更新は続きます。** 負荷を比較する場合はモジュールを削除した構成とも比較してください。

[Brightness](./brightness.md#audio)はこのresponseを使わず、未平滑化の4音域平均から独自の応答を計算します。Brightnessの反応速度はAudio InputのAttack／Release／Slow Responseではなく、BrightnessのAudio Attack／Releaseで調整します。Bandの選択もBrightnessには影響しません。

カスタムモジュールで平滑化済みの応答を読むには、[音声応答の読み取り契約](./custom-module-reference.md#audio-response-read)を使います。独自に平滑化する場合は[ReadSample／ReadFreshness](./custom-module-reference.md#brightness)を使います。標準のColor over Lifetimeなどへ自動接続する機能ではありません。

## Runtimeから変更する {#runtime}

`target.Modules.AudioInput`を取得し、`TpLab.Flux.FX.Udon.Modules`の拡張メソッドを使用します。

Band、Gain、NoiseFloor、Strength、Attack、Release、SlowResponse、AverageGain、Timeoutにはそれぞれ`Get名前`／`Set名前`があります。有効状態はGetEnabled／SetEnabledです。Bandのenumは`TpLab.Flux.FX.Udon.FluxParticleAudioBand`です。

すべてLive変更に対応し、Play中のAuthoring Inspectorでも調整できます。Handleは入力設定を操作するもので、粒子ごとの応答をCPUへ取得するAPIではありません。[Runtime API](./runtime-parameters.md)の共通手順に従って、nullと変更の成否を確認してください。

## 反応しない場合 {#troubleshooting}

- 音声増光を有効にしたBrightnessなど、Audio Inputの入力や応答を使うモジュールを組み込んでいるか確認します。
- AudioLinkの導入と入力供給を確認します。音声が再生されているだけでは、AudioLink入力が有効とは限りません。
- Enabled、Gain、Strength、Noise Floor、Bandと、生存粒子の有無を確認します。
- 平滑化済みresponseがゆっくり消えるのはRelease・Slow Responseによるものです。Brightnessの音声増光はBrightnessのAudio Releaseで減衰します。いずれも無効化による即時リセットではありません。
