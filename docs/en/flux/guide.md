<span id="fluxガイドの目次"></span>

# Flux guide contents

This guide is for VRChat world creators. Start with the overview, installation, and quick start, then learn Buffer and Kernel operations. Advanced usage covers iteration and aggregation; Help covers errors and implementation limits.

<span id="はじめに"></span>

## Getting started

| Chapter | Topics |
| --- | --- |
| [Overview](./index.md) | What Flux does and its five components |
| [Installation](./installation.md) | Dependencies, Unity setup, and SceneFlow |
| [Quick start](./quickstart.md) | Upload a small array and read it back to verify the result |

<span id="基本操作"></span>

## Basics

| Chapter | Topics |
| --- | --- |
| [Buffers and data layout](./buffers.md) | Four-component data, Count, Capacity, allocation, and release |
| [Kernels and shaders](./kernels.md) | Shader setup, parameters, Dispatch, and FluxCommon.hlsl |
| [Uploading data](./upload.md) | Vector4 arrays, matching counts, and the 512-element limit |
| [Asynchronous readback](./readback.md) | Request acceptance, completion callbacks, success/failure checks, and valid data ranges |

<span id="応用"></span>

## Advanced usage

| Chapter | Topics |
| --- | --- |
| [Iterative computation with ping-pong](./ping-pong.md) | Alternate input and output between two Buffers |
| [Aggregation with reduction](./reduction.md) | Reduction shaders, factors, workspace capacity, and separate Buffers |

<span id="困ったとき"></span>

## Help

| Chapter | Topics |
| --- | --- |
| [Troubleshooting](./troubleshooting.md) | Missing references, Material generation, upload errors, and readback failures |
| [Limitations](./limitations.md) | Capacity changes, transfer limits, networking, and execution environments |
