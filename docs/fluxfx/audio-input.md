# Audio Input

AudioLinkからBass／Low Mid／High Mid／Trebleの4帯域と、その平均を読み取り、他のモジュールが使う音声応答を供給します。**追加しただけでは色・サイズ・動きは変わりません。** 音声増光を有効にした[Brightness](./brightness.md#audio)や、入力を読むカスタムモジュールと組み合わせます。

入力元・感度・応答時間が異なるチャンネルを複数作れます。ここでいうチャンネルは、音声に反応する制御信号です。ステレオ音声の左右チャンネルではありません。

## 追加と準備 {#setup}

Authoring Inspectorの **Modules → Position Update → Add Module → Audio Input** で追加します。この表示グループにあっても、粒子位置を直接変更するモジュールではありません。

AudioLinkの導入は必須ではありません。構成を生成するときに`Packages/com.llealloo.audiolink/Runtime/Shaders/AudioLink.cginc`の導入状態を確認し、未導入なら入力をゼロとする処理を生成します。Inspectorにも警告が表示されます。音声へ反応させる場合は、AudioLinkを導入し、シーン内でAudioLinkへ音声を入力してください。Audio Input自体はAudioSourceの再生やAudioLinkのセットアップを行いません。

AudioLinkを後から導入した場合は、Previewを作り直すかPlay Modeへ入り直して構成を再生成します。

## Brightnessにつないで試す {#quickstart}

1. [クイックスタート](./quickstart.md)で粒子を表示できるFluxParticleAuthoringに、Audio InputとBrightnessを追加します。
2. Brightnessの **Audio Enabled／音声増光を組み込む** をONにします。
3. まず **Audio Channel／音声チャンネル** を **Independent Response／独立した応答** にし、**Audio Source／音声の入力元** をBassなどへ変更します。
4. チャンネルを使う場合は、Audio Inputの **Add Channel／チャンネルを追加** を押し、入力元・感度・応答時間を設定します。
5. Brightnessの **Audio Channel／音声チャンネル** で作成したチャンネルを選びます。
6. AudioLinkへ音声が入力されている状態でPreviewまたはPlayを確認します。

比較するには、SourceをBassにした2つのチャンネルを作り、Attack／Releaseを一方は0.02秒／0.1秒、もう一方は0.3秒／1秒にして切り替えてみてください。同じ低音でも短く反応する設定と、ゆっくり反応する設定を比較できます。これらは調整例で、追加時の初期値ではありません。Play中にチャンネルの接続先は変更できません。

## 共通設定 {#settings}

| 項目 | 初期値 | 範囲・意味 |
| --- | --- | --- |
| Band | Bass | 従来の選択帯域応答に使うBass / Low Mid / High Mid / Treble |
| Gain | 1 | 0〜4。4帯域と4帯域平均に共通する入力感度 |
| Noise Floor | 0.02 | 0〜0.5。差し引いて再スケールする無音閾値 |
| Strength | 1 | 0〜1。入力レベルを0〜1に制限した後に掛ける係数 |
| Attack | 0.2秒 | 0.01秒以上。従来の応答が増えるときの追従時間 |
| Release | 0.8秒 | 0.01秒以上。従来の応答が減るときの追従時間 |
| Slow Response | 0.4秒 | 0.01秒以上。速い応答へ遅い応答を追従させる時間 |
| Average Gain | 1.5 | 0〜4。4帯域平均に追加で掛ける感度 |
| Timeout | 1秒 | 0.01秒以上。AudioLinkのフレーム更新が止まったと判断する時間 |
| Channels／チャンネル | 空配列 | 入力元と応答時間を個別に指定するチャンネル |

Bandは従来の選択帯域応答に使う設定です。追加チャンネルやBrightnessで選べる入力元を制限しません。共通のAttack／Release／Slow Responseも、追加チャンネルやBrightnessの応答時間には適用しません。

## チャンネルを作成する {#channels}

**Add Channel／チャンネルを追加** で追加し、次の項目を設定します。

| 項目 | 追加時の初期値 | 意味 |
| --- | --- | --- |
| Name | Channel 1など | 表示名 |
| Channel ID／チャンネルID | 自動生成 | 名前や並び順に依存しない参照用ID |
| Source／入力元 | Bass／低音 | 帯域または平均を選ぶ |
| Gain／入力感度 | 1 | 共通入力処理後に掛ける追加感度。0〜4 |
| Attack／立ち上がり時間 | 0.2秒 | 入力が上がるときの応答時間。0.01秒以上 |
| Release／減衰時間 | 0.8秒 | 入力が下がるときの応答時間。0.01秒以上 |

Sourceと、Brightnessの独立した応答で使うAudio Sourceは、次の5種類から選べます。

| 英語表示 | 日本語表示 |
| --- | --- |
| Average | 全帯域平均 |
| Bass | 低音 |
| Low Mid | 中低音 |
| High Mid | 中高音 |
| Treble | 高音 |

Averageは**AudioLinkの4帯域の平均**です。任意の周波数範囲やスペクトル全体の平均ではありません。未加工の4帯域を平均してからNoise Floor・Gain・Average Gain・Strengthを適用します。処理済みの帯域を平均する計算とは異なります。

各チャンネルは、共通のGain・Noise Floor・Strengthを適用した入力（AverageではAverage Gainも適用）へ固有のGainを掛け、0〜1へ制限してからAttack／Releaseで平滑化します。応答は粒子ごとに0から始まり、生存粒子のUpdateで更新されます。指数関数による追従のため、指定時間で目標値に完全に到達するわけではありません。

### 参照と編集できる項目 {#channel-editing}

参照は固定IDで保持され、名前変更・並べ替え・保存後も維持されます。参照中のチャンネルを削除するとBrightnessのInspectorにMissingが表示され、そのチャンネルを使う構成のビルドは失敗します。有効なチャンネルかIndependent Responseを選び直してください。別チャンネルへ自動接続しません。空・重複・不正なIDも拒否されるため、通常はInspectorが生成したIDをそのまま使います。

| 操作 | Play中のLive編集 |
| --- | --- |
| 共通設定、チャンネルのSource・Gain・Attack・Release | 対応 |
| Brightnessの独立した応答のAudio Source | 対応 |
| チャンネルの追加・削除・並べ替え、Brightnessのチャンネル接続変更 | 再構築が必要。Playを停止して変更する |

Live変更はPlay終了時に破棄されます。保持する設定はPlayを停止してAuthoringで変更してください。

## 従来の応答と入力停止時の動作 {#response}

`audio-input.response`は引き続き粒子ごとのFloat3として利用できます。各成分は0〜1で、Spawn時はゼロ、生存粒子のUpdateで変化します。

| 成分 | 内容 |
| --- | --- |
| x | Bandで選んだ帯域の速い応答。共通のAttack／Releaseで平滑化 |
| y | xへSlow Responseで追従する遅い応答 |
| z | 4帯域平均の応答。Average Gainと共通のAttack／Releaseを使用 |

無音、取得不能、Audio Inputの無効化では、従来の応答とチャンネル応答はゼロへ減衰します。入力値が残ったままフレーム更新が止まった場合は、Timeoutに達してから減衰します。**Audio Inputを無効化しても減衰用の更新は続きます。** Brightnessだけを無効化しても、Audio Inputが管理するチャンネルの更新は続きます。

Brightnessは、[独立した応答またはチャンネル応答](./brightness.md#audio)を使います。カスタムモジュール向けの共有出力と読み取りPhaseは[音声入力の読み取り契約](./custom-module-reference.md#audio-response-read)を参照してください。標準のColor over Lifetimeなどへ自動接続する機能ではありません。

## Runtimeから変更する {#runtime}

`target.Modules.AudioInput`を取得し、`TpLab.Flux.FX.Udon.Modules`の拡張メソッドを使用します。Band、Gain、NoiseFloor、Strength、Attack、Release、SlowResponse、AverageGain、Timeoutにはそれぞれ`Get名前`／`Set名前`があります。有効状態はGetEnabled／SetEnabledです。Bandのenumは`TpLab.Flux.FX.Udon.FluxParticleAudioBand`です。

チャンネルは`target.Modules.GetAudioChannel(id)`で取得します。Inspectorに表示される**完全なChannel ID**を渡してください。表示名や配列番号ではありません。未組み込み・不明IDではnullを返します。

| 設定 | API |
| --- | --- |
| 入力元 | GetSource() / SetSource(FluxParticleAudioSource) |
| 追加感度 | GetGain() / SetGain(float) |
| 立ち上がり時間 | GetAttack() / SetAttack(float) |
| 減衰時間 | GetRelease() / SetRelease(float) |

次は、準備済みのSystemを`target`、Inspectorからコピーした完全なIDを`channelId`として、実行中に変更する例です。`TpLab.Flux.FX.Udon`と`TpLab.Flux.FX.Udon.Modules`をusingへ追加してください。

```csharp
var channel = target.Modules.GetAudioChannel(channelId);
if (channel == null) return;
if (!channel.SetSource(FluxParticleAudioSource.Bass)) return;
if (!channel.SetGain(1f)) return;
if (!channel.SetAttack(0.02f)) return;
if (!channel.SetRelease(0.1f)) return;
```

`FluxParticleAudioSource`は`Average=0、Bass=1、LowMid=2、HighMid=3、Treble=4`です。Band用のenumとは数値が異なるため、整数値を流用しないでください。

Setterは成功時にtrue、不正値などで変更できなければfalseを返し、Executorが検証します。各呼び出しは個別に適用されます。これらは設定用APIで、GPUの音声レベルをCPUへ読み戻すAPIではありません。変更は対応するLive Inspector項目にも反映されます。構成が変わった場合はHandleを取得し直してください。[Runtime API](./runtime-parameters.md)も参照してください。

## 既存設定の扱い {#existing-data}

このチャンネル・入力元選択の追加に伴う移行操作は不要です。

| 追加設定 | 既存データを読み込んだとき |
| --- | --- |
| Audio InputのChannels | 空配列 |
| BrightnessのAudio Channel | 未指定＝Independent Response |
| BrightnessのAudio Source | Average |
| 増光量・Attack／Releaseなど | 保存値を保持 |

既存Brightnessは平均入力と独立した応答を継続します。チャンネルへの自動変換はありません。新しい入力元やチャンネルを使う場合だけ設定を変更します。これは標準Brightnessの音声入力拡張についての説明で、[旧Blinkからの移行](./brightness.md#migration)や独自モジュールの置き換えとは別です。

## 反応しない場合 {#troubleshooting}

- 音声増光を有効にしたBrightnessなど、入力や応答を使うモジュールを追加します。
- AudioLinkの導入と入力供給を確認します。音声が再生されているだけでは、AudioLink入力が有効とは限りません。
- Enabled、共通のGain・Strength・Noise Floor、選んだ入力元、チャンネルのGain、生存粒子を確認します。
- 減衰時間は、チャンネル選択時ならチャンネルのRelease、独立した応答ならBrightnessのAudio Releaseです。従来のFloat3応答には共通のRelease・Slow Responseが作用します。
