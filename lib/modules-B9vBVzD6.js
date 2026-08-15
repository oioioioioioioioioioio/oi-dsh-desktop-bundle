import { createRequire } from "node:module";
import { Service } from "@deepseek-ai/cordis";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

//#region src/host/modules.ts
const BUNDLE_PACKAGE = "oi-dsh-desktop-bundle";
const MODULES_HOST_ENTRY = `${BUNDLE_PACKAGE}/modules`;
const CONNECTION_HOST_ENTRY = `${BUNDLE_PACKAGE}/connection`;
const MODULES_CLIENT_ID = "@deepseek-ai/dsh-client-modules";
const CONNECTION_CLIENT_ID = "@deepseek-ai/dsh-client-connection";
/** Client graph registry that needs Loader only and never mounts HTTP routes. */
var DesktopClientModuleRegistry = class extends Service {
	static inject = ["loader"];
	records = /* @__PURE__ */ new Map();
	graphListeners = /* @__PURE__ */ new Set();
	dirty = /* @__PURE__ */ new Set();
	resolvers;
	flushQueued = false;
	composed = {
		rev: shortHash("[]"),
		entries: []
	};
	constructor(ctx) {
		super(ctx, "clientModules");
		if (ctx.baseUrl === void 0) throw new Error("desktop client modules: ctx.baseUrl is required for package resolution");
		this.resolvers = createPackageResolvers(ctx.baseUrl);
		ctx.on("internal/plugin", (fiber) => {
			const entryName = fiber.entry?.options.name;
			if (entryName === void 0) return;
			this.markDirty(entryName);
		});
		for (const entry of ctx.loader.entries()) this.dirty.add(entry.options.name);
		const failures = [];
		this.flush((error) => failures.push(error));
		if (failures.length > 0) throw new AggregateError(failures, "desktop client modules: client graph composition failed");
	}
	graph() {
		this.refreshAll();
		return this.composed;
	}
	clientPath(id) {
		this.refreshAll();
		return this.records.get(id)?.clientPath;
	}
	onGraphChanged(listener) {
		this.graphListeners.add(listener);
		return () => {
			this.graphListeners.delete(listener);
		};
	}
	markDirty(entryName) {
		this.dirty.add(entryName);
		if (this.flushQueued) return;
		this.flushQueued = true;
		queueMicrotask(() => {
			this.flushQueued = false;
			this.flush((error) => {
				this.ctx.logger.warn(error);
			});
		});
	}
	refreshAll() {
		for (const entry of this.ctx.loader.entries()) this.dirty.add(entry.options.name);
		this.flush((error) => {
			this.ctx.logger.warn(error);
		});
	}
	flush(onError) {
		let changed = false;
		for (const entryName of [...this.dirty]) {
			this.dirty.delete(entryName);
			try {
				if (this.reconcile(entryName)) changed = true;
			} catch (error) {
				onError(error instanceof Error ? error : new Error(String(error)));
			}
		}
		if (!changed) return;
		const entries = [...this.records.values()].map((record) => record.entry);
		this.composed = {
			rev: shortHash(JSON.stringify(entries)),
			entries
		};
		for (const listener of [...this.graphListeners]) try {
			listener();
		} catch (error) {
			this.ctx.logger.error(error);
		}
	}
	reconcile(entryName) {
		const active = [...this.ctx.loader.entries()].some((entry) => entry.options.name === entryName && entry.fiber !== void 0 && !entry.disabled);
		const descriptor = this.resolveDescriptor(entryName);
		const existingId = [...this.records.values()].find((record) => record.entryName === entryName)?.entry.id;
		if (!active || descriptor === void 0) return existingId === void 0 ? false : this.records.delete(existingId);
		if (this.records.has(descriptor.id)) return false;
		const rev = shortHash(readFileSync(descriptor.clientPath));
		this.records.set(descriptor.id, {
			entryName,
			clientPath: descriptor.clientPath,
			entry: {
				id: descriptor.id,
				url: `/plugins/${descriptor.id}/client.js?rev=${rev}`,
				rev,
				...descriptor.inject === void 0 ? {} : { inject: descriptor.inject },
				...descriptor.immediately ? { immediately: true } : {}
			}
		});
		return true;
	}
	resolveDescriptor(entryName) {
		if (entryName === MODULES_HOST_ENTRY) return this.packageDescriptor(MODULES_CLIENT_ID, MODULES_CLIENT_ID);
		if (entryName === CONNECTION_HOST_ENTRY) {
			const packagePath = this.resolvePackageManifest(BUNDLE_PACKAGE);
			if (packagePath === void 0) throw new Error(`desktop client modules: cannot resolve ${BUNDLE_PACKAGE}`);
			const manifest = readManifest(packagePath);
			return {
				id: CONNECTION_CLIENT_ID,
				clientPath: join(dirname(packagePath), clientExport(BUNDLE_PACKAGE, manifest.exports)),
				inject: [],
				immediately: true
			};
		}
		return this.packageDescriptor(entryName, entryName);
	}
	packageDescriptor(id, packageName) {
		const packagePath = this.resolvePackageManifest(packageName);
		if (packagePath === void 0) return void 0;
		const manifest = readManifest(packagePath);
		const declaration = clientDeclaration(packageName, manifest.dsh);
		if (declaration === void 0 || declaration.platform !== "web") return void 0;
		return {
			id,
			clientPath: join(dirname(packagePath), clientExport(packageName, manifest.exports)),
			...declaration.inject === void 0 ? {} : { inject: declaration.inject },
			immediately: declaration.immediately === true
		};
	}
	resolvePackageManifest(packageName) {
		for (const resolver of this.resolvers) try {
			return resolver.resolve(`${packageName}/package.json`);
		} catch {}
	}
};
function createPackageResolvers(profileBaseUrl) {
	const resolvers = [createRequire(profileBaseUrl), createRequire(import.meta.url)];
	const anchors = /* @__PURE__ */ new Set();
	for (const packageName of [
		BUNDLE_PACKAGE,
		"@deepseek-ai/dsh-web-app",
		"@deepseek-ai/dsh"
	]) for (const resolver of [...resolvers]) try {
		const manifestPath = resolver.resolve(`${packageName}/package.json`);
		if (!anchors.has(manifestPath)) {
			anchors.add(manifestPath);
			resolvers.push(createRequire(manifestPath));
		}
		break;
	} catch {}
	return resolvers;
}
function readManifest(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}
function clientDeclaration(packageName, dshValue) {
	if (typeof dshValue !== "object" || dshValue === null) return void 0;
	const value = dshValue.client;
	if (value === void 0) return void 0;
	if (typeof value !== "object" || value === null) throw new Error(`desktop client modules: ${packageName} has an invalid dsh.client declaration`);
	const declaration = value;
	if (typeof declaration.platform !== "string") throw new Error(`desktop client modules: ${packageName} dsh.client.platform must be a string`);
	if (declaration.inject !== void 0 && (!Array.isArray(declaration.inject) || declaration.inject.some((value$1) => typeof value$1 !== "string"))) throw new Error(`desktop client modules: ${packageName} dsh.client.inject must be a string array`);
	if (declaration.immediately !== void 0 && typeof declaration.immediately !== "boolean") throw new Error(`desktop client modules: ${packageName} dsh.client.immediately must be boolean`);
	return {
		platform: declaration.platform,
		...declaration.inject === void 0 ? {} : { inject: declaration.inject },
		...declaration.immediately === void 0 ? {} : { immediately: declaration.immediately }
	};
}
function clientExport(packageName, exportsValue) {
	if (typeof exportsValue !== "object" || exportsValue === null) throw new Error(`desktop client modules: ${packageName} does not export ./client`);
	const value = exportsValue["./client"];
	if (typeof value === "string") return value;
	if (typeof value === "object" && value !== null) {
		const fallback = value.default;
		if (typeof fallback === "string") return fallback;
	}
	throw new Error(`desktop client modules: ${packageName} does not export a default ./client bundle`);
}
function shortHash(value) {
	return createHash("sha1").update(value).digest("hex").slice(0, 12);
}
const inject = ["loader"];
function apply(ctx) {
	new DesktopClientModuleRegistry(ctx);
}
var modules_default = apply;

//#endregion
export { modules_default as a, inject as i, apply as n, createPackageResolvers as r, DesktopClientModuleRegistry as t };