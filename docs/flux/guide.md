<span id="flux-guide-contents"></span>

# Fluxガイドの目次

Fluxを使うワールド制作者に向けて、導入、データ転送、GPU計算の順に説明します。概要・導入・クイックスタートから読み進め、基本操作でBufferとKernelの使い方を確認してください。反復計算と集約は応用、エラーへの対処と実装上の制約は「困ったとき」にまとめています。

<span id="getting-started"></span>

## はじめに

| 章 | 扱う内容 |
| --- | --- |
| [概要](./index.md) | Fluxの役割と5つのコンポーネント |
| [導入](./installation.md) | 必要なパッケージ、Unityへの導入、SceneFlowの準備 |
| [クイックスタート](./quickstart.md) | 小さな配列をGPUへ転送し、読み戻して結果を確認する |

<span id="basics"></span>

## 基本操作

| 章 | 扱う内容 |
| --- | --- |
| [Bufferとデータ構造](./buffers.md) | 4成分データ、CountとCapacity、初期サイズ、解放 |
| [Kernelとシェーダー](./kernels.md) | Shaderの設定、パラメーター、Dispatch、FluxCommon.hlsl |
| [アップロード](./upload.md) | Vector4配列の転送、要素数の一致、512要素の上限 |
| [非同期読み戻し](./readback.md) | 要求の受付、完了イベント、成功・失敗の判定、有効範囲 |

<span id="advanced-usage"></span>

## 応用

| 章 | 扱う内容 |
| --- | --- |
| [Ping-pongによる反復計算](./ping-pong.md) | 2つのBufferで入力と出力を交互に切り替える |
| [Reductionによる集約](./reduction.md) | 集約シェーダー、縮小率、作業用Bufferの容量と分離 |

<span id="help"></span>

## 困ったとき

| 章 | 扱う内容 |
| --- | --- |
| [トラブルシューティング](./troubleshooting.md) | 参照の設定漏れ、Material生成、転送エラー、読み戻し失敗 |
| [制約](./limitations.md) | 容量変更、転送上限、同期、利用環境の確認事項 |
