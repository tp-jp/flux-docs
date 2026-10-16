<span id="fluxの導入"></span>

# Installing Flux

Install Flux by adding its package repository to VRChat Creator Companion (VCC). Prepare a world project with the VRChat Worlds SDK installed.

<span id="必要な環境"></span>

## Requirements

| Item | Required version |
| --- | --- |
| Unity | 2022.3 |
| VRChat Worlds SDK | 3.10.5 or later, below 4.0.0 |
| SceneFlow | 2.1.0 or later, below 3.0.0 |

Use UdonSharp to control Flux. [UdonSharp is included in the VRChat Worlds SDK](https://creators.vrchat.com/worlds/udon/udonsharp/).

<span id="vccで導入する"></span>

## Install through VCC

<span id="リポジトリを登録する"></span>

### Add the repository

With VCC installed, use either method:

- Open the [package repository page](https://tp-jp.github.io/vpm-repos/) and click **Add to VCC**.
- In VCC, open **Settings → Packages → Add Repository** and add this URL:

```text
https://tp-jp.github.io/vpm-repos/index.json
```

<span id="プロジェクトにfluxを追加する"></span>

### Add Flux to your project

1. Select your world project in VCC.
2. Open **Manage Project → Manage Packages**.
3. Click the **＋** button beside **Flux**. To select a specific version, use **Installed Version**.
4. Review and apply any dependency additions or updates. Flux requires the Worlds SDK and SceneFlow.
5. Open the project in Unity. Wait for importing and compilation to finish, and check the Console for errors.

<span id="vpm-cliでリポジトリを登録する"></span>

## Add the repository with VPM CLI

If you use VPM CLI, run:

```sh
vpm add repo https://tp-jp.github.io/vpm-repos/index.json
```

This registers the repository. You can then add Flux to the project through VCC as described above.

<span id="unitypackageで導入する"></span>

## Install a unitypackage

To install without the repository, download the `.unitypackage` for your version from [Flux Releases](https://github.com/tp-jp/Flux/releases) and import it into Unity.

The Worlds SDK and SceneFlow are still required. Install them before importing Flux.

<span id="導入できたことを確認する"></span>

## Verify the installation

In the Project window, open the Flux installation folder. A VCC installation appears under Packages.

| File | Purpose |
| --- | --- |
| `Runtime/Udon/FluxBuffer.cs` | Stores GPU data |
| `Runtime/Udon/FluxKernel.cs` | Executes shaders |
| `Runtime/Udon/FluxUpload.cs` | Uploads arrays |
| `Runtime/Udon/FluxReadback.cs` | Reads GPU data back |
| `Runtime/Shaders/FluxUpload.shader` | Upload shader |
| `Editor/FluxBuildPass.cs` | Generates Kernel Materials |

Open **Tools → SceneFlow → Debug Window** and check that the detected passes include `FluxBuildPass`.

<span id="sceneflowによる準備"></span>

## Preparation by SceneFlow

Assign a Shader to each FluxKernel in the Inspector. When SceneFlow processes the scene, `FluxBuildPass` generates and assigns the Material needed at runtime. You do not need to create it manually.

For Editor testing, use Play Mode with normal scene reload enabled. SceneFlow is invoked through `IProcessSceneWithReport`. If you have changed the fast Play Mode settings under **Edit → Project Settings → Editor**, first test with Enter Play Mode Options disabled.

Calling `SetFloat`, `Dispatch`, or other Kernel methods before scene processing has prepared the Material can cause errors.

<span id="次のステップ"></span>

## Next steps

Use the [Quick start](./quickstart.md) to upload four elements and read them back to verify the installation.
