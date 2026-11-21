# Brightness

粒子ごとの明るさのばらつき、滑らかな明滅、点滅を設定します。Authoring Inspectorの **Modules → Rendering → Add Module → Brightness** で追加します。

旧Blinkの設定を使っている場合は、[Brightnessへの移行手順](#migration)を確認してください。

## 設定 {#settings}

描画色に **基準倍率 × 時間変化倍率 × 音声増光倍率** を掛けます。新しく追加した状態では、どの倍率も1になり、見た目は変わりません。

| 項目 | 初期値 | 意味 |
| --- | --- | --- |
| Base Minimum / Maximum | 1 / 1 | 粒子ごとの基準倍率。0以上 |
| Waveform | Off | Off / Sine / Pulse |
| Period | 1秒 | 基準周期。0以上 |
| Period Minimum / Maximum | 1 / 1 | 粒子ごとの周期倍率。0.0001以上 |
| Random Phase | 0 | 位相をランダムにずらす量。0〜1 |
| Time Mode | System Time | System Time / Particle Age |
| Minimum / Maximum | 0 / 1 | 時間変化の倍率範囲。0以上 |
| Duty | 0.5 | Pulseの点灯割合。0〜1 |
| Smoothness | 0 | Pulseの切り替えの滑らかさ。0〜1 |
| Target | RGB | RGB / Alpha / Both |
| Audio Enabled | OFF | 音声処理を構成に組み込む |
| Audio Channel | Independent Response | 独立した応答、または作成済みチャンネルを選ぶ |
| Audio Source | Average | 独立した応答の入力元。5種類から選ぶ |
| Audio Boost | 2 | 音声による増光量。0以上 |
| Audio Attack / Release | 0.025秒 / 0.12秒 | 音声応答の立ち上がり・減衰時間。0.01秒以上 |

Inspectorは日英対応です。WaveformがOffなら時間関連項目を隠し、DutyとSmoothnessはPulseのときだけ表示します。Audio ChannelとAudio BoostはAudio EnabledがONのときだけ表示します。Audio Source・Audio Attack・Audio Releaseは、さらにIndependent Responseを選んだときだけ表示します。

## 時間による変化 {#waveforms}

Sineは連続的な正弦波、Pulseは点灯区間と消灯区間を持つ波形です。Smoothnessを1にしても、PulseとSineは同じ波形にはなりません。

- WaveformがOff、またはPeriodが0なら、時間変化倍率は1です。基準倍率と音声増光倍率は引き続き適用されます。
- 周期が正のPulseでは、Dutyが0ならMinimum、1ならMaximumです。
- PulseでMinimumを0、Smoothnessを0にすると、倍率が0になる消灯区間と点灯区間が明確に分かれます。
- Periodに粒子ごとの周期倍率を掛けます。System Timeでも周期倍率が異なる粒子の周期は揃いません。Sineでは、掛け合わせた周期が0.01秒未満なら0.01秒として計算します。

System Timeはシステムのシミュレーション経過時間で、現実の時計やネットワーク共通時刻ではありません。Particle Ageは粒子の発生からの経過時間です。新規BrightnessのSine・Pulseは整数Hashで粒子ごとの位相を決め、Random Phaseでずらす量を調整します。

**確認用の例**：Pulse、Period = 0.5、周期倍率 = 1 / 1、Minimum / Maximum = 0 / 1、Duty = 0.5、Smoothness = 0、Random Phase = 0なら、約0.25秒ずつ明暗が切り替わります。滑らかな明滅はSine、Period = 2、Minimum / Maximum = 0.2 / 1などで比較できます。これらは初期値ではなく調整例です。

## Targetとブレンド {#target}

RGBはRGBだけ、AlphaはAlphaだけ、Bothは両方に倍率を掛けます。RGBは1を超える倍率による増光にも対応します。Bothは描画時のブレンドにもAlphaが使われるため、RGBだけの場合と結果が異なります。

透明になって消える点滅は、RendererのBlend ModeとTargetをAlphaにして試します。RGBを0にするだけではAlphaブレンドで黒い粒子が残る場合があります。OpaqueではAlphaによる透過は行われません。[Trails](./trails.md)は専用描画のため、この倍率を引き継ぎません。

## 音声で明るくする {#audio}

基準倍率・Sine・PulseにAudioLinkは不要です。音声増光には、同じFluxParticleAuthoringへ[Audio Input](./audio-input.md)を追加し、AudioLinkへ音声を入力したうえで、Play前に **Audio Enabled／音声増光を組み込む** をONにします。

**Audio Channel／音声チャンネル** で、次のどちらかを選びます。

| 選択 | 入力と応答時間 |
| --- | --- |
| Independent Response／独立した応答 | Audio Sourceで選んだ未平滑化入力に、Brightness自身のAudio Attack／Releaseを適用 |
| 作成済みチャンネル | Audio Inputのチャンネルが計算した平滑化済み応答をそのまま使用 |

独立した応答では、**Audio Source／音声の入力元** をAverage／Bass／Low Mid／High Mid／Trebleから選べます。初期値はAverage（AudioLinkの4帯域平均）です。共通のGain・Noise Floor・Strengthが作用し、AverageではAverage Gainも作用します。Audio InputのBand・Attack／Release／Slow Responseは、この入力選択や応答時間を変更しません。

チャンネルを選ぶとAudio Source・Audio Attack・Audio Releaseは非表示になります。チャンネル側のSource・Gain・Attack・Releaseを使い、Brightness側で二重に平滑化しません。**Audio Boost／音声増光量** は、どちらの方式でもBrightnessで調整します。[チャンネルの作成手順](./audio-input.md#channels)を参照してください。

音声応答は粒子ごとに0から始まります。独立した応答のAudio Attack／Releaseも指数関数による追従で、指定時間で目標値に完全に到達するわけではありません。音声増光倍率は、1に「応答の2乗 × Audio Boost × 粒子ごとの係数（0.65〜1）」を加えた値です。入力応答の0〜1という範囲は、RGB出力を0〜1へ制限するものではなく、HDR増光を維持します。

入力停止時の減衰とPause中の扱いは[Audio Input](./audio-input.md#response)を参照してください。Brightnessを無効にすると描画への倍率適用は止まります。独立した応答はその間に減衰しますが、**チャンネル応答はAudio Inputが管理するため、Brightnessを無効にしても更新を続けます。**

AudioLinkが未導入ならAudio Inputに警告が表示され、入力は0です。Audio EnabledがONで、Audio Inputがない場合や選択したチャンネルが削除された場合は構築エラーになります。Audio EnabledがOFFなら、Brightness自身の音声状態と音声更新処理は追加されません。既存設定の扱いは[音声入力拡張時の設定](./audio-input.md#existing-data)を参照してください。

## Runtime API {#runtime}

`particleSystem.Modules.Brightness`を使います。未組み込みの場合はnullです。Handleは`FluxParticleBrightnessHandle`、拡張メソッドの名前空間は`TpLab.Flux.FX.Udon.Modules`です。

BaseMinimum、BaseMaximum、Waveform、Period、PeriodMinimum、PeriodMaximum、RandomPhase、TimeMode、Minimum、Maximum、Duty、Smoothness、Targetには、それぞれGet／Setメソッドがあります。EnabledもLive変更できます。enumは`TpLab.Flux.FX.Udon`の`FluxParticleBrightnessWaveform`、`FluxParticleBrightnessTimeMode`、`FluxParticleBrightnessTarget`を使います。

**Audio EnabledとAudio Channelは構築時の設定**です。実行中に音声処理の追加やチャンネル接続の変更はできません。AudioBoost・AudioAttack・AudioRelease・AudioSourceにはGet／Setがあります。入力元は`GetAudioSource()`／`SetAudioSource(FluxParticleAudioSource)`で取得・変更します。

AudioBoostは両方式で作用します。AudioSource・AudioAttack・AudioReleaseが応答に作用するのは独立した応答の場合だけです。チャンネルを選択中に`SetAudioSource`を呼んでも接続先は変わりません。チャンネル自体の設定変更には[GetAudioChannel](./audio-input.md#runtime)を使います。Audio EnabledがOFFなら、これらは音声増光に作用しません。Setterは成功時にtrue、拒否時にfalseを返します。共通の扱いは[Runtime API](./runtime-parameters.md)を参照してください。

## 旧Blinkから移行する {#migration}

旧Blinkの型・Handle・enum・IDとAPIは削除されており、互換APIはありません。設定データは明示的な移行メニューで変換します。**Missing状態でも変換対象になるため、移行前に旧モジュールを削除しないでください。**

1. プロジェクトをバックアップし、Playを終了します。
2. 開いているSceneとPrefab Stageの変更を保存します。移行対象のAssets内のPrefab・Sceneは、テキスト形式（YAML）で保存されている必要があります。
3. 旧APIを使うコードを下表に従って修正し、コンパイルできる状態にします。
4. **Tools → FluxFX → Migration → Migrate Blink to Brightness** を実行します。
5. 変換後の設定、Prefabの継承・Override、実際の表示を確認します。

| 旧API・設定 | 変更先 |
| --- | --- |
| Modules.Blink | Modules.Brightness |
| FluxParticleBlinkHandle | FluxParticleBrightnessHandle |
| BlinkのTimeMode / Target enum | 対応するBrightness enum |
| SetFrequency(f) | f > 0ならSetPeriod(1 / f)、f = 0ならSetPeriod(0) |
| blink.* Parameter ID | brightness.*。frequencyはperiodへ単位も変換 |
| render.blink | render.brightness |

保存設定はPulseへ変換し、Minimum、Duty、Smoothness、Random Phase、Time Mode、Target、Enabledを保持します。Maximumは1、基準倍率・周期倍率は1 / 1、音声増光はOFFになります。移行したPulseは非表示の移行情報で従来の位相を保持します。Inspectorに互換モードはありません。

対象は**Assets内の保存済みPrefabとScene**で、閉じているSceneも含めてファイルを更新します。[Authoringへの移行](./migration.md)の「開いているSceneのみ」とは対象範囲が異なります。参照IDと項目別Overrideを保持し、再実行で重複させません。不完全な設定、曖昧な参照ID、旧BlinkとBrightnessの併用などでは処理を停止して報告します。全構成を無条件に変換するものではありません。

処理時のバックアップはTemp内に作成されます。プロジェクト全体の事前バックアップも残してください。古い生成Shaderが削除済みHLSLを参照している場合は、設定の移行後に **Tools → FluxFX → Clean Unused Generated Assets** で整理が必要になることがあります。

## サンプルとの違い {#samples}

RuntimeApiPlaygroundとSyncedRuntimeApiでは、Brightnessの13項目とEnabledを操作します。Frequencyは秒単位のPeriodへ変更され、音声増光の操作UIは含まれません。サンプルの初期設定は**Brightness無効、Pulse、Period = 0.5秒、Target = Alpha**で、標準追加時のOff・RGBとは異なります。

Offでは時間関連の操作が無効になり、Duty／SmoothnessはPulse時だけ操作できます。Inspectorの変更がサンプルUIへ追従する機能は含まれません。SyncedRuntimeApiが同期するのは設定・再生操作で、粒子位置やシミュレーション時刻の一致は保証しません。MillionParticlesにはBrightness操作UIを追加していません。Assetsへインポート済みのサンプルは、パッケージとは別に更新してください。
