// node scripts/generate-user-diagrams.mjs
import { diagram } from './diagram-utils.mjs'

for (const lang of ['ja', 'en']) {
  const ja = lang === 'ja'
  for (const dark of [false, true]) {
    diagram('flux-quickstart', lang, dark, 740, ja ? 'アップロードから読み戻しと結果確認まで' : 'Upload, asynchronous readback, and verification', ({ box, arrow, text, heading }) => {
      heading(27, ja ? '4要素をGPUへ送り、CPUで元の値と比較' : 'SEND FOUR ELEMENTS TO GPU, THEN COMPARE ON CPU')
      box(20, 50, 440, 92, ['CPU / Start()', ja ? '_expectedに4つのVector4を用意して保持' : 'Create and keep four Vector4 values in _expected', 'upload.Upload(_expected, buffer);'])
      arrow('M240 146 V176')
      box(60, 184, 360, 70, ['GPU / FluxBuffer', 'Count = 4 / Texture = 2 × 2'], true)
      arrow('M240 258 V288')
      box(20, 296, 440, 70, ['readback.TryRequest(buffer, this)', ja ? 'false：受付拒否。この要求の完了通知なし' : 'false: rejected; no completion event for this call'])
      arrow('M240 370 V412')
      text(258, 395, ja ? 'true：非同期で完了を待つ' : 'true: wait for completion', 16, undefined, 400, 'start')
      box(20, 420, 440, 92, ['CPU / _OnFluxReadbackComplete()', ja ? 'まずreadback.Succeededを確認' : 'Check readback.Succeeded first', ja ? 'falseならエラーを出して終了' : 'If false, log an error and return'], true)
      arrow('M240 516 V546')
      box(20, 554, 440, 114, [ja ? '成功したDataを元の値と比較' : 'Compare successful Data with the originals', ja ? 'readback.Countが4か確認' : 'Check readback.Count is 4', '(Vector4)readback.Data[i] ↔ _expected[i]', ja ? '各成分の誤差が0.01以内か確認' : 'Check each component differs by at most 0.01'])
      text(240, 697, ja ? 'すべて一致 → ConsoleにPASSを表示' : 'All values match → log PASS to the Console', 17)
      text(240, 721, ja ? '要求の受付成功と、結果の一致は別の確認' : 'Request acceptance does not verify the result', 16)
    })

    diagram('flux-kernel-dispatch', lang, dark, 664, ja ? '入力Bufferからシェーダーを経て出力Bufferへ' : 'From input Buffer through a shader to output Buffer', ({ box, arrow, text, heading }) => {
      heading(27, ja ? '例：SetFloat("_Scale", 2f) を設定して実行' : 'EXAMPLE / SetFloat("_Scale", 2f) before Dispatch')
      box(60, 50, 360, 70, ['source / FluxBuffer', ja ? '要素iの値：(1, 2, 3, 4)' : 'Element i: (1, 2, 3, 4)'])
      arrow('M240 124 V154')
      box(20, 162, 440, 92, ['Dispatch(source, destination)', ja ? '入出力のCount・幅・高さをMaterialへ設定' : 'Set input/output Count, width, height on Material', 'VRCGraphics.Blit(source.Texture, …)'], true)
      arrow('M240 258 V288')
      text(258, 278, 'source.Texture → _MainTex', 16, undefined, 400, 'start')
      box(20, 296, 440, 136, [ja ? 'フラグメントシェーダー（この例）' : 'Fragment shader (this example)', ja ? '出力UV → index → 入出力の有効範囲を確認' : 'Output UV → index → check input/output bounds', ja ? 'Count外なら0を返す' : 'If outside Count, return 0', ja ? '_MainTexから同じindexのfloat4を読む' : 'Read float4 at the same index from _MainTex', 'return value * _Scale;'], true)
      arrow('M240 436 V466')
      text(258, 456, ja ? '戻り値を書き込む' : 'Write the return value', 16, undefined, 400, 'start')
      box(60, 474, 360, 70, ['destination / FluxBuffer', ja ? '要素iの結果：(2, 4, 6, 8)' : 'Element i result: (2, 4, 6, 8)'])
      text(240, 580, ja ? '入力と出力は別のBuffer' : 'Use separate input and output Buffers', 17)
      text(240, 608, ja ? '出力Countと容量は呼び出し前に準備する' : 'Prepare output Count and capacity before calling', 16)
      text(240, 636, ja ? 'DispatchはCountを変更せず、範囲判定もしない' : 'Dispatch does not change Count or check bounds', 16)
    })

    diagram('flux-buffer-count', lang, dark, 452, ja ? 'Countを変えてもCapacityは変わらない' : 'Changing Count preserves Capacity', ({ box, text, heading }) => {
      heading(27, 'Initial Count = 5 → Texture 3 × 3 → Capacity = 9')
      const rows = [[5, ja ? '確保直後' : 'After allocation'], [3, 'SetCount(3)'], [8, 'SetCount(8)']]
      rows.forEach(([count, label], row) => {
        const y = 67 + row * 112
        heading(y, `${label} / Count = ${count}`)
        for (let index = 0; index < 9; index++) {
          box(20 + index * 49, y + 18, 44, 42, [`${index}`], index < count)
        }
        text(240, y + 86, ja ? `有効：0〜${count - 1} / 容量：9要素のまま` : `Valid: 0–${count - 1} / Capacity stays at 9 elements`, 16)
      })
      text(240, 412, ja ? '色付き＝有効範囲 / 数字＝要素インデックス' : 'Filled cells = valid range / Numbers = element indices', 16)
      text(240, 440, ja ? 'SetCountはサイズ変更もデータの初期化もしない' : 'SetCount neither resizes nor initializes data', 16)
    })

    diagram('flux-buffer-layout', lang, dark, 564, ja ? '要素インデックスとテクスチャ座標' : 'Element indices and texture coordinates', ({ box, arrow, text, heading }) => {
      heading(27, 'Width = 3 / Count = 5 / Capacity = 9')
      for (let x = 0; x < 3; x++) text(133 + x * 108, 67, `x = ${x}`, 16)
      for (let y = 0; y < 3; y++) {
        text(43, 121 + y * 86, `y = ${y}`, 16)
        for (let x = 0; x < 3; x++) {
          const index = y * 3 + x
          box(85 + x * 108, 82 + y * 86, 96, 70, [`${index}`, index < 5 ? (ja ? '有効' : 'Valid') : (ja ? '範囲外' : 'Invalid')], index < 5)
        }
      }
      text(240, 354, 'index = y × width + x', 18)
      text(240, 381, ja ? '例：インデックス4 → (x, y) = (1, 1)' : 'Example: index 4 → (x, y) = (1, 1)', 16)
      arrow('M240 394 V418')
      box(45, 426, 390, 70, [ja ? '1ピクセル = 1要素 = 4成分' : '1 pixel = 1 element = 4 components', 'float4(x, y, z, w) ↔ Color(r, g, b, a)'], true)
      text(240, 523, ja ? '数字は保存値ではなくインデックス' : 'Numbers show indices, not stored values', 16)
      text(240, 547, ja ? '範囲外のピクセルも確保済み容量に含まれる' : 'Out-of-range pixels still belong to the allocated texture', 16)
    })

    diagram('flux-reduction', lang, dark, 632, ja ? '250要素を4ずつ集約する流れ' : 'Reduce 250 elements in groups of four', ({ box, arrow, text, heading }) => {
      heading(27, 'Reduction Factor = 4')
      const rows = [['Source', 250], ['Workspace A', 63], ['Workspace B', 16], ['Workspace A', 4], ['Destination', 1]]
      rows.forEach(([name, count], i) => {
        const y = 50 + i * 112
        box(80, y, 320, 70, [name, `Count = ${count}`], i === 4)
        if (i < 4) {
          arrow(`M240 ${y + 74} V${y + 104}`)
          text(258, y + 96, i === 3 ? (ja ? '最後のDispatch' : 'Final Dispatch') : `Dispatch ${i + 1}`, 16, undefined, 400, 'start')
        }
      })
      text(240, 600, ja ? 'Workspace A・Bを交互に使い、最後はDestinationへ' : 'Alternate workspaces; write the final result to Destination', 16)
      text(240, 624, ja ? '各出力のCount = ceil(入力のCount / 4)' : 'Each output Count = ceil(input Count / 4)', 16)
    })

    diagram('fluxfx-emission-cycles', lang, dark, 538, ja ? 'Emissionの開始遅延と周期' : 'Emission start delay and cycles', ({ box, arrow, text, heading }) => {
      heading(27, 'Start Delay = 1 s / Duration = 2 s')
      for (const [i, loop] of [true, false].entries()) {
        const y = 64 + i * 204
        heading(y, `Loop = ${loop ? 'ON' : 'OFF'}`, loop)
        box(30, y + 22, 84, 92, [ja ? '待機' : 'Delay', '1 s'])
        box(114, y + 22, 168, 92, [ja ? '周期1' : 'Cycle 1', '2 s', 'Time 0 Burst'], true)
        box(282, y + 22, 168, 92, loop
          ? [ja ? '周期2' : 'Cycle 2', '2 s', 'Time 0 Burst']
          : [ja ? '発生終了' : 'Emission ends', ja ? '新たな生成なし' : 'No new particles'], loop)
        arrow(`M30 ${y + 144} H462`)
        for (const [x, value] of [[30, 0], [114, 1], [282, 3], [450, 5]]) {
          arrow(`M${x} ${y + 138} V${y + 150}`, false)
          text(x, y + 173, `${value} s`, 16)
        }
      }
      text(240, 470, ja ? 'ON：待機を挟まず、周期3以降も繰り返す' : 'ON: repeat further cycles without another delay', 16)
      text(240, 494, ja ? 'OFF：既存粒子は寿命まで更新を続ける' : 'OFF: existing particles keep updating until they expire', 16)
      text(240, 516, ja ? 'Time 0 Burstは各周期が始まった後の更新で処理' : 'Time 0 bursts run in an update after each cycle starts', 16)
    })

    diagram('flux-ping-pong', lang, dark, 488, ja ? 'Ping-pongの入力と出力' : 'Ping-pong inputs and outputs', ({ box, arrow, text, heading }) => {
      for (let i = 0; i < 3; i++) {
        const top = 27 + i * 130
        const forward = i !== 1
        heading(top, `${i + 1} / Dispatch(${forward ? 'A, B' : 'B, A'})`)
        box(20, top + 23, 180, 70, ['Buffer A', ja ? (forward ? '入力' : '最新の出力') : (forward ? 'Input' : 'Latest output')], !forward)
        box(280, top + 23, 180, 70, ['Buffer B', ja ? (forward ? '最新の出力' : '入力') : (forward ? 'Latest output' : 'Input')], forward)
        arrow(forward ? `M204 ${top + 58} H272` : `M276 ${top + 58} H208`)
      }
      text(240, 419, ja ? '各Dispatch後に current と next の参照を交換' : 'Swap current and next references after each Dispatch', 16)
      text(240, 447, ja ? 'current が最新の出力を指す' : 'current points to the latest output', 17)
      text(240, 475, ja ? '初期値はAへ。交換時のTextureコピーは不要' : 'Initialize A first. Swapping does not copy textures.', 16)
    })

    diagram('flux-readback', lang, dark, 654, ja ? '読み戻しの受付と完了' : 'Readback acceptance and completion', ({ box, arrow, text, heading }) => {
      heading(27, ja ? 'REQUEST / 要求を開始' : 'REQUEST / START')
      box(20, 50, 440, 70, ['TryRequest(buffer, receiver)', ja ? '戻り値は受付結果' : 'The return value indicates acceptance'], true)
      arrow('M180 124 V153 H126 V184')
      arrow('M300 124 V153 H354 V184')
      text(166, 175, 'false', 16)
      text(394, 175, 'true', 16)
      box(20, 192, 212, 92, [ja ? '受付拒否' : 'Rejected', ja ? 'キューに入らない' : 'Not queued', ja ? 'この要求の通知なし' : 'No callback for this call'])
      box(248, 192, 212, 92, [ja ? '完了を待つ' : 'Wait for completion', 'IsRequesting = true', ja ? 'まだ結果を読まない' : 'Do not read results yet'])
      arrow('M354 288 V317 H240 V342')
      box(20, 350, 440, 92, ['_OnFluxReadbackComplete', 'IsRequesting = false', ja ? 'ここで Succeeded を確認' : 'Check Succeeded here'], true)
      arrow('M180 446 V477 H126 V508')
      arrow('M300 446 V477 H354 V508')
      text(166, 499, 'false', 16)
      text(394, 499, 'true', 16)
      box(20, 516, 212, 92, [ja ? '読み戻し失敗' : 'Readback failed', ja ? 'Dataを使わない' : 'Do not consume Data', ja ? '受付拒否とは別' : 'Not a rejection'])
      box(248, 516, 212, 92, [ja ? '結果を使う' : 'Consume the result', 'Data[0 .. Count - 1]', ja ? '有効要素だけ読む' : 'Read valid elements'])
      text(240, 638, ja ? '受付成功と転送成功は別に確認する' : 'Acceptance and transfer success are separate checks', 16)
    })

  }
}
