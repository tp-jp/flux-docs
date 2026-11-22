# Generated asset management {#generated-assets}

FluxFX records ownership and dependencies for generated shaders, frozen HLSL, Materials, and other assets, then cleans up those that are no longer used. Assets in use and their dependencies are kept.

Normally, you can rely on automatic cleanup at startup. Use manual analysis and cleanup to review candidates and retention reasons, or to clean a custom generation root.

## Generation roots and managed assets {#scope}

The default root is `Assets/FluxFX/Generated`. Only files registered by the generation process are eligible for cleanup.

| Path relative to the generation root | Contents |
| --- | --- |
| `Cache/Shaders` | Generated shaders and frozen HLSL copies that preserve their contents at generation time |
| `Cache/Lookups` | Lookup textures for curves, gradients, and similar data |
| `Cache/Meshes` | Shared generated meshes |
| `Sessions/<session ID>/Materials` | Materials for each generation session |

Automatic cleanup targets only the default root. For a custom root, specify it in **Generation Root** during manual cleanup. Files merely placed in the folder, and original C# or HLSL files written by custom module authors, are not cleanup targets unless registered as generated assets.

## Analyze and clean up manually {#manual-cleanup}

1. After Play, builds, and generation finish, open **Tools → FluxFX → Clean Unused Generated Assets**. Opening the window alone does not start a scan.
2. Check **Generation Root**. For a custom location, specify the root under `Assets` registered by the generation session.
3. Click **Analyze Generated Assets**. This does not delete assets.
4. Review the candidate count and size, retention reasons, and referring assets or objects. Candidate sizes include `.meta` files.
5. Click **Delete Reviewed Unused Assets**.
6. Review the deleted, kept, and failed results. The window also displays the diagnostic JSON path.

References and GUIDs are checked again before deletion. Files that became candidates after analysis are not deleted: only reviewed candidates are considered. Analyze again if you change the generation root.

The window follows the FluxFX Inspector's [language setting](./inspector-preview.md#use-the-settings-panel). The analysis and deletion buttons are disabled during compilation, import, Play, builds, and other active generation work.

