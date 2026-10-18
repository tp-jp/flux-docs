// Regenerate the static developer diagrams with:
// node scripts/generate-development-diagrams.mjs
import { diagram as writeDiagram } from './diagram-utils.mjs'
const diagram = (name, ...args) => writeDiagram('fluxfx-' + name, ...args)

for (const lang of ['ja', 'en']) {
  const ja = lang === 'ja'
  for (const dark of [false, true]) {
    diagram('dependency-reads', lang, dark, 580, ja ? '実行順の指定とValueの読み取り' : 'Ordering and reading Values', ({ box, arrow, text, heading }) => {
      heading(27, ja ? 'dependencies / 順序を指定' : 'dependencies / ORDER ONLY')
      box(20, 50, 440, 70, ['motion', ja ? '先に実行するOperation' : 'Predecessor Operation'])
      arrow('M240 124 V168')
      text(260, 150, ja ? '先行 → 後続' : 'Before → after', 15, undefined, 400, 'start')
      box(20, 176, 440, 70, ['custom-position', ja ? 'dependencies に motion を指定' : 'Lists motion in dependencies'], true)
      text(240, 276, ja ? '読むValueは別途宣言する' : 'Declare Value reads separately')
      heading(327, ja ? 'AfterOperation / 結果を読む' : 'AfterOperation / READ A RESULT', true)
      box(20, 350, 440, 70, ['motion', ja ? 'particle.position を書く' : 'Writes particle.position'])
      arrow('M240 424 V488')
      text(260, 450, 'particle.position', 15, undefined, 400, 'start')
      text(260, 472, ja ? 'motion が書いた結果' : 'Result from motion', 15, undefined, 400, 'start')
      box(20, 496, 440, 70, ['custom-position', ja ? 'AfterOperation で位置を読む' : 'Reads position with AfterOperation'], true)
    })

    diagram('standard-pipelines', lang, dark, 662, ja ? '標準の速度と描画色の処理列' : 'Standard velocity and rendering color pipelines', ({ box, arrow, text, heading }) => {
      heading(27, ja ? 'UPDATE / 速度から位置へ' : 'UPDATE / VELOCITY TO POSITION')
      box(20, 50, 440, 114, ['Value: particle.velocity', 'gravity → force → noise', '→ vortex → drag → limit-velocity', ja ? '存在する速度Writerを順に接続' : 'Connect the velocity writers present'], true)
      arrow('M240 168 V210')
      text(260, 194, ja ? '最後の速度' : 'Final velocity', 15, undefined, 400, 'start')
      box(20, 218, 440, 70, ['motion', ja ? '位置と年齢を更新' : 'Update position and age'])
      arrow('M240 292 V328')
      text(260, 315, 'particle.position', 15, undefined, 400, 'start')
      box(20, 336, 440, 70, ['velocity-over-lifetime', ja ? 'さらに位置を変更' : 'Further modify position'])
      heading(467, ja ? 'RENDER / 描画色の処理列' : 'RENDER / COLOR PIPELINE', true)
      box(20, 490, 440, 114, ['Value: render.color', 'render.start → render.color → render.blink', ja ? '直前のWriterの結果を次へ渡す' : 'Pass each result to the next writer', ja ? 'Updateとは別のPhase' : 'A separate Phase from Update'], true)
      text(240, 637, ja ? '描画サイズ・回転・UVは、それぞれ別の依存関係' : 'Size, rotation, and UVs have separate dependencies', 15)
    })

    diagram('custom-order', lang, dark, 618, ja ? 'CustomLiftの任意依存と実行順' : 'CustomLift optional dependencies and execution order', ({ box, arrow, text, heading }) => {
      heading(27, ja ? 'UPDATE / 標準の速度Writerがある場合' : 'UPDATE / STANDARD WRITERS PRESENT')
      box(20, 50, 440, 92, [ja ? '標準の速度Writer' : 'Standard velocity writers', 'gravity / force / noise / vortex', 'drag / limit-velocity'])
      arrow('M240 146 V192')
      text(260, 174, 'optionalDependencies', 15, undefined, 400, 'start')
      box(20, 200, 440, 70, ['custom-lift', ja ? '標準Writerの結果へ速度を加える' : 'Add velocity after the standard writers'], true)
      arrow('M240 274 V308')
      box(20, 316, 440, 70, ['motion', ja ? '追加分も位置の更新に使う' : 'Use the added velocity for motion'])
      text(240, 416, ja ? '追加分には同じ更新のDrag・Limitは適用されない' : 'Drag / Limit do not affect this addition in the same step', 15)
      heading(467, ja ? 'UPDATE / 標準の速度Writerがない場合' : 'UPDATE / NO STANDARD WRITERS')
      box(20, 490, 200, 70, ['custom-lift', ja ? '独自の速度更新' : 'Custom velocity'], true)
      arrow('M224 525 H254')
      box(260, 490, 200, 70, ['motion', ja ? '位置を更新' : 'Update position'])
      text(240, 593, ja ? '任意の依存先がなくてもCustomLiftは残る' : 'CustomLift remains when optional targets are absent', 15)
    })

    diagram('module-parts', lang, dark, 738, ja ? 'カスタムモジュールの構成と役割' : 'Custom module parts and relationships', ({ box, arrow, text, heading }) => {
      heading(27, ja ? 'EDITOR / 処理の組み立て' : 'EDITOR / ASSEMBLY')
      box(20, 48, 212, 92, ['Module', ja ? 'Inspectorの設定値' : 'Inspector settings', 'Strength / Direction'])
      box(248, 48, 212, 92, ['Contract', ja ? 'ID・型・変更方針' : 'IDs, types, policies', ja ? 'ハンドル番号' : 'Handle slots'])
      arrow('M126 144 V167 H240 V188')
      arrow('M354 144 V167 H240', false)
      box(20, 196, 440, 92, ['Definition', ja ? '設定値をContractへBind' : 'Bind settings to the Contract', ja ? '読み書き・HLSL・依存関係を登録' : 'Register reads, writes, HLSL, dependencies'], true)
      arrow('M240 292 V328')
      text(260, 315, ja ? '関数を指定' : 'Select function', 15, undefined, 400, 'start')
      box(20, 336, 440, 70, ['HLSL', ja ? '生成されたContextで粒子を計算' : 'Calculate using the generated Context'])
      arrow('M240 410 V496')
      text(260, 433, ja ? 'コンパイル・生成' : 'Compile / generate', 15, undefined, 400, 'start')
      heading(483, ja ? 'RUNTIME / 実行時' : 'RUNTIME', true)
      box(20, 504, 440, 92, [ja ? 'Parameter と GPU処理' : 'Parameters and GPU processing', ja ? '設定値を使ってHLSLを実行' : 'Execute HLSL with parameter values', ja ? '粒子の状態を更新' : 'Update particle state'], true)
      arrow('M240 652 V604')
      text(260, 632, ja ? 'Parameterを変更' : 'Change parameters', 15, undefined, 400, 'start')
      box(20, 660, 440, 70, ['Handle', ja ? 'UdonSharpから呼び出す入口' : 'Called from UdonSharp'])
    })

    diagram('phase-flow', lang, dark, 514, ja ? 'Spawn・Update・Renderと粒子状態' : 'Spawn, Update, Render, and particle state', ({ box, arrow, text, heading }) => {
      heading(27, ja ? 'SIMULATION / 今回の更新' : 'SIMULATION / CURRENT STEP')
      box(20, 50, 212, 92, ['Spawn', ja ? '今回生成する粒子' : 'New spawn targets', ja ? '状態を初期化' : 'Initialize state'])
      box(248, 50, 212, 92, ['Update', ja ? 'それ以外の生存粒子' : 'Other living particles', ja ? '状態を更新' : 'Update state'])
      arrow('M126 146 V194 H240 V222')
      arrow('M354 146 V194 H240', false)
      box(20, 230, 440, 92, [ja ? 'Bufferに保持する状態Value' : 'State Values stored in Buffers', ja ? '位置・速度などの更新結果' : 'Updated position, velocity, etc.', ja ? '次の更新にも引き継ぐ' : 'Retained for the next step'], true)
      arrow('M240 326 V406')
      text(260, 348, 'Committed', 15, undefined, 400, 'start')
      heading(393, 'RENDER', true)
      box(20, 414, 440, 92, ['Render', ja ? '状態を読み、色・サイズ・UVなどを計算' : 'Read state; calculate color, size, UVs', ja ? '粒子状態へは書き戻さない' : 'No writes back to particle state'])
    })

    diagram('operation-data', lang, dark, 670, ja ? 'Operationの入力と出力' : 'Operation inputs and outputs', ({ box, arrow, text, heading }) => {
      heading(27, ja ? 'INPUT / 宣言した入力' : 'INPUT / DECLARED INPUTS')
      box(70, 48, 390, 70, [ja ? '状態Valueなどの読み取り' : 'Read state or earlier results', ja ? 'ReadVersionで読む時点を選ぶ' : 'ReadVersion selects which value'])
      box(70, 136, 390, 70, ['Provider → Value', ja ? 'Providedで供給値を読む' : 'Read the supplied value as Provided'])
      box(70, 224, 390, 70, ['Parameter', ja ? 'Contractで宣言した設定値' : 'Settings declared in the Contract'])
      arrow('M66 83 H35 V326 H240 V350')
      arrow('M66 171 H35', false)
      arrow('M66 259 H35', false)
      box(20, 358, 440, 92, ['Context', ja ? 'reads と parameters から入力を用意' : 'Inputs from reads and parameters', ja ? 'writes に対応する出力フィールド' : 'Output fields corresponding to writes'], true)
      arrow('M240 454 V482')
      box(20, 490, 440, 70, ['Operation / HLSL', ja ? '指定したPhaseで計算する' : 'Calculate in the declared Phase'])
      arrow('M240 564 V592')
      box(20, 600, 440, 62, [ja ? '出力Value' : 'Output Values', ja ? '状態、またはRender内の値' : 'State or values local to Render'])
    })
  }
}
