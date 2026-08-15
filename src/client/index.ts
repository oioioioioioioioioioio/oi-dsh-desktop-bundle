import type { Context } from '@deepseek-ai/cordis'
import type { IApiClient, HostDescription } from './api.js'
import {
  ConnectionController,
  type ConnectionConfig,
  type ConnectionSinks,
} from './controller.js'
import { ElectronApiClient } from './electron-api-client.js'
import { createConnectionRpc, type ClientConnectionRpc } from './rpc.js'
import type { DesktopBridge } from '../shared.js'

declare global {
  interface Window {
    dshDesktop?: DesktopBridge
  }
}

interface HostDescriptionSource {
  getSnapshot(): HostDescription | undefined
  subscribe(listener: () => void): () => void
}

interface ConnectionHandle {
  readonly api: IApiClient
  readonly isLoopback: boolean
  readonly hostDescription: HostDescriptionSource
  readonly rpc: ClientConnectionRpc
  start(sinks: ConnectionSinks, config?: ConnectionConfig): { stop(): void }
}

export const inject: string[] = []

export function apply(ctx: Context): void {
  if (typeof window === 'undefined' || window.dshDesktop === undefined) {
    throw new Error('oi-dsh-desktop connection loaded outside the Electron preload bridge')
  }
  const api = new ElectronApiClient(window.dshDesktop)
  const rpc = createConnectionRpc((input, init) =>
    api.fetch(new URL(input instanceof Request ? input.url : input), init))
  let started = false
  let description: HostDescription | undefined
  const listeners = new Set<() => void>()
  const publish = (next: HostDescription | undefined): void => {
    if (Object.is(description, next)) return
    description = next
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch (error) {
        console.error('[oi-dsh-desktop] host description listener failed', error)
      }
    }
  }
  const handle: ConnectionHandle = {
    api,
    rpc,
    isLoopback: true,
    hostDescription: {
      getSnapshot: () => description,
      subscribe(listener) {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
    },
    start(sinks, config) {
      if (started) throw new Error('desktop connection stream loop already has an owner')
      started = true
      const controller = new ConnectionController(api, {
        ...sinks,
        onConnected(next) {
          publish(next)
          if (Object.is(description, next)) sinks.onConnected?.(next)
        },
        onStateChange(state) {
          if (state === 'reconnecting') publish(undefined)
          sinks.onStateChange?.(state)
        },
      }, config)
      controller.start()
      return {
        stop() {
          controller.stop()
          publish(undefined)
        },
      }
    },
  }
  ctx.provide('connection' as never, handle as never)
}

export default apply
