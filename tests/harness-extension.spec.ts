import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  HARNESS_EXTENSION_VERSION,
  HARNESS_PATCH_BASE_COMMIT,
  harnessPatchPath,
} from '../src/harness-extension.js'

describe('Harness source extension', () => {
  it('ships the complete desktop and workbench patch from the documented baseline', async () => {
    const patch = await readFile(harnessPatchPath(), 'utf8')

    expect(HARNESS_PATCH_BASE_COMMIT).toMatch(/^[0-9a-f]{40}$/u)
    expect(HARNESS_EXTENSION_VERSION).toBe('0.2.0')
    expect(patch).toContain('diff --git a/apps/electron/src/main.ts b/apps/electron/src/main.ts')
    expect(patch).toContain('diff --git a/packages/client/ui-conversation/src/client/skeleton/FileWorkbench.tsx')
    expect(patch).toContain('diff --git a/packages/client/ui-conversation/src/client/skeleton/ProjectExplorer.tsx')
    expect(patch).toContain('diff --git a/packages/host/apiproxy/src/api/workspace.ts')
    expect(patch).toContain('diff --git a/scripts/build-electron-runtime.ts')
    expect(patch).toContain("'--config.node-linker=hoisted'")
  })
})
