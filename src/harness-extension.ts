import { accessSync, constants } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Official Harness revision against which the source extension was produced. */
export const HARNESS_PATCH_BASE_COMMIT = '47f943859bef60e4160492346772ded9b24f765a'

/** Bundle revision written into generated desktop artifacts. */
export const HARNESS_EXTENSION_VERSION = '0.3.1'

/** Resolve the complete source patch shipped with this package. */
export function harnessPatchPath(): string {
  const path = fileURLToPath(new URL('../harness.patch', import.meta.url))
  accessSync(path, constants.R_OK)
  return path
}

/** Resolve complete patches for extension revisions supported by in-place upgrades. */
export function legacyHarnessPatchPaths(): readonly string[] {
  const paths = [
    fileURLToPath(new URL('../legacy/harness-v0.3.0.patch', import.meta.url)),
    fileURLToPath(new URL('../legacy/harness-v0.2.2.patch', import.meta.url)),
    fileURLToPath(new URL('../legacy/harness-v0.2.1.patch', import.meta.url)),
    fileURLToPath(new URL('../legacy/harness-v0.2.0.patch', import.meta.url)),
  ]
  for (const path of paths) accessSync(path, constants.R_OK)
  return paths
}
