# Emission

Emissionは、いつ何個の粒子を生成するかを設定します。一定頻度の発生にはRate over Time、指定時刻のまとまった発生にはBurstsを使います。

## Rate over Time

**Rate over Time** は1秒あたりの生成要求数です。8なら毎秒8個、0なら連続発生なしになります。Rateを0にしても、Burstsを設定していればBurstによる生成は行われます。

生成数は経過時間から計算され、端数は次の更新へ持ち越されます。そのため、各フレームで必ず同じ個数が生成されるわけではありません。

## Bursts

Burstsのリストに行を追加し、TimeとCountを指定します。

| 項目 | 意味 |
| --- | --- |
| Time | 発生周期の開始から何秒後に生成するか。0以上 |
| Count | その時刻に要求する粒子数。1以上 |

複数の行で複数回の発生を指定できます。設定は生成時にTime順へ並べられますが、編集時も時刻順にしておくと把握しやすくなります。

TimeがDurationを超えるBurstは、その周期では実行されません。周期の開始時に発生させたい場合はTimeを0にします。

<span id="cycles-and-start-delay"></span>

## 周期と開始遅延

MainのStart Delay、Duration、Loopと組み合わせて使います。

例えばStart Delayを1、Durationを2、Loopをオンにし、Time 0のBurstを設定すると、開始から1秒待って最初の周期が始まり、その後は2秒ごとに周期を繰り返します。Start Delayは周期ごとには入りません。Time 0のBurstは各周期の開始後の更新で処理されます。

Loopをオフにすると1周期で発生が終了します。生成済み粒子の寿命とは独立しており、Duration終了時にすべて消えるわけではありません。

<div class="development-figure">
  <a class="diagram-light" href="../diagrams/fluxfx-emission-cycles-ja-light.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-emission-cycles-ja-light.svg" alt="Start Delayの1秒後に2秒の周期を開始。Loopオンは待機なしで次の周期へ進み、オフは1周期で発生を終える" width="480" height="538" /></a>
  <a class="diagram-dark" href="../diagrams/fluxfx-emission-cycles-ja-dark.svg" target="_blank" rel="noopener" title="図を別タブで拡大表示"><img src="/diagrams/fluxfx-emission-cycles-ja-dark.svg" alt="Start Delayの1秒後に2秒の周期を開始。Loopオンは待機なしで次の周期へ進み、オフは1周期で発生を終える" width="480" height="538" /></a>
</div>

<span id="example-patterns"></span>

## 発生パターンの例

| 用途 | Rate over Time | Bursts | Mainの設定 |
| --- | --- | --- | --- |
| 継続して漂う粒子 | 8 | なし | Loopオン、寿命3秒など |
| 一度だけ広がる粒子 | 0 | Time 0、Count 32 | Loopオフ、Duration 1秒など |
| 周期的なパルス | 0 | Time 0、Count 16 | Loopオン、Duration 2秒 |
| 連続発生にアクセントを加える | 4 | Time 0、Count 16 | Loopオン、Duration 3秒 |

Burstだけを試す場合はRate over Timeを0にして、意図しない連続発生を止めておくと確認しやすくなります。

<span id="capacity-interaction"></span>

## 容量との関係

RateとBurstは生成の要求であり、Particle Countの容量を増やす設定ではありません。大きなBurstや長い寿命を使う場合は、同時に存在させたい数に見合った容量をMainで確保します。

1回の更新に含まれる生成要求が容量を超えた場合、Emitterが扱う生成数は容量以下に制限されます。さらにGPU側では空きスロットへ割り当てるため、既存粒子で埋まっている分も生成できません。超過分は繰り越されません。プレビューの生存数と見た目を確認してください。

<span id="editing-and-runtime-changes"></span>

## 編集と実行時の変更

Inspectorで設定を変えた後はRestartで開始から確認します。実行時APIでは、Rateの変更と、次回Restartから使われるDelay・Duration・Loop・Burstsの変更は反映時期が異なります。Editorプレビューの再生成と実行時の変更を同じ動作として扱わないでください。
