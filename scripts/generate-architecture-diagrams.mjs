// Run with node scripts/generate-architecture-diagrams.mjs.
// Generated SVGs are committed assets; no diagram library runs in the browser.
import { writeFileSync } from 'node:fs'

const translations = {
  ja: {
    title: 'FluxFX：設定から描画まで',
    stages: ['EDITOR / 設定と生成', 'RUNTIME / 実行'],
    nodes: [
      ['Inspectorの設定', 'Authoring / Module'],
      ['定義の収集', 'Value・Provider・Parameter・Operation'],
      ['コンパイルと生成', '処理順・データ配置・シェーダー'],
      ['実行用構成', 'Buffer・Kernel・Material', 'ハンドルの対応情報'],
      ['UdonSharpによる制御', '発生要求・パラメーター'],
      ['GPUで生成・更新', '粒子状態をBufferに保持'],
      ['描画・履歴', 'Billboard / Mesh / Trails']
    ]
  },
  en: {
    title: 'FluxFX: from settings to rendering',
    stages: ['EDITOR / CONFIGURATION', 'RUNTIME'],
    nodes: [
      ['Inspector settings', 'Authoring / Modules'],
      ['Collect definitions', 'Values, Providers, Parameters, Operations'],
      ['Compile and generate', 'Order, data layout, shaders'],
      ['Runtime configuration', 'Buffers, Kernels, Materials', 'Handle mappings'],
      ['UdonSharp control', 'Spawn requests and parameters'],
      ['Spawn and update on GPU', 'Particle state in Buffers'],
      ['Rendering and history', 'Billboards / Meshes / Trails']
    ]
  }
}
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')

for (const [lang, content] of Object.entries(translations)) {
  for (const dark of [false, true]) {
    const c = dark
      ? { text: '#eeeeF3', muted: '#b9bac8', line: '#656779', accent: '#aaa6ff', runtime: '#65cbb9', fill: '#292a35', border: '#525366' }
      : { text: '#242638', muted: '#555b70', line: '#9a9fb1', accent: '#5954b5', runtime: '#197e70', fill: '#f0f0fa', border: '#c7c9dc' }
    const y = [52, 146, 240, 350, 504, 598, 692]
    const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="780" viewBox="0 0 480 780" role="img" aria-labelledby="title">`,
      `<title id="title">${escape(content.title)}</title>`,
      `<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L7 4L1 7" fill="none" stroke="${c.line}" stroke-width="1.5"/></marker></defs>`,
      '<g font-family="Arial, Noto Sans JP, sans-serif">']
    for (const [index, top] of [16, 468].entries()) {
      const color = index ? c.runtime : c.accent
      svg.push(`<rect x="20" y="${top}" width="4" height="20" rx="2" fill="${color}"/>`,
        `<text x="36" y="${top + 15}" fill="${color}" font-size="15" font-weight="700" letter-spacing="1">${content.stages[index]}</text>`)
    }
    content.nodes.forEach((lines, i) => {
      const top = y[i]
      const height = i === 3 ? 88 : 70
      if (i > 0) {
        const from = y[i - 1] + (i - 1 === 3 ? 88 : 70)
        const to = top - 7
        svg.push(`<path d="M240 ${from + 4} V${to}" fill="none" stroke="${c.line}" stroke-width="1.5" marker-end="url(#arrow)"/>`)
      }
      svg.push(`<rect x="20" y="${top}" width="440" height="${height}" rx="10" fill="${i === 3 ? c.fill : 'none'}" stroke="${i === 3 ? c.accent : c.border}"/>`)
      lines.forEach((line, n) => svg.push(`<text x="240" y="${top + 27 + n * 22}" text-anchor="middle" fill="${n ? c.muted : c.text}" font-size="${n ? 16 : 19}" font-weight="${n ? 400 : 600}">${escape(line)}</text>`))
    })
    svg.push('</g></svg>')
    writeFileSync(new URL(`../docs/public/diagrams/fluxfx-architecture-${lang}-${dark ? 'dark' : 'light'}.svg`, import.meta.url), svg.join('\n') + '\n')
  }
}
