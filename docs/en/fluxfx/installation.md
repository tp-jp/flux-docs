<span id="fluxfxの導入"></span>

# Installing FluxFX

Add the package repository to VRChat Creator Companion (VCC), then install FluxFX in a world project.

<span id="必要な環境"></span>

## Requirements

| Item | Required version |
| --- | --- |
| Unity | 2022.3 |
| VRChat Worlds SDK | 3.10.5 or later, below 4.0.0 |
| SceneFlow | 2.1.0 or later, below 3.0.0 |
| Flux | 0.0.4 |

Dependencies may vary by FluxFX version. Follow the dependency requirements of the package you install.

<span id="vccへリポジトリを登録する"></span>

## Add the repository to VCC

Use either method. If you already registered it for Flux, do not add it again.

- Open the [package repository](https://tp-jp.github.io/vpm-repos/) and click **Add to VCC**.
- Open **Settings → Packages → Add Repository** in VCC and add:

```text
https://tp-jp.github.io/vpm-repos/index.json
```

<span id="プロジェクトに追加する"></span>

## Add it to the project

1. Select your world project in VCC.
2. Open **Manage Project → Manage Packages**.
3. Click **＋** beside **FluxFX**, or choose a version under **Installed Version**.
4. Review and apply dependency changes. Flux, SceneFlow, and the Worlds SDK are required.
5. Open Unity and wait for importing and compilation to finish.

If the Console shows compilation errors, resolve dependency installation before adding the Prefab.

<span id="導入を確認する"></span>

## Verify the installation

Under Packages → FluxFX, check for:

```text
Packages/com.tplab.flux.fx/Runtime/Prefabs/FluxParticleSystem.prefab
```

Use this Prefab for effects. Other Prefabs such as Buffer and Step are internal building blocks.

In **Tools → SceneFlow → Debug Window**, verify that FluxFXCompileBuildPass and FluxBuildPass are detected. FluxFX generates the runtime configuration first, then Flux prepares Kernel Materials.

Use normal scene reload for Play Mode. If fast Play Mode settings were changed under **Edit → Project Settings → Editor**, first test with Enter Play Mode Options disabled.

<span id="次に読む"></span>

## Next steps

Follow the [Quick start](./quickstart.md) to place the Prefab and configure your first effect.
