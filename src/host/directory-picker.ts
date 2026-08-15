import type { Context } from '@deepseek-ai/cordis'
import {
  DirectoryPicker,
  type DirectoryPickerCapability,
} from '@deepseek-ai/dsh-host-directory-picker'
import {
  DESKTOP_NATIVE_HOST_KEY,
  type DesktopNativeHost,
} from '../native-host.js'

class DesktopDirectoryPicker extends DirectoryPicker {
  private readonly nativeCapability: DirectoryPickerCapability

  constructor(ctx: Context) {
    super(ctx)
    const nativeHost = ctx.get(DESKTOP_NATIVE_HOST_KEY) as DesktopNativeHost | undefined
    if (nativeHost === undefined) {
      throw new Error('desktop directory picker: Electron native host is unavailable')
    }
    this.nativeCapability = {
      kind: 'native',
      pick: signal => nativeHost.pickDirectory(signal),
    }
  }

  capability(): DirectoryPickerCapability {
    return this.nativeCapability
  }
}

export const inject = [DESKTOP_NATIVE_HOST_KEY]

export function apply(ctx: Context): void {
  new DesktopDirectoryPicker(ctx)
}

export default apply
