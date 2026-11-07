# Migrating to consolidated Authoring settings {#authoring-migration}

All editable settings now belong to `FluxParticleAuthoring`, including Particle Count and Play On Awake. `FluxParticleSystem` remains the Runtime entry point referenced by external Udon. For Prefabs and Scenes created with the previous structure, migrate settings stored on the legacy System into Authoring.

## Migration steps {#steps}

1. Stop Play Mode and save any Prefab edits in progress.
2. Run **Tools → FluxFX → Migration → Migrate Prefabs and Open Scenes**.
3. Check Particle Count, Play On Awake, and other settings in the root's Authoring Inspector.
4. Save Scenes marked as modified.

Unsaved Prefab edits or read-only Prefabs can stop migration with an error. Check the path in the Console, save pending edits or make the asset editable, then run migration again.

## Scope and saving {#scope}

| Target | Migration and saving |
| --- | --- |
| Applicable Prefabs under `Assets` | Migrate and save changed Prefabs |
| Currently open Scenes | Migrate applicable objects; Scenes are not saved automatically |
| Closed Scenes | Not included in the batch operation; open the required Scenes, rerun migration, and save |

Source Prefabs are processed first, preserving per-field inheritance and overrides across Prefabs, Variants, and nested Prefabs. Check both inherited and overridden settings after migration.

Normal settings editing is unavailable while the Authoring Inspector requests migration. Use **Migrate Settings** to migrate that target and its source Prefabs, or use the menu above for batch migration. Save changed Scenes yourself in either case.

## Play/build fallback {#fallback}

For unmigrated data, Play/build preparation can read Particle Count and Play On Awake from the legacy System. This resolves values for baking; it does not permanently migrate the source Prefabs or Scenes. Successful playback is not a substitute for running migration and saving.

## After migration {#after-migration}

- Edit settings, curves, gradients, and standard/custom Modules on Authoring.
- Use standard **Copy Component / Paste Component Values** on [Authoring](./inspector-preview.md#copy-settings) to copy complete settings.
- Use the [Authoring Inspector](./inspector-preview.md#baking-and-live-editing) for Preview and supported Live fields in Play Mode.
- External Udon continues to reference [FluxParticleSystem](./runtime-parameters.md). System uses the standard UdonSharp Inspector, with settings SerializeFields hidden.

## Changes and release status {#release-status}

Authoring consolidation changes where editable settings are stored and requires migration. This change was released in 0.1.0. Follow the steps above when using data created before 0.1.0.
