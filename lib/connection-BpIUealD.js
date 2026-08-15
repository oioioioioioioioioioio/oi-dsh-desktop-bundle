import { Service } from "@deepseek-ai/cordis";
import { toFetchHandler } from "@deepseek-ai/dsh-host-apiproxy";
import { RpcId, clientRequestSchema } from "@deepseek-ai/dsh-host-apiproxy/api";

//#region src/host/connection.ts
const API_PATH = "/api";
const INVALID_REQUEST_RPC_ID = RpcId("invalid-request");
const CHANNEL_PATTERN = /^\/[A-Za-z0-9._~-]+$/;
const ENDPOINT_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
/** Process-local Connection service used by Electron's IPC carrier. */
var DesktopConnectionService = class extends Service {
	channels = /* @__PURE__ */ new Map();
	interceptors = /* @__PURE__ */ new Map();
	constructor(ctx) {
		super(ctx, "connection");
	}
	get rpc() {
		const owner = this.ctx;
		return {
			handle: (channel, handler, options) => this.register(owner, channel, handler, options),
			intercept: (channel, matches, handler, options) => this.registerInterceptor(owner, channel, matches, handler, options)
		};
	}
	async fetch(request) {
		const pathname = new URL(request.url).pathname;
		if (pathname === API_PATH || pathname.startsWith(`${API_PATH}/`)) {
			const endpoint = endpointFromPath(API_PATH, pathname);
			const interceptor = this.interceptors.get(API_PATH);
			if (endpoint !== void 0 && interceptor?.matches(endpoint) === true) return rpcResponse(API_PATH, interceptor.handler, request);
			const api = this.ctx.get("apiProxy");
			if (api === void 0) return new Response("not found", { status: 404 });
			return toFetchHandler(api).fetch(request);
		}
		for (const [channel, registration] of this.channels) if (endpointFromPath(channel, pathname) !== void 0) return rpcResponse(channel, registration.handler, request);
		return new Response("not found", { status: 404 });
	}
	register(owner, channel, handler, options) {
		assertChannel(channel);
		return owner.effect(() => {
			if (this.channels.has(channel)) throw new Error(`desktop connection: RPC channel ${JSON.stringify(channel)} is already registered`);
			this.channels.set(channel, {
				handler,
				options
			});
			return () => {
				this.channels.delete(channel);
			};
		}, `oi-dsh-desktop: ${channel} RPC channel`);
	}
	registerInterceptor(owner, channel, matches, handler, options) {
		return owner.effect(() => {
			if (this.interceptors.has(channel)) throw new Error(`desktop connection: ${channel} already has an interceptor`);
			this.interceptors.set(channel, {
				matches,
				handler,
				options
			});
			return () => {
				this.interceptors.delete(channel);
			};
		}, `oi-dsh-desktop: ${channel} RPC interceptor`);
	}
};
async function rpcResponse(channel, handler, request) {
	const endpoint = endpointFromPath(channel, new URL(request.url).pathname);
	if (request.method !== "POST" || endpoint === void 0) return new Response("not found", { status: 404 });
	if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") return new Response("content type must be application/json", { status: 415 });
	let body;
	try {
		body = await request.json();
	} catch {
		return new Response("body is not JSON", { status: 400 });
	}
	const envelope = clientRequestSchema.safeParse(body);
	if (!envelope.success) return invalidEnvelopeResponse(body, envelope.error.issues);
	const message = envelope.data;
	if (message.method !== endpoint) return errorResponse(message.rpcId, {
		code: "bad-request",
		message: `method ${JSON.stringify(message.method)} does not match endpoint ${JSON.stringify(endpoint)}`,
		details: { issues: [] }
	});
	try {
		return fullResponse(message.rpcId, await handler(endpoint, message.payload, request.signal));
	} catch (error) {
		return new Response(`handler failure: ${String(error)}`, { status: 500 });
	}
}
function invalidEnvelopeResponse(body, issues) {
	const rawId = body?.rpcId;
	return errorResponse(typeof rawId === "string" ? RpcId(rawId) : INVALID_REQUEST_RPC_ID, {
		code: "bad-request",
		message: "invalid client-request message",
		details: { issues }
	});
}
function errorResponse(rpcId, error) {
	return fullResponse(rpcId, {
		ok: false,
		error
	});
}
function fullResponse(rpcId, result) {
	const body = {
		type: "server-response",
		rpcId,
		result
	};
	return Response.json(body);
}
function endpointFromPath(channel, pathname) {
	if (!pathname.startsWith(`${channel}/`)) return void 0;
	const endpoint = pathname.slice(channel.length + 1);
	return endpoint.split("/").some((segment) => segment === "" || segment === "." || segment === ".." || !ENDPOINT_SEGMENT_PATTERN.test(segment)) ? void 0 : endpoint;
}
function assertChannel(channel) {
	if (!CHANNEL_PATTERN.test(channel) || channel === API_PATH) throw new Error(`desktop connection: invalid or reserved RPC channel ${JSON.stringify(channel)}`);
}
const inject = [];
function apply(ctx) {
	new DesktopConnectionService(ctx);
}
var connection_default = apply;

//#endregion
export { inject as i, apply as n, connection_default as r, DesktopConnectionService as t };