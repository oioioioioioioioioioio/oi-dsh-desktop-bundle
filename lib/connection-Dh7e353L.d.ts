import { Context, Service } from "@deepseek-ai/cordis";
import { RpcResult } from "@deepseek-ai/dsh-host-apiproxy/api";

//#region src/host/connection.d.ts
interface ConnectionRpcHandlerOptions {
  readonly authority: 'trusted-host' | 'loopback';
}
type ConnectionRpcHandler = (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<RpcResult<unknown>>;
type ConnectionRpcEndpointMatcher = (endpoint: string) => boolean;
interface DesktopHostConnection {
  readonly rpc: {
    handle(channel: string, handler: ConnectionRpcHandler, options: ConnectionRpcHandlerOptions): () => Promise<void>;
    intercept(channel: '/api', matches: ConnectionRpcEndpointMatcher, handler: ConnectionRpcHandler, options: ConnectionRpcHandlerOptions): () => Promise<void>;
  };
  fetch(request: Request): Promise<Response>;
}
declare module '@deepseek-ai/cordis' {
  interface Context {
    connection: DesktopHostConnection;
  }
}
/** Process-local Connection service used by Electron's IPC carrier. */
declare class DesktopConnectionService extends Service implements DesktopHostConnection {
  private readonly channels;
  private readonly interceptors;
  constructor(ctx: Context);
  get rpc(): DesktopHostConnection['rpc'];
  fetch(request: Request): Promise<Response>;
  private register;
  private registerInterceptor;
}
declare const inject: string[];
declare function apply(ctx: Context): void;
//#endregion
export { DesktopHostConnection as a, DesktopConnectionService as i, ConnectionRpcHandler as n, apply as o, ConnectionRpcHandlerOptions as r, inject as s, ConnectionRpcEndpointMatcher as t };