**Manual cleanup does not apply the automatic cleanup interval or its 24-hour retention periods.** Recently used cache assets and failed generation output can be candidates if unused. [Reference and ownership protection](#protection) still applies.

## Automatic cleanup at startup {#automatic-cleanup}

Automatic cleanup is **ON when no setting has been saved**. An existing OFF setting is preserved. Change it using **Automatic Cleanup** in the cleanup window, or **Tools → FluxFX → Automatic Generated Asset Cleanup**.

After initial import, compilation, and generation session recovery finish, FluxFX checks once per Editor launch at the first eligible opportunity. With automatic cleanup enabled, it runs when both conditions hold:

- A cleanup request is pending, or an asset retention deadline has been reached.
- At least 24 hours have elapsed since the previous automatic full scan started. If no scan timestamp is recorded, this restriction does not apply.

Migrating an older schedule preserves its recorded scan timestamp. Manual analysis and cleanup do not reset the start of the automatic cleanup interval.

That launch's check is consumed even if the conditions are not met. Recompilation, domain reloads, and toggling the setting do not trigger another check. Installing an update in an Editor already using FluxFX does not count as a new launch. Leaving the Editor open for 24 hours does not cause cleanup to run during the session.

If Play, a build, generation, or a Preview operation starts first, automatic cleanup is skipped for that launch. Pending requests carry over to the next launch. Startup cleanup does not run in batch mode.

Automatic cleanup displays progress and supports cancellation. Cancellation or failure after a full scan starts still preserves the 24-hour interval and pending requests. Cancelling before the scan starts does not reset the interval, but cleanup will not run again during that launch. Cancellation does not restore files already deleted.

Automatic cleanup skips detailed identification of referring assets and objects for display, while retaining reference protection checks. Reference checks and deletion run in the Editor and may introduce waiting time.

### Automatic retention periods {#retention}

| Target | Retention period |
| --- | --- |
| Shared cache | 24 hours after its last use |
| Failed or interrupted generation output | 24 hours after the session ends |

If both apply, both periods must expire. **Expiry makes an asset eligible for another reference check; it does not guarantee deletion.** Referenced assets remain protected.

## What is protected {#protection}

| Condition | Protection |
| --- | --- |
| A generation session is running | Cleanup for that root is skipped. Elapsed time alone does not end a session |
| A saved asset references the output | Output used by saved Scenes, Prefabs, and other assets is kept |
| An unsaved Scene, Prefab Stage, or live object references the output | Unsaved references are also protected |
| A retained asset has dependencies | Dependencies, including frozen HLSL, are followed and kept |
| No ownership record, or a GUID, type, or path mismatch | The file is not deleted as a managed asset |
| Frozen shader or HLSL contents differ from the record | The modified file is kept |
| Dependencies contain a cycle | Assets in the cycle and their dependencies are kept |

Deletion proceeds from referring assets to their dependencies. For example, a Material → shader → frozen HLSL dependency is deleted in that order. If a referring asset cannot be deleted, its dependencies are kept. Unreadable management records also prevent deletion and produce diagnostics.

## Records and reports {#records}

| Path | Contents |
| --- | --- |
| `ProjectSettings/FluxFXGeneration/Roots` | Ownership ledgers for each root, including asset identities and dependencies |
| `ProjectSettings/FluxFXGeneration/CleanupSchedule.json` | Pending requests, scan timestamps, and the next retention deadline check |
| `Library/FluxFX/GenerationSessions` | Generation session execution history |
| `Temp/FluxFX/GenerationCleanup` | Analysis and cleanup reports in JSON |

Ownership is separate from the execution history in Library, so recreating Library preserves the ledgers. Analysis may migrate older management records into the ledger. Temp reports are not a permanent history; save reports needed for investigation elsewhere.

## Extension API {#api}

Editor code uses `FluxParticleGenerationCleanup` in the `TpLab.Flux.FX.Editor.Build` namespace. This is not a Runtime or UdonSharp API.

| API | Purpose |
| --- | --- |
| `Analyze(root)` | Return a `FluxParticleGenerationCleanupReport` with candidates, retention reasons, and referring assets or objects, without deleting assets |
| `CollectReviewed(report)` | Call after the user reviews an `Analyze` result. Recheck references and GUIDs, and clean up only candidates in that result |
| `CollectWithReport(root)` | Analyze the current state, clean up, and return a detailed report. This is not restricted to previously reviewed candidates |
| `Collect(root)` | Clean up and return the number of deleted assets. Throw on failures such as processing invalid management records |
| `Request()` | Request another check at the next launch. Do not start an automatic scan in the current Editor session |
| `AutomaticCleanupEnabled` | Get or save the enabled state. Changing it alone does not trigger another check |

Omitting `root` uses `FluxParticleGenerationSession.DefaultRoot`. For a custom root, use the one registered by the generation session's `Begin` call. Automatic cleanup requested through `Request()` targets the default root.

Although `Analyze` does not delete assets, it migrates old records when needed and records a scan timestamp if a full scan starts. It also saves diagnostic JSON. `CollectWithReport` and `Collect` delete assets without opening a confirmation window. To implement a review UI, display an `Analyze` result and pass it to `CollectReviewed` after confirmation.

`Analyze` and the `Collect` methods do not apply automatic cleanup's 24-hour restrictions. Active session, reference, and ownership protection still applies. Generation, HLSL freezing, and ending sessions remain the producer's responsibility; cleanup APIs do not perform these tasks.

### Inspecting results {#report}

`FluxParticleGenerationCleanupReport` exposes `CandidateCount`, `CandidateBytes`, and `DeletedCount`. Each entry in `items` includes its path, GUID, kind, status, reason, and reference source. Status values are `Candidate`, `Keep`, `Missing`, `Deleted`, and `Failed`.

`blocked` indicates a skipped or interrupted operation, `cancelled` indicates cancellation, and `failed` indicates analysis or management record processing failure. **Do not use `failed` alone to detect individual deletion failures.** Also check for `status == "Failed"` in `items`, and inspect `diagnostics` and `logPath`. `fullScan` indicates whether the full reference scan started.

A return value of 0 from `Collect` does not distinguish between no candidates, a skipped operation, and individual deletion failures. Use `CollectWithReport` in extensions that need to distinguish these outcomes.

See [Architecture](./architecture.md) for the generation workflow and [Validation and performance](./validation-and-performance.md) for investigating generated output.
