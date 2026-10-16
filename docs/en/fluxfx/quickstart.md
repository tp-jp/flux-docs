<span id="fluxfxのクイックスタート"></span>

# FluxFX quick start

Create a continuous stream of small white particles using the included Prefab. No script or shader authoring is required. Use a world project where you have completed [Installation](./installation.md).

<span id="prefabを配置する"></span>

## Place the Prefab

1. In the Project window, open **Packages → FluxFX → Runtime → Prefabs**.
2. Drag **FluxParticleSystem.prefab** into the Hierarchy.
3. Select its root and give it a recognizable name, such as MyFirstFluxFX.
4. Set Position to `(0, 1, 0)`, Rotation to `(0, 0, 0)`, and Scale to `(1, 1, 1)`.

Adjust the position for your scene, avoiding floors and walls. Keep the Prefab's children and internal references intact. Configure the root FluxParticleSystem through its custom Inspector.

<span id="inspectorで初期値を設定する"></span>

## Configure initial settings

Choose **English** in **Language / 言語** at the top of the Inspector to match this guide. Japanese is also available.

### Main

| Setting | Value | Meaning |
| --- | --- | --- |
| Particle Count | 64 | Allocated capacity |
| Simulation Space | Local | Simulate relative to the object |
| Play On Awake | On | Start automatically |
| Start Delay | 0 | No initial delay |
| Duration | 5 | Emission cycle duration |
| Loop | On | Repeat emission |
| Start Lifetime Mode | Constant | Fixed lifetime |
| Start Lifetime | 3 | Three-second lifetime |
| Start Speed Mode | Constant | Fixed initial speed |
| Start Speed | 1 | Initial speed of 1 |
| Start Color Mode | Constant | Fixed initial color |
| Start Color | White, Alpha 1 | Opaque white |
| Start Size Mode | Constant | Fixed initial size |
| Start Size | 0.1 | Small particles |
| Start Rotation Mode | Constant | Fixed initial rotation |
| Start Rotation | 0 | No initial rotation |

Particle Count is not the emission rate. These values are for this tutorial and do not all match the Prefab defaults.

<span id="emissionとshape"></span>

### Emission and Shape

Under EMISSION, set Rate over Time to 8, requesting eight particles per second. Leave Bursts empty.

Under SHAPE, select Cone, Radius 0.5, and Angle 25.

Do not add modules yet. First observe movement from initial velocity alone.

### Renderer

Open **RENDERER** and configure the following settings.

| Setting | Value |
| --- | --- |
| Mode | Billboard |
| Blend Mode | Alpha |
| Intensity | 1 |
| Texture | Unassigned |
| Tiling | `(1, 1)` |
| Offset | `(0, 0)` |
| Culling Bounds | Keep the Prefab setting |

This example displays white particles without an image texture. Billboard needs no source Mesh. Add a texture and adjust blending later for effects such as round glowing particles.

<span id="sceneビューでプレビューする"></span>

## Preview in the Scene view

1. Keep the root selected and focus the Scene view around it.
2. Find the **FluxFX Preview** overlay.
3. Click Play if stopped, or Restart to begin again.
4. Verify that white particles continuously spawn and move away.

The overlay is available while the target Inspector is displayed in Edit Mode. If missing, check Scene view overlay visibility. It provides Play/Pause, Restart, Stop, and elapsed-time information. These Editor controls are separate from similarly named runtime UdonSharp APIs.

<span id="play-modeで確認する"></span>

## Verify in Play Mode

Save the scene and enter Play Mode with normal scene reload. Play On Awake starts emission automatically.

Observe the effect in Scene view. For Game view, the camera or player must be able to see it. Particles should move, disappear after about three seconds, and be replaced by new particles.

Check the Console for FluxFX or SceneFlow errors. A working Editor preview does not prove runtime generation succeeded.

<span id="設定を変えてみる"></span>

## Try changing settings

Exit Play Mode, change one setting at a time, and compare the results in the preview:

| Change | Expected observation |
| --- | --- |
| Rate over Time → 16 | More frequent emission |
| Start Lifetime → 1 | Particles disappear sooner |
| Start Size → 0.2 | Larger particles |
| Start Color → another color | Different initial color |
| Start Speed → 0.5 | Slower movement |

Higher rates and longer lifetimes increase the number of simultaneously alive particles. Increasing Particle Count also increases capacity-related rendering costs.

<span id="表示されない場合"></span>

## If nothing appears

| Symptom | Check |
| --- | --- |
| No custom Inspector | Select the Prefab root and resolve compilation errors |
| Authoring-required error | Keep FluxParticleAuthoring on the same GameObject; try a fresh Prefab |
| No emission | Play On Awake, Rate, lifetime, and preview state |
| Particles exist but are invisible | Size, color Alpha, Intensity, camera, and position |
| Preview preparation fails | Console and preview error messages |
| Play Mode fails | SceneFlow generation, dependencies, and scene reload |

<span id="次のステップ"></span>

## Next steps

Explore [Inspector and preview](./inspector-preview.md), then [Main](./main.md), [Emission](./emission.md), [Shape](./shape.md), and [Renderer](./renderer.md). The [guide contents](./guide.md) lists all topics.
