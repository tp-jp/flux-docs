# Custom module quick start {#custom-module-quickstart}

Generate a module that accelerates particles upward, preview it, then change its calculation. You do not need to write a Contract or Handle by hand to get started.

::: info Availability
The generator is currently implemented in the development version. Inclusion in a released version has not been confirmed. These steps require **Tools → FluxFX → Create Custom Module...**. If that menu is unavailable, see [Custom modules](./custom-modules.md) for manual implementation.
:::

## 1. Generate the module {#create}

Exit Play Mode and open **Tools → FluxFX → Create Custom Module...**. Start with these defaults.

| Input | Default and purpose |
| --- | --- |
| Module Name | `CustomAcceleration`: base name for classes |
| Namespace | `MyCompany.FluxFX`: the resulting parent namespace is `MyCompany.FluxFX.CustomAcceleration` |
| Parent Folder | `Assets`: select an existing project folder |
| Generate Runtime API | OFF: enable only if you need a typed Handle for external Udon scripts |
| Destination | Calculated output path; `Assets/CustomAcceleration` with the defaults |

Press **Create Module** and wait for Unity to finish compiling. Generation requires a new folder. If that output already exists, choose another Module Name.

The window's main labels follow the FluxFX Inspector language setting. This page uses English labels. Detailed input validation errors are in English.

## 2. Add it and preview {#preview}

1. Place the bundled **FluxParticleSystem Prefab**, as in the [Quick start](./quickstart.md). Authoring alone is insufficient.
2. In the root's FluxParticleAuthoring Inspector, choose **Modules → Velocity Update → Add Module → Custom → Custom Acceleration Module**.
3. Enter the settings below. Remove other movement modules for comparison.
4. Press **Play** in the Scene view's **FluxFX Preview** overlay. Preview starts stopped.

| Location | Suggested settings |
| --- | --- |
| Main | Particle Count = 64, Simulation Space = Local, Start Lifetime = 3, Start Speed = 0 |
| Main playback settings | Start Delay = 0, Duration = 5, Loop = ON; also enable Play On Awake for Play Mode |
| Renderer | Start Size = 1 |
| Emission | Rate over Time = 8, no bursts |
| Custom Acceleration Module | Strength = 2, Direction = (0, 1, 0), Enabled = ON |

These are suggested settings to make motion visible; the generator does not apply them to existing Systems. If particles are invisible, also check the rendering setup in the [Quick start](./quickstart.md).

The generated operation adds `Direction × Strength × elapsed seconds` to velocity in the Simulation Space coordinate system. Defaults increase upward velocity by 2 each second. Direction is not normalized, so its length also scales acceleration. Negative Strength reverses direction. Disabling the module stops acceleration but does not reset existing velocity.

## 3. Change the HLSL {#edit-hlsl}

With the default names, open `Assets/CustomAcceleration/Editor/CustomAcceleration.hlsl`. The `float3 acceleration = ...` expression calculates acceleration; the following line applies it to velocity.

```hlsl
ctx.valueParticleVelocity += acceleration * ctx.valueStepDeltaTime;
```

For your first change, replace `+=` with `-=` and save.

```hlsl
ctx.valueParticleVelocity -= acceleration * ctx.valueStepDeltaTime;
```

Return to Unity, **deselect and reselect the target to recreate the preview, then press Play**. Verify downward acceleration with the same settings. For Play Mode, exit and enter Play Mode again.

::: tip Applying HLSL changes
Preview Restart resets state; it does not guarantee a source rebuild. Automatic HLSL hot reload is not supported.
:::

Start by changing only the function body's calculations. Changing generated Context type names, Parameter field names, or the entryPoint requires matching changes in the Definition or Contract.

## What the generated files do {#files}

Use this section when you start extending the module. `N` is Module Name and `R` is `Namespace.N`. The minimal output contains seven files, excluding .meta files.

| File | Role |
| --- | --- |
| `Scripts/NModule.cs` | Settings saved through the Inspector, including Strength and Direction |
| `Scripts/R.Scripts.asmdef` | Settings assembly; not a U# assembly |
| `Editor/NContract.cs` | IDs, parameters, Live change policies, and input validation |
| `Editor/NDefinition.cs` | Connects settings to GPU operations; automatically discovered by the Editor |
| `Editor/NLiveInspectorProvider.cs` | Connects Play Mode Inspector edits to Runtime |
| `Editor/N.hlsl` | GPU calculation to edit first |
| `Editor/R.Editor.asmdef` | Editor-only assembly and references |

IDs, HLSL function names, GUIDs, and assembly references are generated automatically. The Definition references HLSL by GUID, so preserve its .meta file. Output is ordinary editable source. Running the generator again does not update existing output, and there is no automatic regeneration.

## Add Udon control when needed {#runtime-api}

Enabling **Generate Runtime API** at creation adds four files under `Udon`: a Parameter enum, a Handle with accessor extension methods, an asmdef, and a U# Assembly Definition. Editor references are configured too. With the option OFF, normal Preview, Play, and supported Live Inspector editing remain available.

With the default names, the generated namespace is `MyCompany.FluxFX.CustomAcceleration.Udon` and the accessor is `system.Modules.CustomAcceleration()`. Use a FluxParticleSystem for `system`. The accessor returns null if the module was not built into that System.

The Handle provides `GetStrength` / `SetStrength`, `GetDirection` / `SetDirection`, and `GetEnabled` / `SetEnabled`. Changes affect Runtime only, not saved Authoring values. Callers in a custom asmdef need a reference to the generated `R.Udon` assembly. To retain a Handle in a field, store it as object and cast when used, as in the [Runtime API examples](./runtime-parameters.md).

## Naming and placement constraints {#constraints}

- Module Name must be an ASCII C# identifier using letters, digits, and underscores, up to 64 characters. Namespace consists of dot-separated identifiers, up to 128 characters. Leading digits, keywords, Windows device names, and existing Runtime API method names are rejected.
- Parent Folder must exist under Assets. Output cannot be under Editor, Editor Default Resources, or StreamingAssets, or through symbolic links or junctions. Generated paths must be shorter than 240 characters.
- Existing folders, files, orphaned .meta files, and detectable assembly, type, and ID collisions are rejected before generation. Changing only letter case does not produce a different Module ID.
- Renaming a saved Module's class, namespace, or assembly affects SerializeReference compatibility and requires migration. Preserve consistency between asmdefs, U# references, and .meta files.

Generated operations follow existing velocity writers. When adding further custom writers, review [dependencies and execution order](./custom-module-reference.md). Custom localization and synchronization are not included in the template.

## Next steps {#next}

To add settings, continue to [Custom modules](./custom-modules.md). To understand the underlying system, read [Architecture](./architecture.md) and [Data and execution model](./data-and-execution.md). The generated template uses constant acceleration; the manual Custom Lift example uses acceleration whose strength varies with time.
