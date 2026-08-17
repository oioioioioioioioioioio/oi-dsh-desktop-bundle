import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  HARNESS_EXTENSION_VERSION,
  HARNESS_PATCH_BASE_COMMIT,
  harnessPatchPath,
  legacyHarnessPatchPaths,
} from '../src/harness-extension.js'

describe('Harness source extension', () => {
  it('ships the complete desktop and workbench patch from the documented baseline', async () => {
    const patch = await readFile(harnessPatchPath(), 'utf8')

    expect(HARNESS_PATCH_BASE_COMMIT).toMatch(/^[0-9a-f]{40}$/u)
    expect(HARNESS_EXTENSION_VERSION).toBe('0.3.1')
    expect(patch).toContain('diff --git a/apps/electron/src/main.ts b/apps/electron/src/main.ts')
    expect(patch).toContain('diff --git a/packages/client/ui-conversation/src/client/skeleton/FileWorkbench.tsx')
    expect(patch).toContain('diff --git a/packages/client/ui-conversation/src/client/skeleton/ProjectExplorer.tsx')
    expect(patch).toContain('diff --git a/packages/host/apiproxy/src/api/workspace.ts')
    expect(patch).toContain('diff --git a/scripts/build-electron-runtime.ts')
    expect(patch).toContain("'--config.node-linker=hoisted'")
    expect(patch).toContain('return koffi.decode.string16(address)')
    expect(patch).toContain("clipboardWrite: 'dsh:clipboard-write'")
    expect(patch).toContain('normalizeToolCallFlood')
    expect(patch).toContain('diff --git a/packages/client/ui-workspace/src/client/workspace-references.ts')
    expect(patch).toContain("formatReference(kind, candidate.name)")
    expect(patch).toContain("'@file:src/main.ts'")
    expect(patch).toContain("'@folder:\"docs/my guides\"'")
    expect(patch).toContain([
      '@@ -3041,6 +3406,9 @@ importers:',
      "       '@deepseek-ai/dsh-client-ui-conversation':",
      '         specifier: workspace:^',
      '         version: link:../ui-conversation',
      "+      '@deepseek-ai/dsh-client-ui-input-trigger':",
      '+        specifier: workspace:^',
      '+        version: link:../ui-input-trigger',
      "       '@deepseek-ai/dsh-client-ui-primitives':",
    ].join('\n'))
    expect(patch).not.toContain('@@ -1675,6 +1998,9 @@ importers:')
    expect(legacyHarnessPatchPaths()).toHaveLength(4)
  })
})
