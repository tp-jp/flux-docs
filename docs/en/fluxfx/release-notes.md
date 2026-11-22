# Release notes {#release-notes}

## 0.6.0: Revamped generated asset cleanup, enabled by default at startup {#v0-6-0}

This entry covers generated asset cleanup changes in the package recorded as version 0.6.0 in `package.json`. Publication status has not been confirmed.

Cleanup of unused FluxFX-managed shaders, frozen HLSL, Materials, and other assets has been revamped. Manual cleanup lets you review candidates and retention reasons; automatic cleanup runs when needed at project startup. Assets in use and their dependencies are kept.

### Main changes {#cleanup-changes}

- Automatic cleanup is now ON when no setting has been saved. Existing OFF settings are preserved.
- Periodic cleanup while editing and the 60-second delay after generation ends have been removed. Cleanup is checked once per launch after initial import, compilation, and session recovery. It runs when a request is pending or a retention deadline is due, and at least 24 hours have elapsed since the previous automatic full scan.
- Automatic cleanup now shows progress and supports cancellation. Cancellation or failure after a full scan starts still preserves the 24-hour restriction and pending requests.
- Manual cleanup now presents candidates, sizes, retention reasons, and referring assets or objects for review before deletion. References are checked again, and deletion is limited to reviewed candidates.
- Ownership ledgers have moved to ProjectSettings, separate from the execution history in Library. Recreating Library preserves ownership information.
- Automatic cleanup skips detailed reference source identification for display while retaining reference protection checks.
- Extension APIs support analysis, cleanup of reviewed candidates, and detailed results.

See [Generated asset management](./generated-assets.md) for operations, retention periods, storage locations, and APIs. [Automatic cleanup at startup](./generated-assets.md#automatic-cleanup) explains when cleanup is skipped and deferred to the next launch.

### Verification scope {#verification}

The following results were reported during implementation. The previous Temp validation logs are no longer available, and these are not results from rerunning tests for this documentation update.

- C# compilation and all 65 related Editor tests passed. A final set of 18 tests also passed; those were repeat checks, not 83 independent cases in total.
- A minimal validation project used the actual product startup and scheduling sources to verify behavior at a real launch, prevention of another run after reload, and that restarting within 24 hours does not trigger another automatic cleanup run.
- Restarting the main project Editor, and testing Play rendering, Udon compilation, and VRChat after this change, have not been performed.
