import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../src/host/directory-picker.js'
import { provideDesktopNativeHost } from '../src/native-host.js'

describe('desktop directory picker adapter', () => {
  let ctx: Context | undefined

  afterEach(async () => {
    await ctx?.fiber.dispose()
    ctx = undefined
  })

  it('forwards Harness native picks to the Electron shell capability', async () => {
    ctx = new Context()
    const pickDirectory = vi.fn(async () => 'F:\\workspace')
    provideDesktopNativeHost(ctx, { pickDirectory })
    apply(ctx)
    const signal = new AbortController().signal

    const capability = ctx.directoryPicker.capability()

    expect(capability.kind).toBe('native')
    if (capability.kind !== 'native') throw new Error('expected native capability')
    await expect(capability.pick(signal)).resolves.toBe('F:\\workspace')
    expect(pickDirectory).toHaveBeenCalledWith(signal)
  })
})
