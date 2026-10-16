<span id="fluxfx-guide-contents"></span>

# FluxFXガイドの目次

導入とクイックスタートから始め、Inspectorでの制作、モジュール、UdonSharpによる制御の順に進みます。問題への対処や性能の調整は「困ったとき」を参照してください。

<span id="getting-started"></span>

## はじめに

| 章 | 扱う内容 |
| --- | --- |
| [概要](./index.md) | できることと制作の流れ |
| [導入](./installation.md) | VCC、依存パッケージ、導入確認 |
| [クイックスタート](./quickstart.md) | Prefab配置、粒子の表示、初期設定の調整 |

<span id="basics"></span>

## 基本操作

| 章 | 扱う内容 |
| --- | --- |
| [Inspectorとプレビュー](./inspector-preview.md) | 設定画面、言語、Editorでの確認 |
| [Main](./main.md) | 容量、寿命、初速、初期値、シミュレーション空間、再生条件 |
| [Emission](./emission.md) | 発生頻度とBurst、再生周期との関係 |
| [Shape](./shape.md) | 発生形状と領域 |
| [Renderer](./renderer.md) | Billboard・Mesh、テクスチャ、ブレンド、描画範囲 |

<span id="modules"></span>

## モジュール

| 章 | 扱う内容 |
| --- | --- |
| [モジュールの基本](./modules.md) | 追加、設定、組み合わせ |
| [力と速度](./forces.md) | Gravity、Force、Drag、Limit Velocity |
| [動きの変化](./motion.md) | Noise、Vortex、Velocity over Lifetime |
| [寿命に応じた見た目](./lifetime-appearance.md) | Color・Size・Rotation over Lifetime |
| [テクスチャアニメーションと点滅](./texture-animation-blink.md) | Texture Sheet Animation、Blink |
| [Trails](./trails.md) | 軌跡の設定と表示 |
| [カスタムモジュール](./custom-modules.md) | 独自の設定・GPU処理・UdonSharp用ハンドルの作成 |

<span id="controlling-fluxfx-from-udonsharp"></span>

## UdonSharpからの制御

| 章 | 扱う内容 |
| --- | --- |
| [再生と停止](./playback.md) | Play、Stop、Pause、Restart、Clear |
| [実行時のパラメーター変更](./runtime-parameters.md) | 操作方法と変更が反映されるタイミング |
| [状態と粒子数の取得](./state-and-count.md) | 再生状態、経過時間、生存粒子数 |

<span id="help"></span>

## 困ったとき

| 章 | 扱う内容 |
| --- | --- |
| [トラブルシューティング](./troubleshooting.md) | 表示、生成処理、パラメーター変更の問題 |
| [制約と性能](./limitations.md) | 容量、Mesh、Trails、実行環境、同期 |
