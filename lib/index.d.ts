import { i as DesktopConnectionService } from "./connection-Dh7e353L.js";
import { t as DesktopClientModuleRegistry } from "./modules-6SHFDRkN.js";
import { Context } from "@deepseek-ai/cordis";

//#region src/native-host.d.ts
declare const DESKTOP_NATIVE_HOST_KEY = "oiDshDesktopNativeHost";
interface DesktopNativeHost {
  pickDirectory(signal: AbortSignal): Promise<string | null>;
}
declare module '@deepseek-ai/cordis' {
  interface Context {
    oiDshDesktopNativeHost: DesktopNativeHost;
  }
}
declare function provideDesktopNativeHost(ctx: Context, host: DesktopNativeHost): void;
//#endregion
//#region src/shared.d.ts
interface DesktopRequest {
  readonly path: string;
  readonly method: string;
  readonly headers: Array<[string, string]>;
  readonly body?: string;
}
interface DesktopResponse {
  readonly status: number;
  readonly headers: Array<[string, string]>;
  readonly body: string;
}
type DesktopStreamMessage = {
  readonly id: string;
  readonly type: 'open';
} | {
  readonly id: string;
  readonly type: 'frame';
  readonly frame: unknown;
} | {
  readonly id: string;
  readonly type: 'end';
} | {
  readonly id: string;
  readonly type: 'error';
  readonly message: string;
};
interface DesktopWindowState {
  readonly maximized: boolean;
  readonly fullScreen: boolean;
}
interface DesktopWindowControls {
  getState(): Promise<DesktopWindowState>;
  minimize(): void;
  toggleMaximize(): void;
  close(): void;
  showSystemMenu(x: number, y: number): void;
  onStateChange(listener: (state: DesktopWindowState) => void): () => void;
}
interface DesktopBridge {
  readonly windowControls: DesktopWindowControls;
  request(id: string, request: DesktopRequest): Promise<DesktopResponse>;
  cancelRequest(id: string): void;
  openStream(id: string, kind: 'mux' | 'host'): Promise<void>;
  closeStream(id: string): void;
  onStreamMessage(listener: (message: DesktopStreamMessage) => void): () => void;
  exportSession(sessionId: string): Promise<{
    canceled: boolean;
  }>;
}
//#endregion
export { DESKTOP_NATIVE_HOST_KEY, type DesktopBridge, DesktopClientModuleRegistry, DesktopConnectionService, type DesktopNativeHost, type DesktopRequest, type DesktopResponse, type DesktopStreamMessage, type DesktopWindowState, provideDesktopNativeHost };