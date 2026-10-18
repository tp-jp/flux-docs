import { writeFileSync } from 'node:fs'

const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')

export function diagram(name, lang, dark, height, title, draw) {
  const c = dark
    ? { text: '#eeeef3', muted: '#b9bac8', line: '#85879a', accent: '#aaa6ff', runtime: '#65cbb9', fill: '#292a35', border: '#525366' }
    : { text: '#242638', muted: '#555b70', line: '#858b9e', accent: '#5954b5', runtime: '#197e70', fill: '#f0f0fa', border: '#c7c9dc' }
  const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="${height}" viewBox="0 0 480 ${height}" role="img" aria-labelledby="title">`,
    `<title id="title">${escape(title)}</title>`,
    `<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L7 4L1 7" fill="none" stroke="${c.line}" stroke-width="1.5"/></marker></defs>`,
    '<g font-family="Arial, Noto Sans JP, sans-serif">']
  const text = (x, y, value, size = 16, color = c.muted, weight = 400, anchor = 'middle') => {
    svg.push(`<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}" font-weight="${weight}">${escape(value)}</text>`)
  }
  const box = (x, y, w, h, lines, accent = false) => {
    svg.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${accent ? c.fill : 'none'}" stroke="${accent ? c.accent : c.border}"/>`)
    lines.forEach((line, i) => text(x + w / 2, y + 27 + i * 22, line, i ? 16 : 19, i ? c.muted : c.text, i ? 400 : 600))
  }
  const arrow = (d, head = true) => svg.push(`<path d="${d}" fill="none" stroke="${c.line}" stroke-width="1.5" ${head ? 'marker-end="url(#arrow)"' : ''}/>`)
  const heading = (y, value, runtime = false) => {
    const color = runtime ? c.runtime : c.accent
    svg.push(`<rect x="20" y="${y - 15}" width="4" height="20" rx="2" fill="${color}"/>`)
    text(36, y, value, 15, color, 700, 'start')
  }
  draw({ box, arrow, text, heading })
  svg.push('</g></svg>')
  writeFileSync(new URL(`../docs/public/diagrams/${name}-${lang}-${dark ? 'dark' : 'light'}.svg`, import.meta.url), svg.join('\n') + '\n')
}

