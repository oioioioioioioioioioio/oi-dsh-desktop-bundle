import { Service, type Context } from '@deepseek-ai/cordis'
import { toFetchHandler } from '@deepseek-ai/dsh-host-apiproxy'
import {
  RpcId,
  clientRequestSchema,
  type ApiProxy,
  type ClientRequest,
  type RpcError,
  type RpcErrorDetailsMap,
  type RpcId as RpcIdType,
  type RpcResult,
  type ServerResponse,
} from '@deepseek-ai/dsh-host-apiproxy/api'

const API_PATH = '/api'
const INVALID_REQUEST_RPC_ID = RpcId('invalid-request')
const CHANNEL_PATTERN = /^\/[A-Za-z0-9._~-]+$/
const ENDPOINT_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/

export interface ConnectionRpcHandlerOptions {
  readonly authority: 'trusted-host' | 'loopback'
}

export type ConnectionRpcHandler = (
  endpoint: string,
  payload: unknown,
  signal: AbortSignal,
) => Promise<RpcResult<unknown>>

export type ConnectionRpcEndpointMatcher = (endpoint: string) => boolean

interface RpcRegistration {
  readonly handler: ConnectionRpcHandler
  readonly options: ConnectionRpcHandlerOptions
}

interface RpcInterceptor extends RpcRegistration {
  readonly matches: ConnectionRpcEndpointMatcher
}

export interface DesktopHostConnection {
  readonly rpc: {
    handle(
      channel: string,
      handler: ConnectionRpcHandler,
      options: ConnectionRpcHandlerOptions,
    ): () => Promise<void>
    intercept(
      channel: '/api',
      matches: ConnectionRpcEndpointMatcher,
      handler: ConnectionRpcHandler,
      options: ConnectionRpcHandlerOptions,
    ): () => Promise<void>
  }
  fetch(request: Request): Promise<Response>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    connection: DesktopHostConnection
  }
}

/** Process-local Connection service used by Electron's IPC carrier. */
export class DesktopConnectionService extends Service implements DesktopHostConnection {
  private readonly channels = new Map<string, RpcRegistration>()
  private readonly interceptors = new Map<string, RpcInterceptor>()

  constructor(ctx: Context) {
    super(ctx, 'connection')
  }

  get rpc(): DesktopHostConnection['rpc'] {
    const owner = this.ctx
    return {
      handle: (channel, handler, options) => this.register(owner, channel, handler, options),
      intercept: (channel, matches, handler, options) =>
        this.registerInterceptor(owner, channel, matches, handler, options),
    }
  }

  async fetch(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname
    if (pathname === API_PATH || pathname.startsWith(`${API_PATH}/`)) {
      const endpoint = endpointFromPath(API_PATH, pathname)
      const interceptor = this.interceptors.get(API_PATH)
      if (endpoint !== undefined && interceptor?.matches(endpoint) === true) {
        return rpcResponse(API_PATH, interceptor.handler, request)
      }
      const api = this.ctx.get('apiProxy') as ApiProxy | undefined
      if (api === undefined) return new Response('not found', { status: 404 })
      return toFetchHandler(api).fetch(request)
    }

    for (const [channel, registration] of this.channels) {
      if (endpointFromPath(channel, pathname) !== undefined) {
        return rpcResponse(channel, registration.handler, request)
      }
    }
    return new Response('not found', { status: 404 })
  }

  private register(
    owner: Context,
    channel: string,
    handler: ConnectionRpcHandler,
    options: ConnectionRpcHandlerOptions,
  ): () => Promise<void> {
    assertChannel(channel)
    return owner.effect(() => {
      if (this.channels.has(channel)) {
        throw new Error(`desktop connection: RPC channel ${JSON.stringify(channel)} is already registered`)
      }
      this.channels.set(channel, { handler, options })
      return () => { this.channels.delete(channel) }
    }, `oi-dsh-desktop: ${channel} RPC channel`)
  }

  private registerInterceptor(
    owner: Context,
    channel: '/api',
    matches: ConnectionRpcEndpointMatcher,
    handler: ConnectionRpcHandler,
    options: ConnectionRpcHandlerOptions,
  ): () => Promise<void> {
    return owner.effect(() => {
      if (this.interceptors.has(channel)) {
        throw new Error(`desktop connection: ${channel} already has an interceptor`)
      }
      this.interceptors.set(channel, { matches, handler, options })
      return () => { this.interceptors.delete(channel) }
    }, `oi-dsh-desktop: ${channel} RPC interceptor`)
  }
}

async function rpcResponse(
  channel: string,
  handler: ConnectionRpcHandler,
  request: Request,
): Promise<Response> {
  const endpoint = endpointFromPath(channel, new URL(request.url).pathname)
  if (request.method !== 'POST' || endpoint === undefined) {
    return new Response('not found', { status: 404 })
  }
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') {
    return new Response('content type must be application/json', { status: 415 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('body is not JSON', { status: 400 })
  }
  const envelope = clientRequestSchema.safeParse(body)
  if (!envelope.success) return invalidEnvelopeResponse(body, envelope.error.issues)
  const message: ClientRequest = envelope.data
  if (message.method !== endpoint) {
    return errorResponse(message.rpcId, {
      code: 'bad-request',
      message: `method ${JSON.stringify(message.method)} does not match endpoint ${JSON.stringify(endpoint)}`,
      details: { issues: [] },
    })
  }
  try {
    return fullResponse(message.rpcId, await handler(endpoint, message.payload, request.signal))
  } catch (error) {
    return new Response(`handler failure: ${String(error)}`, { status: 500 })
  }
}

function invalidEnvelopeResponse(
  body: unknown,
  issues: RpcErrorDetailsMap['bad-request']['issues'],
): Response {
  const rawId = (body as { rpcId?: unknown } | null)?.rpcId
  const rpcId = typeof rawId === 'string' ? RpcId(rawId) : INVALID_REQUEST_RPC_ID
  return errorResponse(rpcId, {
    code: 'bad-request',
    message: 'invalid client-request message',
    details: { issues },
  })
}

function errorResponse(rpcId: RpcIdType, error: RpcError): Response {
  return fullResponse(rpcId, { ok: false, error })
}

function fullResponse(rpcId: RpcIdType, result: ServerResponse['result']): Response {
  const body: ServerResponse = { type: 'server-response', rpcId, result }
  return Response.json(body)
}

function endpointFromPath(channel: string, pathname: string): string | undefined {
  if (!pathname.startsWith(`${channel}/`)) return undefined
  const endpoint = pathname.slice(channel.length + 1)
  const segments = endpoint.split('/')
  return segments.some(segment =>
    segment === '' || segment === '.' || segment === '..' || !ENDPOINT_SEGMENT_PATTERN.test(segment))
    ? undefined
    : endpoint
}

function assertChannel(channel: string): void {
  if (!CHANNEL_PATTERN.test(channel) || channel === API_PATH) {
    throw new Error(`desktop connection: invalid or reserved RPC channel ${JSON.stringify(channel)}`)
  }
}

export const inject: string[] = []

export function apply(ctx: Context): void {
  new DesktopConnectionService(ctx)
}

export default apply
