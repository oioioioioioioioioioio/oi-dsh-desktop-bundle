export { DesktopConnectionService } from './host/connection.js'
export { DesktopClientModuleRegistry } from './host/modules.js'
export {
  DESKTOP_NATIVE_HOST_KEY,
  provideDesktopNativeHost,
  type DesktopNativeHost,
} from './native-host.js'
export type {
  DesktopBridge,
  DesktopRequest,
  DesktopResponse,
  DesktopStreamMessage,
  DesktopWindowState,
} from './shared.js'
