<span id="about-flux"></span>

# Fluxの概要

Fluxは、VRChat向けのGPU計算フレームワークです。GPU上のデータをRenderTextureに保持し、シェーダーで計算します。UdonSharpからデータの転送や計算を制御できます。

<span id="main-components"></span>

## 主な構成要素

| コンポーネント | 役割 |
| --- | --- |
| `FluxBuffer` | GPU上のデータと有効な要素数を管理する |
| `FluxKernel` | シェーダーのパラメーターを設定し、Bufferに計算結果を書き込む |
| `FluxUpload` | CPU上の`Vector4[]`をBufferへ転送する |
| `FluxReadback` | GPU上のデータをCPUへ非同期で読み戻す |
| `FluxReduction` | 複数回の計算でBufferのデータを1要素へ集約する |

1つのBuffer要素は、テクスチャの1ピクセルに対応する4成分の浮動小数点データです。Kernelは`VRCGraphics.Blit`を通じてシェーダーを実行します。

<span id="environment"></span>

## 使用する環境

FluxはUnity 2022.3、VRChat Worlds SDK、SceneFlowを使います。必要なバージョンと設定方法は[導入](./installation.md)を参照してください。

Fluxは開発初期段階にあり、APIやパッケージ構成が変わる可能性があります。

<span id="next-steps"></span>

## 次に読む

[導入](./installation.md)で必要な環境を準備し、[クイックスタート](./quickstart.md)でデータの転送と読み戻しを試してください。全体の構成は[ガイドの目次](./guide.md)で確認できます。
