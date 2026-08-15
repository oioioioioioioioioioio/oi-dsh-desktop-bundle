export interface DesktopRequest {
  readonly path: string
  readonly method: string
  readonly headers: Array<[string, string]>
  readonly body?: string
}

export interface DesktopResponse {
  readonly status: number
  readonly headers: Array<[string, string]>
  readonly body: string
}

export type DesktopStreamMessage =
  | { readonly id: string; readonly type: 'open' }
  | { readonly id: string; readonly type: 'frame'; readonly frame: unknown }
  | { readonly id: string; readonly type: 'end' }
  | { readonly id: string; readonly type: 'error'; readonly message: string }

export interface DesktopWindowState {
  readonly maximized: boolean
  readonly fullScreen: boolean
}

export interface DesktopWindowControls {
  getState(): Promise<DesktopWindowState>
  minimize(): void
  toggleMaximize(): void
  close(): void
  showSystemMenu(x: number, y: number): void
  onStateChange(listener: (state: DesktopWindowState) => void): () => void
}

export interface DesktopBridge {
  readonly windowControls: DesktopWindowControls
  request(id: string, request: DesktopRequest): Promise<DesktopResponse>
  cancelRequest(id: string): void
  openStream(id: string, kind: 'mux' | 'host'): Promise<void>
  closeStream(id: string): void
  onStreamMessage(listener: (message: DesktopStreamMessage) => void): () => void
  exportSession(sessionId: string): Promise<{ canceled: boolean }>
}
