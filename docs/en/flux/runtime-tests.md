# Runtime Tests

Runtime Tests is a sample that checks Flux transfers, computation, and readback in the Udon VM. Normal Play and Unity Test Runner execute the same test bodies.

## Import and prerequisites {#setup}

1. [Install](./installation.md) Flux, VRChat Worlds SDK (including UdonSharp and ClientSim), and SceneFlow.
2. Select Flux in **Window → Package Manager**, then choose **Samples → Runtime Tests → Import**.
3. Open `Scenes/RuntimeTest.unity` in the imported Runtime Tests folder. Use the import location shown by Package Manager.

The sample uses TextMeshPro for results and Unity Test Framework for Editor tests. Install Test Framework to use Test Runner and resolve compilation errors. Enable ClientSim and **Scene Reload** in Enter Play Mode settings. If unsure, disable Enter Play Mode Options to use the normal Play configuration.

Because this suite includes standard Scatter, it requires **Direct3D 11, ARGBFloat RenderTextures, and asynchronous GPU Readback**. Do not run with `-nographics`. The suite's D3D11 requirement is not a requirement of every Flux feature.

The distributed sample lives at `Samples~/RuntimeTests`. In development checkouts, release packaging stages the sample, so an Import entry may appear without the sample files being present. Use a distribution package that includes Runtime Tests.

## Run with normal Play {#play}

Save your working Scenes and enter Play in the RuntimeTest scene. SceneFlow prepares Kernel Materials, and ClientSim runs the tests sequentially in the Udon VM. On completion, the scene displays individual PASS / FAIL results and totals. Also check earlier Console errors.

## Run through Test Runner {#test-runner}

1. Exit Play and save your working Scenes.
2. Open **Window → General → Test Runner → EditMode**.
3. Select and run `TpLab.Flux.RuntimeTests.Editor.FluxRuntimeSceneTests.RuntimeScenePassesInUdonVm`.

This integration test compiles UdonSharp for Player and Editor, opens RuntimeTest, and enters Play. It checks completion, pass counts, and the Udon execution flag in the UdonBehaviour heap, rather than calling the C# test bodies directly. Appearing in the EditMode tab does not mean it only tests C#.

The scene is located by GUID, without depending on an absolute import path. Its registered tests determine the expected count. Missing references, an empty suite, failures, unexpected error logs, and failure to complete within 180 seconds after entering Play are detected. Teardown stops Play and restores the prior scene setup and Play Mode Start Scene.

The **one integration test** shown in Test Runner and the **multiple Udon cases** executed inside the scene are different counts. Check both the Test Runner outcome and the reported Udon counts and execution state. Compilation success alone does not establish correct GPU results.

## Reimport and troubleshooting {#reimport}

Before updating samples, back up your edits. Reimport through Package Manager, open the updated sample, and check both normal Play and Test Runner. Avoid keeping duplicate old copies with the same GUIDs or types. Keep UdonSharp scripts together with their corresponding Program Assets.

| Symptom | Check |
| --- | --- |
| Test is missing | Test Framework, the sample's Editor tests, and compilation errors |
| ClientSim or Scene Reload assertion fails | Enable ClientSim and stop disabling Scene Reload |
| Shader or GPU check fails | D3D11 and GPU Readback support; also check SceneFlow Material preparation errors |
| Tests do not complete | First Console error, halted Udon execution, Readback failure, and scene references |

This checks Udon VM and GPU processing in Editor Play / ClientSim. VRChat clients, other GPUs or graphics APIs, and application-specific output, appearance, and performance require separate validation.
