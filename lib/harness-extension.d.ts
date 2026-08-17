//#region src/harness-extension.d.ts
/** Official Harness revision against which the source extension was produced. */
declare const HARNESS_PATCH_BASE_COMMIT = "47f943859bef60e4160492346772ded9b24f765a";
/** Bundle revision written into generated desktop artifacts. */
declare const HARNESS_EXTENSION_VERSION = "0.3.2";
/** Resolve the complete source patch shipped with this package. */
declare function harnessPatchPath(): string;
/** Resolve complete patches for extension revisions supported by in-place upgrades. */
declare function legacyHarnessPatchPaths(): readonly string[];
//#endregion
export { HARNESS_EXTENSION_VERSION, HARNESS_PATCH_BASE_COMMIT, harnessPatchPath, legacyHarnessPatchPaths };