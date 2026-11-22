<span id="troubleshooting"></span>

# トラブルシューティング

まず、問題がSceneビューのプレビュー、Play Mode、実際のワールドのどこで起きるかを確認します。Consoleに生成・初期化エラーが出ている場合は、見た目の調整より先にそのエラーを解決します。

<span id="isolate-with-a-minimal-setup"></span>

## 最小構成で切り分ける

1. 同梱のFluxParticleSystem Prefabを新しく配置します。
2. [クイックスタート](./quickstart.md)の設定で、モジュールを追加せずに表示を確認します。
3. 元のエフェクトとMain、Emission、Shape、Rendererの設定を比較します。
4. モジュールを1つずつ追加し、問題が現れる変更を絞ります。

新しいPrefabでも失敗する場合は、依存パッケージや生成処理を確認します。元のエフェクトだけで失敗する場合は、設定値と内部参照を確認します。調査のために生成済みShaderや内部Bufferの値を直接書き換えると、設定と実行用構成が食い違う原因になります。

<span id="inspector-preview-and-play-mode"></span>

## Inspector・プレビュー・Play Mode

| 症状 | 確認すること |
| --- | --- |
| 専用Inspectorが表示されない | PrefabルートのFluxParticleAuthoring（Flux FX Settings）を開き、C#のコンパイルエラーを確認する。SystemはUdonSharp標準Inspectorを使用する |
| 移行要求が表示される | 設定を編集する前に[移行](./migration.md)を行う |
| Play中に項目を編集できない | 対応するLive項目だけが編集可能。保存する初期設定はPlayを終了して編集する |
| Previewオーバーレイが見つからない | 編集時に対象Inspectorを表示しているか、SceneビューでFluxFX Previewが表示されているか |
| プレビューの準備に失敗する | プレビューのエラー表示とConsoleを確認する。非対応の値、Mesh、モジュールの定義不足を調べる |
| プレビューでは表示できるがPlay Modeで失敗する | SceneFlowの生成処理と依存関係、Prefabの内部参照を確認する |
| Play Modeへ入っても生成処理が働かない | 通常のシーンリロードを有効にして再確認する |

依存関係は[導入](./installation.md)を参照してください。SceneFlowのDebug Windowでは`FluxFXCompileBuildPass`と`FluxBuildPass`の検出を確認します。プレビューが成功しても、実行時の構成生成まで成功したことにはなりません。

<span id="particles-do-not-spawn-or-appear"></span>

## 粒子が発生しない・見えない

| 確認箇所 | 対処 |
| --- | --- |
| Play On Awake・再生API | 自動再生がオフならPlayを呼ぶ。Pause中でないか確認する |
| Start Delay | 待機時間を過ぎるまで待つか、切り分け時は0にする |
| Rate over Time・Bursts | Rateが0でBurstもなければ発生しない。まずRateを8にする |
| 非ループの終了 | Playでは発生周期を巻き戻さない。Restartを呼ぶ |
| Start Lifetime | 0や極端に短い値を避け、まず3秒程度で確認する |
| Start Size・Start Color・Intensity | サイズやRGB強度が0でないか、透過ブレンドでAlphaが0でないか確認する |
| モジュール | SizeやColorの変化、Brightnessを一時的に無効にして比較する |
| 配置とカメラ | 床・壁の内側にないか、カメラから見える位置・レイヤーか確認する |
| Culling Bounds | 粒子と軌跡が移動する範囲を含める |

`IsEmitting`がtrueでも、実際に粒子が生まれているとは限りません。必要なら[生存数を取得](./state-and-count.md)し、「発生していない」のか「生存しているが見えていない」のかを切り分けます。

<span id="counts-stop-growing-or-bursts-are-incomplete"></span>

## 数が増えない・Burstが欠ける

Particle Countは容量です。発生要求が空きスロット数を超えると、超えた分は省略されます。後から空きができても、その要求を繰り越して生成する仕組みではありません。

Rateを下げる、寿命を短くする、Burstを分散する、必要に応じてParticle Countを増やす方法で調整します。容量を増やす場合は[制約と性能](./limitations.md)も確認してください。Burstの時刻が発生周期に収まっているかも確認します。

<span id="unexpected-appearance"></span>

## 見た目が想定と違う

