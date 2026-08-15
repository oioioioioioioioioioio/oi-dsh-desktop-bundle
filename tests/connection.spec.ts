import { Context } from '@deepseek-ai/cordis'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DesktopConnectionService } from '../src/host/connection.js'

describe('desktop host connection', () => {
  let ctx: Context | undefined

  afterEach(async () => {
    await ctx?.fiber.dispose()
    ctx = undefined
  })

  it('dispatches a generic RPC channel without an HTTP server', async () => {
    ctx = new Context()
    const connection = new DesktopConnectionService(ctx)
    connection.rpc.handle('/desktop-test', async (endpoint, payload) => ({
      ok: true,
      value: { endpoint, payload },
    }), { authority: 'loopback' })
    const rpcId = RpcId('desktop-test-rpc')

    const response = await connection.fetch(new Request('http://dsh.internal/desktop-test/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId,
        method: 'echo',
        payload: { value: 42 },
      }),
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      type: 'server-response',
      rpcId,
      result: {
        ok: true,
        value: { endpoint: 'echo', payload: { value: 42 } },
      },
    })
  })

  it('rejects malformed RPC envelopes before dispatch', async () => {
    ctx = new Context()
    const connection = new DesktopConnectionService(ctx)
    const handler = vi.fn(async () => ({ ok: true as const, value: null }))
    connection.rpc.handle('/desktop-test', handler, { authority: 'loopback' })
    const response = await connection.fetch(new Request('http://dsh.internal/desktop-test/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }))

    expect(response.status).toBe(200)
    const body = await response.json() as { result: { ok: boolean; error?: { code: string } } }
    expect(body.result).toMatchObject({ ok: false, error: { code: 'bad-request' } })
    expect(handler).not.toHaveBeenCalled()
  })
})
