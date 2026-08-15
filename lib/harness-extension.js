import { accessSync, constants } from "node:fs";
import { fileURLToPath } from "node:url";

//#region src/harness-extension.ts
/** Official Harness revision against which the source extension was produced. */
const HARNESS_PATCH_BASE_COMMIT = "47f943859bef60e4160492346772ded9b24f765a";
/** Bundle revision written into generated desktop artifacts. */
const HARNESS_EXTENSION_VERSION = "0.2.0";
/** Resolve the complete source patch shipped with this package. */
function harnessPatchPath() {
	const path = fileURLToPath(new URL("../harness.patch", import.meta.url));
	accessSync(path, constants.R_OK);
	return path;
}

//#endregion
export { HARNESS_EXTENSION_VERSION, HARNESS_PATCH_BASE_COMMIT, harnessPatchPath };