import {
  AbstractApiClient,
  hostFrameSchema,
  muxFrameSchema,
  serverRequestSchema,
  type HostFrame,
  type MuxFrame,
  type RpcRequest,
  type ServerRequest,
} from './api.js'
import type { DesktopBridge } from '../shared.js'

type FrameParser<F> = { parse(value: unknown): F }
type StreamItem<F> =
  | { readonly type: 'frame'; readonly envelope: RpcRequest<F> }
  | { readonly type: 'end' }
  | { readonly type: 'error'; readonly error: Error }

export class ElectronApiClient extends AbstractApiClient {
  constructor(private readonly desktop: DesktopBridge) {
    super()
  }

  fetch(input: URL, init?: RequestInit): Promise<Response> {
    return this.doFetch(input, init)
  }

  protected async doFetch(input: URL, init?: RequestInit): Promise<Response> {
    const id = randomUuid()
    const signal = init?.signal ?? undefined
    signal?.throwIfAborted()
    const body = init?.body
    if (body !== undefined && typeof body !== 'string') {
      throw new TypeError('desktop connection accepts string request bodies only')
    }
    const onAbort = (): void => { this.desktop.cancelRequest(id) }
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      const response = await this.desktop.request(id, {
        path: `${input.pathname}${input.search}`,
        method: init?.method ?? 'GET',
        headers: [...new Headers(init?.headers).entries()],
        ...(body === undefined ? {} : { body }),
      })
      signal?.throwIfAborted()
      return new Response(response.body, { status: response.status, headers: response.headers })
    } finally {
      signal?.removeEventListener('abort', onAbort)
    }
  }

  protected override openMux(
    _payload: {},
    signal: AbortSignal,
    onOpen?: () => void,
  ): AsyncIterable<RpcRequest<MuxFrame>> {
    return this.readStream('mux', signal, muxFrameSchema, onOpen)
  }

  protected override openHost(
    _payload: {},
    signal: AbortSignal,
    onOpen?: () => void,
  ): AsyncIterable<RpcRequest<HostFrame>> {
    return this.readStream('host', signal, hostFrameSchema, onOpen)
  }

  private async *readStream<F extends MuxFrame | HostFrame>(
    kind: 'mux' | 'host',
    signal: AbortSignal,
    schema: FrameParser<F>,
    onOpen?: () => void,
  ): AsyncGenerator<RpcRequest<F>> {
    const id = randomUuid()
    const inbox: StreamItem<F>[] = []
    let wake: (() => void) | undefined
    const enqueue = (item: StreamItem<F>): void => {
      inbox.push(item)
      wake?.()
      wake = undefined
    }
    const unsubscribe = this.desktop.onStreamMessage(message => {
      if (message.id !== id) return
      if (message.type === 'open') {
        onOpen?.()
      } else if (message.type === 'end') {
        enqueue({ type: 'end' })
      } else if (message.type === 'error') {
        enqueue({ type: 'error', error: new Error(message.message) })
      } else {
        try {
          const full: ServerRequest = serverRequestSchema.parse(message.frame)
          const frame = schema.parse(full.payload)
          this.onEnvelope(full)
          enqueue({ type: 'frame', envelope: { rpcId: full.rpcId, payload: frame } })
        } catch (error) {
          console.error(`[oi-dsh-desktop] dropping malformed ${kind} frame`, error)
        }
      }
    })
    const close = (): void => {
      this.desktop.closeStream(id)
      enqueue({ type: 'end' })
    }
    signal.addEventListener('abort', close, { once: true })
    try {
      if (signal.aborted) return
      await this.desktop.openStream(id, kind)
      while (true) {
        while (inbox.length > 0) {
          const item = inbox.shift() as StreamItem<F>
          if (item.type === 'end') return
          if (item.type === 'error') throw item.error
          yield item.envelope
        }
        await new Promise<void>(resolve => { wake = resolve })
      }
    } finally {
      signal.removeEventListener('abort', close)
      unsubscribe()
      this.desktop.closeStream(id)
    }
  }
}

function randomUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
