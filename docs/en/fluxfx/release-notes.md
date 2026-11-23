# Release notes {#release-notes}

## 0.7.0: Add System Follow and Preview Follow Controls {#v0-7-0}

The [GitHub Release and distribution files](https://github.com/tp-jp/FluxFX/releases/tag/0.7.0) were confirmed public on November 23, 2026.

**System Follow** moves the System GameObject with the local player's position, tracked head, or a specified Transform. It is configured in Authoring's Main section, not as a Module. It defaults to OFF, preserving the placement and behavior of existing data.

- Configure a position offset in world axes or relative to the target's orientation, and choose how to follow rotation. Configure these before Play Mode; no Udon Runtime API for changing follow settings was added.
- When System Follow is enabled, Preview controls explicitly select placement, Scene camera, or a specified Transform. Fixed at Placement is the default. An unassigned preview Transform does not fall back to the Scene camera or runtime reference.
- Freeze or release the preview follow position and orientation independently of particle Pause. Keep particles playing while observing the effect from outside.
- Preview controls do not modify saved data. Preview rebuilds after module edits preserve the target and frozen state; recreating the Inspector restores defaults.

See [Main](./main.md#system-follow) for settings and a snow example, and [Preview Follow controls](./inspector-preview.md#preview-follow) for operations. When leaving particles in World space, also adjust [Culling Bounds](./renderer.md#set-rendering-bounds), which moves with System.

### Verification scope {#verification-0-7-0}

These results come from implementation-time records, not from rerunning Unity tests for this documentation update.

| Area | Result |
| --- | --- |
| C# compilation | Passed during System Follow implementation and after the Preview extension |
| Player/Editor Udon compilation | Both passed during System Follow implementation; not rerun after the Preview extension |
| Related EditMode tests | All 63 passed after the Preview extension; this was not a full regression run |
| Preview image comparison | Maximum RGBA difference 0 in all four World/Local × MSAA 1/4 cases, including Trails and Distance Fade |
| Preview controls | Verified frozen pose with GPU simulation continuing, resumed following on release, target/frozen state retention across rebuilds, and English/Japanese UI |
| Saved data | Verified matching Authoring, Runtime, Transform, and rebaked results, with the Scene dirty state preserved |
| Play/ClientSim | Verified all four target modes, World/Local, initially inactive objects, re-enabling, rotation, offsets, and related cases during System Follow implementation; not rerun after the Preview extension |
| VRChat and VR headsets | Not tested |

Records are in `Temp/SystemFollow/verification.txt` and `Temp/PreviewFollow/verification.txt`. The former describes the older preview behavior; the latter defines the current controls. Records under Temp may be lost.

## 0.6.1: Move generation metadata to UserSettings {#v0-6-1}

This is a patch update. The [GitHub Release and distribution files](https://github.com/tp-jp/FluxFX/releases/tag/0.6.1) were confirmed public on November 23, 2026.

Generation metadata has moved to UserSettings. Existing ledgers, cleanup requests, and scan intervals are carried over automatically, separating metadata for each environment's generated state from shared project settings.

- Ownership ledgers, cleanup requests, and scan timestamps have moved from `ProjectSettings/FluxFXGeneration` to `UserSettings/FluxFXGeneration`.
- Migration is checked when the Editor loads and before metadata reads and writes. It runs even with automatic cleanup OFF and removes old files only after verifying identical contents at the destination.
- Partial migrations can resume when files already copied match their sources byte for byte. Conflicts, corruption, and read/write errors stop migration without overwriting data; unknown files and nonempty folders are kept.
- Generated asset locations, execution history in Library, public APIs, and normal procedures are unchanged. Automatic cleanup remains ON by default, runs only at startup and at most once per 24 hours, and preserves existing ON/OFF settings and reference protection.

See [Storage migration](./generated-assets.md#metadata-migration) and [Git considerations](./generated-assets.md#git) for details.

### Verification scope {#verification-0-6-1}

The implementation verification record reports passing C# compilation, 17 migration tests, and 65 existing generation, cleanup, and reference protection tests. Migration of actual data in the FluxFX development project and removal of the old storage were also verified. Udon compilation, Play Mode, and VRChat testing were not performed for this change.

The record is stored at `Temp/GenerationMetadataMigration/verification.txt` and may be lost because it is under Temp. These are implementation-time results, not results from rerunning tests for this documentation update.

## 0.6.0: Revamped generated asset cleanup, enabled by default at startup {#v0-6-0}

This entry covers generated asset cleanup changes. The [GitHub Release and distribution files](https://github.com/tp-jp/FluxFX/releases/tag/0.6.0) were confirmed public on November 23, 2026.

Cleanup of unused FluxFX-managed shaders, frozen HLSL, Materials, and other assets has been revamped. Manual cleanup lets you review candidates and retention reasons; automatic cleanup runs when needed at project startup. Assets in use and their dependencies are kept.

### Main changes {#cleanup-changes}

- Automatic cleanup is now ON when no setting has been saved. Existing OFF settings are preserved.
- Periodic cleanup while editing and the 60-second delay after generation ends have been removed. Cleanup is checked once per launch after initial import, compilation, and session recovery. It runs when a request is pending or a retention deadline is due, and at least 24 hours have elapsed since the previous automatic full scan.
- Automatic cleanup now shows progress and supports cancellation. Cancellation or failure after a full scan starts still preserves the 24-hour restriction and pending requests.
- Manual cleanup now presents candidates, sizes, retention reasons, and referring assets or objects for review before deletion. References are checked again, and deletion is limited to reviewed candidates.
- In this version, ownership ledgers moved to ProjectSettings, separate from the execution history in Library. Recreating Library preserves ownership information. The location changed to UserSettings in [0.6.1](#v0-6-1).
- Automatic cleanup skips detailed reference source identification for display while retaining reference protection checks.
- Extension APIs support analysis, cleanup of reviewed candidates, and detailed results.

See [Generated asset management](./generated-assets.md) for operations, retention periods, storage locations, and APIs. [Automatic cleanup at startup](./generated-assets.md#automatic-cleanup) explains when cleanup is skipped and deferred to the next launch.

### Verification scope {#verification}

The following results were reported during implementation. The previous Temp validation logs are no longer available, and these are not results from rerunning tests for this documentation update.

- C# compilation and all 65 related Editor tests passed. A final set of 18 tests also passed; those were repeat checks, not 83 independent cases in total.
- A minimal validation project used the actual product startup and scheduling sources to verify behavior at a real launch, prevention of another run after reload, and that restarting within 24 hours does not trigger another automatic cleanup run.
- Restarting the main project Editor, and testing Play rendering, Udon compilation, and VRChat after this change, have not been performed.
