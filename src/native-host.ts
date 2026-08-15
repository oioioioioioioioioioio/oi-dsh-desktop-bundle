import type { Context } from '@deepseek-ai/cordis'

export const DESKTOP_NATIVE_HOST_KEY = 'oiDshDesktopNativeHost'

export interface DesktopNativeHost {
  pickDirectory(signal: AbortSignal): Promise<string | null>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    oiDshDesktopNativeHost: DesktopNativeHost
  }
}

export function provideDesktopNativeHost(ctx: Context, host: DesktopNativeHost): void {
  ctx.provide(DESKTOP_NATIVE_HOST_KEY, host)
}