| 症状 | 確認すること |
| --- | --- |
| 視点を変えると全体が消える | Culling Boundsが狭すぎないか。World空間でもBoundsはRendererのローカル座標 |
| Alphaを下げても透けない | Blend ModeがOpaqueでないか |
| Gradientで指定した色にならない | Color over LifetimeのGradientはStart Colorへの乗算。まずStart Colorを白にする |
| 回転の終点がずれる | Rotation over LifetimeのEnd Rotationは初期角度への加算 |
| テクスチャのコマが切り替わらない | Tilesが1×1、Cyclesが0になっていないか |
| 点滅しない | BrightnessのWaveform・Period・Minimum／Maximum・Duty・Target・Blend Modeを確認する |
| 重なった半透明粒子の前後関係がおかしい | 粒子単位の奥行きソートは行われない。密度・サイズ・ブレンドを見直す |

詳しい設定は[Renderer](./renderer.md)、[寿命に応じた見た目](./lifetime-appearance.md)、[テクスチャアニメーション](./texture-animation-blink.md)、[Brightness](./brightness.md)を参照してください。

<span id="trails-are-missing-or-interrupted"></span>

## Trailsが表示されない・途切れる

TrailsのWidthとColorのAlphaが正の値か、粒子が移動しているか確認します。異なる位置の記録が2点必要なので、発生直後や短命の粒子では軌跡が見えないことがあります。

粒子の消滅とともに軌跡も消えます。Durationは消滅後の残像時間ではありません。また、有効なTrailsのDurationを実行時に変更した場合や、Trailsを再び有効にした場合は履歴が消去されます。

軌跡が角張る場合はDurationとPoints Per Trailの比率を見直します。1回の更新で記録できる位置は最大1点なので、点数だけを増やしても更新間隔の間の動きは補えません。詳細は[Trails](./trails.md)を参照してください。

<span id="runtime-settings-do-not-change"></span>

## 実行時の設定が変わらない

| 状態 | 対処 |
| --- | --- |
| ハンドルがnull | 対象の参照と生成状態を確認する。モジュールはInspectorで先に追加する |
| Setメソッドがfalseを返す | 対応項目、数値制約、Staticのロックを確認する |
| Setが成功したのに既存粒子の初速が変わらない | Start SpeedやShapeは新しく発生する粒子に使われる |
| Duration・Loop・Burstが変わらない | 設定後にRestartを呼ぶ |
| Stopしても粒子が残る | Stopは新規発生だけを停止する。即座に消すならStopの後にClearを呼ぶ |
| Restartしても古い粒子が残る | 空の状態から再開するならClearの後にRestartを呼ぶ |

StaticはPause・Stop・Clear・Restartでも変更可能になりません。[実行時のパラメーター変更](./runtime-parameters.md)の分類と再初期化の手順を確認してください。

<span id="alive-count-does-not-update"></span>

## 生存数が更新されない

`RequestAliveCount()`のtrueは要求開始であり、完了ではありません。処理中や前回要求から0.2秒未満の場合などはfalseを返します。後で`Executor.IsAliveCountPending`と`AliveCount`を確認します。

- -1は未取得・失敗などの不明状態として扱い、0個と区別します。
- AliveCountは最後の取得結果です。自動で最新値に更新されるわけではありません。
- Clear後の0も、その後に発生した粒子を反映した結果ではありません。

要求を定期的に再試行し、それでも取得できない場合は初期化エラーと対象環境での読み戻し動作を確認します。コード例は[状態と粒子数の取得](./state-and-count.md)を参照してください。

<span id="investigate-console-errors"></span>

## Consoleのエラーから調べる

次の表はメッセージ中の特徴的な部分です。数値やパスは環境によって変わります。

| メッセージの一部 | 主な確認箇所 |
| --- | --- |
| `Readable non-empty render Mesh` / `Render Mesh must be assigned and readable` | Meshの割り当て、読み取り設定、頂点が存在するか |
| `Triangle render Mesh` / `Render Mesh with triangles` | すべてのサブメッシュがTrianglesで、三角形が存在するか |
| `Billboard start rotation around Z only` | Mainの初期回転のX・Yを0にする。範囲指定なら両端を確認 |
| `Billboard rotation over lifetime around Z only` | Rotation over LifetimeのEnd RotationのX・Yを0にする |
| `Cone angle in [0, 90) degrees` | ConeのAngleを0以上90未満にする |
| `Duration of at least 0.01 seconds` | MainのDurationを0.01秒以上にする |
| `Finite culling bounds with positive size` | Boundsの各Sizeを正の有限値にする |
| `Module Definition is missing` | モジュールの定義とコンパイルエラーを確認する。未対応のモジュールは削除する |
| `Buffer capacity must be in` / `Particle count must be in` | 粒子容量を下げ、使用MeshとGPUの制約を確認する |
| `Trail capacity exceeds Texture or Mesh limits` | Max TrailsとParticle Countを見直す |
| `Particle Buffer RenderTexture allocation failed` | 容量と使用メモリ、対象GPUの対応を確認する |
| `Program Shader failed to compile` | ConsoleのShaderエラーを確認し、問題を起こす構成を最小化する |

