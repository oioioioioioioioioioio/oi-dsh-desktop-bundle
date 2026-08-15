import type {
  HostDescription,
  HostFrame,
  IApiClient,
  MuxFrame,
  RpcRequest,
} from './api.js'

export interface ConnectionConfig {
  readonly backoffBaseMs?: number
  readonly backoffFactor?: number
  readonly backoffMaxMs?: number
  readonly streamOpenTimeoutMs?: number
}

export type ConnectionState = 'connected' | 'reconnecting'

export interface ConnectionSinks {
  readonly onMuxEnvelope?: (envelope: RpcRequest<MuxFrame>) => void
  readonly onHostEnvelope?: (envelope: RpcRequest<HostFrame>) => void
  readonly onConnected?: (description: HostDescription) => void
  readonly onStateChange?: (state: ConnectionState) => void
}

const DEFAULTS: Required<ConnectionConfig> = {
  backoffBaseMs: 500,
  backoffFactor: 2,
  backoffMaxMs: 10_000,
  streamOpenTimeoutMs: 3_000,
}

export class ConnectionController {
  private generation = 0
  private attempt = 0
  private current: AbortController | undefined
  private running = false
  private lastState: ConnectionState | undefined
  private readonly config: Required<ConnectionConfig>

  constructor(
    private readonly api: IApiClient,
    private readonly sinks: ConnectionSinks,
    config: ConnectionConfig = {},
  ) {
    this.config = { ...DEFAULTS, ...config }
  }

  start(): void {
    if (this.running) return
    this.running = true
    void this.loop()
  }

  stop(): void {
    this.running = false
    this.current?.abort()
    this.current = undefined
  }

  private async loop(): Promise<void> {
    while (this.running) {
      const generation = ++this.generation
      const abort = new AbortController()
      this.current = abort
      let muxOpened = (): void => {}
      let hostOpened = (): void => {}
      const streamsOpen = Promise.all([
        new Promise<void>(resolve => { muxOpened = resolve }),
        new Promise<void>(resolve => { hostOpened = resolve }),
      ])
      const failed = new Promise<void>(resolve => {
        const settle = (): void => {
          if (generation === this.generation && !abort.signal.aborted) abort.abort()
          resolve()
        }
        void this.pump(this.api.events.mux({}, abort.signal, muxOpened), this.sinks.onMuxEnvelope, settle)
        void this.pump(this.api.events.host({}, abort.signal, hostOpened), this.sinks.onHostEnvelope, settle)
      })
      try {
        const timeout = new AbortController()
        const [description] = await Promise.all([
          this.api.host.describe({}),
          Promise.race([streamsOpen, sleep(this.config.streamOpenTimeoutMs, timeout.signal)]),
        ])
        timeout.abort()
        const descriptionResult = description.result
        if (!descriptionResult.ok) {
          throw new Error(`host.describe failed: ${descriptionResult.error.message}`)
        }
        if (abort.signal.aborted) throw new Error('connection generation ended during handshake')
        this.attempt = 0
        this.emitState('connected')
        if (this.running && !abort.signal.aborted) {
          this.callSink(() => { this.sinks.onConnected?.(descriptionResult.value) })
        }
      } catch {
        abort.abort()
      }
      await failed
      if (!this.running) return
      this.emitState('reconnecting')
      this.attempt += 1
      await sleep(this.backoffDelay(), new AbortController().signal)
    }
  }

  private async pump<F extends { type: string }>(
    stream: AsyncIterable<RpcRequest<F>>,
    sink: ((envelope: RpcRequest<F>) => void) | undefined,
    onEnd: () => void,
  ): Promise<void> {
    try {
      for await (const envelope of stream) {
        if (envelope.payload.type === 'stream/error') break
        if (sink !== undefined) this.callSink(() => { sink(envelope) })
      }
    } catch {
      // Stream loss converges on the reconnect path.
    }
    onEnd()
  }

  private backoffDelay(): number {
    const cap = Math.min(
      this.config.backoffMaxMs,
      this.config.backoffBaseMs * this.config.backoffFactor ** Math.max(0, this.attempt - 1),
    )
    return cap / 2 + Math.random() * cap / 2
  }

  private emitState(state: ConnectionState): void {
    if (this.lastState === state) return
    this.lastState = state
    this.callSink(() => { this.sinks.onStateChange?.(state) })
  }

  private callSink(callback: () => void): void {
    try {
      callback()
    } catch (error) {
      console.error('[oi-dsh-desktop] connection sink failed', error)
    }
  }
}

function sleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(done, milliseconds)
    signal.addEventListener('abort', done, { once: true })
    function done(): void {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
  })
}
