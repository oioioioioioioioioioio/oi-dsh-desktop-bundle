import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createPackageResolvers } from '../src/host/modules.js'

describe('desktop client module resolution', () => {
  it('resolves the Web profile dependency closure outside the managed profile', async () => {
    const profile = await mkdtemp(join(tmpdir(), 'oi-dsh-profile-'))
    const manifest = join(profile, 'package.json')
    await writeFile(manifest, '{"private":true}\n', 'utf8')

    const resolvers = createPackageResolvers(pathToFileURL(manifest).href)
    const packagePath = firstResolution(
      resolvers,
      '@deepseek-ai/dsh-client-ui-conversation/package.json',
    )

    expect(packagePath).toContain('dsh-client-ui-conversation')
  })
})

function firstResolution(resolvers: NodeJS.Require[], specifier: string): string {
  for (const resolver of resolvers) {
    try {
      return resolver.resolve(specifier)
    } catch {
      // Continue through the explicit installation anchors.
    }
  }
  throw new Error(`could not resolve ${specifier}`)
}