`Particle Executor Manifest is invalid`、Buffer寸法の不一致、Prefab内のコンポーネント不足などは、実行用構成の問題です。内部参照を個別に推測して埋める前に、依存バージョンを確認し、同梱Prefabの新規配置と通常の生成手順で再現するか調べます。

解決しない場合は、パッケージのバージョン、発生する環境、最初のConsoleエラー、再現する最小設定を記録すると原因を絞りやすくなります。

## 音声入力と距離フェード {#input-appearance}

| 症状 | 確認すること |
| --- | --- |
| Audio Inputを追加しても変化しない | 応答を使うモジュール、AudioLink入力、Enabled・Gain・Strength、生存粒子を確認する |
| Audio Input無効化後も音声応答が残る | 従来の応答は共通のRelease・Slow Response、チャンネルは固有のReleaseで減衰する。即時リセットではない |
| Distance Fadeが効かない | カメラが透視投影か、End DistanceがStart Distanceより大きいか、ScaleのXYZ軸の倍率が等しいかを確認する。システム原点からの距離と、Targetに合うブレンド設定も確認する |

詳しくは[Audio Input](./audio-input.md)と[Distance Fade](./distance-fade.md)を参照してください。

## Brightnessの音声と旧データ {#brightness}

| 症状 | 確認すること |
| --- | --- |
| 明るさが時間で変わらない | WaveformがOff、Periodが0、MinimumとMaximumが同じ値になっていないか確認する。PulseはDutyが0または1でも一定になる |
| 音声増光をONにすると構築エラーになる | 同じSystemにAudio Inputが必要。Brightnessが無効でもAudio EnabledがONなら依存関係は必要 |
| 音声に反応しない | Play前にAudio EnabledをONにする。両モジュールのEnabled、Audio Boost、AudioLinkの入力、Audio InputのGain・Strengthを確認する |
| 共通のBandやAttack／ReleaseがBrightnessに効かない | 独立した応答はBrightnessのAudio Source・Audio Attack／Release、チャンネル選択時はチャンネル側のSource・Attack／Releaseで調整する |
| Audio Source・Audio Attack／Releaseが表示されない | Audio EnabledをONにし、Independent Responseを選ぶと表示される |
| チャンネルがMissingになった | 参照先を削除していないか確認し、有効なチャンネルかIndependent Responseを選ぶ。使用中の不明IDは構築エラーになる |
| 音声入力が止まっても応答が減衰しない | SystemがPause中なら応答更新とTimeoutの計測も止まる。[再生を再開](./playback.md)して確認する |
| Play中に接続先やチャンネル数を変えられない | 接続と配列の変更は再構築が必要。Playを停止して変更する |
| 旧BlinkがMissingになった | 旧モジュールを削除せず、[移行手順](./brightness.md#migration)に従う |

AudioLinkが未導入なら入力はゼロです。詳しい設定は[Brightness](./brightness.md)を参照してください。

## 生成物が整理されない {#generated-assets}

| 状態 | 確認すること |
| --- | --- |
| メニューを開いても候補が表示されない | 「生成物を分析」を押す。画面を開くだけでは走査しない |
| 自動整理が実行されない | 有効設定、予約・保持期限、前回の自動走査時刻を確認する。起動時の機会を見送った場合は次回起動まで自動実行しない |
| 分析結果が保持になる | 表示された理由と参照元を確認する。使用中の生成物や内容が変更された固定Shader／HLSLは保持される |
| 削除が失敗する・管理記録を読み取れない | 結果の診断とJSONを確認する。参照元の削除に失敗した場合、その依存先も保持される |

操作と保護条件は[生成物の管理](./generated-assets.md)を参照してください。生成物の整理は、元のModule・HLSLの不具合を修正する操作ではありません。
