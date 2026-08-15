export {
  AbstractApiClient,
} from '@deepseek-ai/dsh-host-apiproxy/client'
export type { IApiClient } from '@deepseek-ai/dsh-host-apiproxy/client'
export {
  RpcId,
  clientRequestSchema,
  serverRequestSchema,
  serverResponseSchema,
} from '@deepseek-ai/dsh-host-apiproxy/api'
export type {
  ClientRequest,
  HostFrame,
  MuxFrame,
  RpcMessage,
  RpcRequest,
  RpcResult,
  ServerRequest,
} from '@deepseek-ai/dsh-host-apiproxy/api'
export { hostFrameSchema, muxFrameSchema } from '@deepseek-ai/dsh-host-apiproxy/api/events.schema'

export type HostDescription = import('@deepseek-ai/dsh-host-apiproxy/api').ResponseValue<'host.describe'>
