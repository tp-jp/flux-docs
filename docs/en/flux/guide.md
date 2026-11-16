<span id="fluxガイドの目次"></span>

# Flux guide contents

This guide is for VRChat world creators. Start with the overview, installation, and quick start, then learn Buffer and Kernel operations. Advanced usage covers iteration, reduction, grid accumulation, and filtering. Help covers errors, implementation limits, and Runtime Tests.

<span id="はじめに"></span>

## Getting started

| Chapter | Topics |
| --- | --- |
| [Overview](./index.md) | What Flux does and its main components |
| [Installation](./installation.md) | Dependencies, Unity setup, and SceneFlow |
| [Quick start](./quickstart.md) | Upload a small array and read it back to verify the result |

<span id="基本操作"></span>

## Basics

| Chapter | Topics |
| --- | --- |
| [Buffers and data layout](./buffers.md) | Four-component data, Count, Capacity, automatic/explicit dimensions, filtering, and release |
| [Kernels and shaders](./kernels.md) | Shader setup, Pass selection, Material settings copy, Dispatch, and FluxCommon.hlsl |
| [Uploading data](./upload.md) | Vector4 arrays, matching counts, and the 512-element limit |
| [Asynchronous readback](./readback.md) | Request acceptance, completion callbacks, success/failure checks, and valid data ranges |

<span id="応用"></span>

## Advanced usage

| Chapter | Topics |
| --- | --- |
| [Iterative computation with ping-pong](./ping-pong.md) | Alternate input and output between two Buffers |
| [Aggregation with reduction](./reduction.md) | Reduction shaders, factors, workspace capacity, and separate Buffers |
| [3D grids and atlases](./grid3d.md) | Cell, pixel, and UV mapping; HLSL interpolation |
| [Scatter accumulation](./scatter.md) | Clearing, chunked accumulation, input layout, and custom readers |
| [Grid Filter smoothing](./grid-filter.md) | Axis weights, boundaries, and Shader integration |
| [Combining grid operations](./grid-workflow.md) | Minimal initialization, accumulation, filtering, and Buffer-swap example |

<span id="困ったとき"></span>

## Help

| Chapter | Topics |
| --- | --- |
| [Troubleshooting](./troubleshooting.md) | Missing references, Material generation, upload errors, and readback failures |
| [Limitations](./limitations.md) | Capacity changes, transfer limits, networking, and execution environments |
| [Runtime Tests](./runtime-tests.md) | Sample import, normal Play, and Udon VM execution through Test Runner |
