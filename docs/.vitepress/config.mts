import { defineConfig, type DefaultTheme } from 'vitepress'

const jaTheme: DefaultTheme.Config = {
    nav: [
      { text: 'Flux', link: '/flux/' },
      { text: 'FluxFX', link: '/fluxfx/' }
    ],
    sidebar: {
      '/flux/': [
        { text: 'Flux', items: [
          { text: '概要', link: '/flux/' },
          { text: '導入', link: '/flux/installation' },
          { text: 'クイックスタート', link: '/flux/quickstart' },
          { text: 'ガイドの目次', link: '/flux/guide' }
        ] },
        { text: '基本操作', items: [
          { text: 'Bufferとデータ構造', link: '/flux/buffers' },
          { text: 'Kernelとシェーダー', link: '/flux/kernels' },
          { text: 'アップロード', link: '/flux/upload' },
          { text: '非同期読み戻し', link: '/flux/readback' }
        ] },
        { text: '応用', items: [
          { text: 'Ping-pongによる反復計算', link: '/flux/ping-pong' },
          { text: 'Reductionによる集約', link: '/flux/reduction' }
        ] },
        { text: '困ったとき', items: [
          { text: 'トラブルシューティング', link: '/flux/troubleshooting' },
          { text: '制約', link: '/flux/limitations' }
        ] }
      ],
      '/fluxfx/': [
        { text: 'FluxFX', items: [
          { text: '概要', link: '/fluxfx/' },
          { text: '導入', link: '/fluxfx/installation' },
          { text: 'クイックスタート', link: '/fluxfx/quickstart' },
          { text: 'ガイドの目次', link: '/fluxfx/guide' }
        ] },
        { text: '基本操作', items: [
          { text: 'Inspectorとプレビュー', link: '/fluxfx/inspector-preview' },
          { text: 'Main', link: '/fluxfx/main' },
          { text: 'Emission', link: '/fluxfx/emission' },
          { text: 'Shape', link: '/fluxfx/shape' },
          { text: 'Renderer', link: '/fluxfx/renderer' }
        ] },
        { text: 'モジュール', items: [
          { text: 'モジュールの基本', link: '/fluxfx/modules' },
          { text: '力と速度', link: '/fluxfx/forces' },
          { text: '動きの変化', link: '/fluxfx/motion' },
          { text: '寿命に応じた見た目', link: '/fluxfx/lifetime-appearance' },
          { text: 'テクスチャアニメーションと点滅', link: '/fluxfx/texture-animation-blink' },
          { text: 'Trails', link: '/fluxfx/trails' }
        ] },
        { text: 'UdonSharpからの制御', items: [
          { text: '再生と停止', link: '/fluxfx/playback' },
          { text: '実行時のパラメーター変更', link: '/fluxfx/runtime-parameters' },
          { text: '状態と粒子数の取得', link: '/fluxfx/state-and-count' }
        ] },
        { text: '困ったとき', items: [
          { text: 'トラブルシューティング', link: '/fluxfx/troubleshooting' },
          { text: '制約と性能', link: '/fluxfx/limitations' }
        ] }
      ]
    },
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '検索', buttonAriaLabel: 'ドキュメントを検索' },
              modal: {
                noResultsText: '検索結果がありません',
                resetButtonTitle: '検索をクリア',
                footer: { selectText: '選択', navigateText: '移動', closeText: '閉じる' }
              }
            }
          }
        }
      }
    },
    outline: { label: 'このページの内容', level: [2, 3] },
    docFooter: { prev: '前のページ', next: '次のページ' },
    sidebarMenuLabel: 'メニュー',
    returnToTopLabel: '先頭に戻る',
    darkModeSwitchLabel: '表示テーマ',
    lightModeSwitchTitle: 'ライトモードに切り替え',
    darkModeSwitchTitle: 'ダークモードに切り替え',
    socialLinks: [{ icon: 'github', link: 'https://github.com/tp-jp/flux-docs' }]
  }

const labels: Record<string, string> = {
  "概要": "Overview",
  "導入": "Installation",
  "クイックスタート": "Quick start",
  "ガイドの目次": "Guide contents",
  "基本操作": "Basics",
  "Bufferとデータ構造": "Buffers and data layout",
  "Kernelとシェーダー": "Kernels and shaders",
  "アップロード": "Uploading data",
  "非同期読み戻し": "Asynchronous readback",
  "応用": "Advanced usage",
  "Ping-pongによる反復計算": "Iterative computation with ping-pong",
  "Reductionによる集約": "Aggregation with reduction",
  "困ったとき": "Help",
  "トラブルシューティング": "Troubleshooting",
  "制約": "Limitations",
  "Inspectorとプレビュー": "Inspector and preview",
  "モジュール": "Modules",
  "モジュールの基本": "Module basics",
  "力と速度": "Forces and velocity",
  "動きの変化": "Motion effects",
  "寿命に応じた見た目": "Appearance over lifetime",
  "テクスチャアニメーションと点滅": "Texture animation and blinking",
  "UdonSharpからの制御": "Controlling FluxFX from UdonSharp",
  "再生と停止": "Playback controls",
  "実行時のパラメーター変更": "Runtime parameters",
  "状態と粒子数の取得": "Status and particle counts",
  "制約と性能": "Limitations and performance"
}

function englishItems(items: DefaultTheme.SidebarItem[]): DefaultTheme.SidebarItem[] {
  return items.map(item => ({
    ...item,
    text: item.text ? labels[item.text] ?? item.text : undefined,
    link: item.link ? '/en' + item.link : undefined,
    items: item.items ? englishItems(item.items) : undefined
  }))
}

const englishSidebar = Object.fromEntries(
  Object.entries(jaTheme.sidebar as Record<string, DefaultTheme.SidebarItem[]>)
    .map(([prefix, items]) => ['/en' + prefix, englishItems(items)])
)

export default defineConfig({
  title: 'Flux Docs',
  base: '/flux-docs/',
  cleanUrls: false,
  locales: {
    root: {
      label: '日本語',
      lang: 'ja-JP',
      description: 'Flux・FluxFXの日本語利用者向けガイド',
      themeConfig: {
        ...jaTheme,
        langMenuLabel: '言語を切り替え',
        skipToContentLabel: '本文へ移動',
        notFound: { title: 'ページが見つかりません', quote: 'URLを確認するか、トップページからお探しください。', linkLabel: 'トップページへ', linkText: 'トップページへ' }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      description: 'User guides for Flux and FluxFX',
      themeConfig: {
        nav: [{ text: 'Flux', link: '/en/flux/' }, { text: 'FluxFX', link: '/en/fluxfx/' }],
        sidebar: englishSidebar,
        outline: { label: 'On this page', level: [2, 3] },
        docFooter: { prev: 'Previous page', next: 'Next page' },
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Return to top',
        langMenuLabel: 'Change language',
        skipToContentLabel: 'Skip to content',
        darkModeSwitchLabel: 'Appearance',
        lightModeSwitchTitle: 'Switch to light theme',
        darkModeSwitchTitle: 'Switch to dark theme'
      }
    }
  },
  themeConfig: {
    i18nRouting: true,
    search: jaTheme.search,
    socialLinks: jaTheme.socialLinks
  }
})
