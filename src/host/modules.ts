import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { Service, type Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type { WebBootEntry, WebBootGraph } from '@deepseek-ai/dsh-client-modules/client'

const BUNDLE_PACKAGE = 'oi-dsh-desktop-bundle'
const MODULES_HOST_ENTRY = `${BUNDLE_PACKAGE}/modules`
const CONNECTION_HOST_ENTRY = `${BUNDLE_PACKAGE}/connection`
const MODULES_CLIENT_ID = '@deepseek-ai/dsh-client-modules'
const CONNECTION_CLIENT_ID = '@deepseek-ai/dsh-client-connection'

interface ClientDeclaration {
  readonly platform: string
  readonly inject?: string[]
  readonly immediately?: boolean
}

interface ClientRecord {
  readonly entryName: string
  readonly clientPath: string
  entry: WebBootEntry
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    clientModules: DesktopClientModuleRegistry
  }
}

/** Client graph registry that needs Loader only and never mounts HTTP routes. */
export class DesktopClientModuleRegistry extends Service {
  static inject = ['loader']

  private readonly records = new Map<string, ClientRecord>()
  private readonly graphListeners = new Set<() => void>()
  private readonly dirty = new Set<string>()
  private readonly resolvers: NodeJS.Require[]
  private flushQueued = false
  private composed: WebBootGraph = { rev: shortHash('[]'), entries: [] }

  constructor(ctx: Context) {
    super(ctx, 'clientModules')
    if (ctx.baseUrl === undefined) {
      throw new Error('desktop client modules: ctx.baseUrl is required for package resolution')
    }
    this.resolvers = createPackageResolvers(ctx.baseUrl)
    ctx.on('internal/plugin', (fiber) => {
      const entryName = fiber.entry?.options.name
      if (entryName === undefined) return
      this.markDirty(entryName)
    })
    for (const entry of ctx.loader.entries()) this.dirty.add(entry.options.name)
    const failures: Error[] = []
    this.flush(error => failures.push(error))
    if (failures.length > 0) {
      throw new AggregateError(failures, 'desktop client modules: client graph composition failed')
    }
  }

  graph(): WebBootGraph {
    this.refreshAll()
    return this.composed
  }

  clientPath(id: string): string | undefined {
    this.refreshAll()
    return this.records.get(id)?.clientPath
  }

  onGraphChanged(listener: () => void): () => void {
    this.graphListeners.add(listener)
    return () => { this.graphListeners.delete(listener) }
  }

  private markDirty(entryName: string): void {
    this.dirty.add(entryName)
    if (this.flushQueued) return
    this.flushQueued = true
    queueMicrotask(() => {
      this.flushQueued = false
      this.flush(error => { this.ctx.logger.warn(error) })
    })
  }

  private refreshAll(): void {
    for (const entry of this.ctx.loader.entries()) this.dirty.add(entry.options.name)
    this.flush(error => { this.ctx.logger.warn(error) })
  }

  private flush(onError: (error: Error) => void): void {
    let changed = false
    for (const entryName of [...this.dirty]) {
      this.dirty.delete(entryName)
      try {
        if (this.reconcile(entryName)) changed = true
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)))
      }
    }
    if (!changed) return
    const entries = [...this.records.values()].map(record => record.entry)
    this.composed = { rev: shortHash(JSON.stringify(entries)), entries }
    for (const listener of [...this.graphListeners]) {
      try {
        listener()
      } catch (error) {
        this.ctx.logger.error(error)
      }
    }
  }

  private reconcile(entryName: string): boolean {
    const active = [...this.ctx.loader.entries()].some(entry =>
      entry.options.name === entryName && entry.fiber !== undefined && !entry.disabled)
    const descriptor = this.resolveDescriptor(entryName)
    const existingId = [...this.records.values()].find(record => record.entryName === entryName)?.entry.id
    if (!active || descriptor === undefined) {
      return existingId === undefined ? false : this.records.delete(existingId)
    }
    if (this.records.has(descriptor.id)) return false
    const rev = shortHash(readFileSync(descriptor.clientPath))
    this.records.set(descriptor.id, {
      entryName,
      clientPath: descriptor.clientPath,
      entry: {
        id: descriptor.id,
        url: `/plugins/${descriptor.id}/client.js?rev=${rev}`,
        rev,
        ...(descriptor.inject === undefined ? {} : { inject: descriptor.inject }),
        ...(descriptor.immediately ? { immediately: true } : {}),
      },
    })
    return true
  }

  private resolveDescriptor(entryName: string): {
    readonly id: string
    readonly clientPath: string
    readonly inject?: string[]
    readonly immediately: boolean
  } | undefined {
    if (entryName === MODULES_HOST_ENTRY) {
      return this.packageDescriptor(MODULES_CLIENT_ID, MODULES_CLIENT_ID)
    }
    if (entryName === CONNECTION_HOST_ENTRY) {
      const packagePath = this.resolvePackageManifest(BUNDLE_PACKAGE)
      if (packagePath === undefined) {
        throw new Error(`desktop client modules: cannot resolve ${BUNDLE_PACKAGE}`)
      }
      const manifest = readManifest(packagePath)
      return {
        id: CONNECTION_CLIENT_ID,
        clientPath: join(dirname(packagePath), clientExport(BUNDLE_PACKAGE, manifest.exports)),
        inject: [],
        immediately: true,
      }
    }
    return this.packageDescriptor(entryName, entryName)
  }

  private packageDescriptor(id: string, packageName: string): {
    readonly id: string
    readonly clientPath: string
    readonly inject?: string[]
    readonly immediately: boolean
  } | undefined {
    const packagePath = this.resolvePackageManifest(packageName)
    if (packagePath === undefined) return undefined
    const manifest = readManifest(packagePath)
    const declaration = clientDeclaration(packageName, manifest.dsh)
    if (declaration === undefined || declaration.platform !== 'web') return undefined
    return {
      id,
      clientPath: join(dirname(packagePath), clientExport(packageName, manifest.exports)),
      ...(declaration.inject === undefined ? {} : { inject: declaration.inject }),
      immediately: declaration.immediately === true,
    }
  }

  private resolvePackageManifest(packageName: string): string | undefined {
    for (const resolver of this.resolvers) {
      try {
        return resolver.resolve(`${packageName}/package.json`)
      } catch {
        // The next anchor may own this Loader entry's package.
      }
    }
    return undefined
  }
}

export function createPackageResolvers(profileBaseUrl: string): NodeJS.Require[] {
  const resolvers = [createRequire(profileBaseUrl), createRequire(import.meta.url)]
  const anchors = new Set<string>()

  for (const packageName of [BUNDLE_PACKAGE, '@deepseek-ai/dsh-web-app', '@deepseek-ai/dsh']) {
    for (const resolver of [...resolvers]) {
      try {
        const manifestPath = resolver.resolve(`${packageName}/package.json`)
        if (!anchors.has(manifestPath)) {
          anchors.add(manifestPath)
          resolvers.push(createRequire(manifestPath))
        }
        break
      } catch {
        // Some anchors intentionally cannot see every installation package.
      }
    }
  }

  return resolvers
}

function readManifest(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

function clientDeclaration(packageName: string, dshValue: unknown): ClientDeclaration | undefined {
  if (typeof dshValue !== 'object' || dshValue === null) return undefined
  const value = (dshValue as Record<string, unknown>).client
  if (value === undefined) return undefined
  if (typeof value !== 'object' || value === null) {
    throw new Error(`desktop client modules: ${packageName} has an invalid dsh.client declaration`)
  }
  const declaration = value as Record<string, unknown>
  if (typeof declaration.platform !== 'string') {
    throw new Error(`desktop client modules: ${packageName} dsh.client.platform must be a string`)
  }
  if (declaration.inject !== undefined
    && (!Array.isArray(declaration.inject) || declaration.inject.some(value => typeof value !== 'string'))) {
    throw new Error(`desktop client modules: ${packageName} dsh.client.inject must be a string array`)
  }
  if (declaration.immediately !== undefined && typeof declaration.immediately !== 'boolean') {
    throw new Error(`desktop client modules: ${packageName} dsh.client.immediately must be boolean`)
  }
  return {
    platform: declaration.platform,
    ...(declaration.inject === undefined ? {} : { inject: declaration.inject as string[] }),
    ...(declaration.immediately === undefined ? {} : { immediately: declaration.immediately }),
  }
}

function clientExport(packageName: string, exportsValue: unknown): string {
  if (typeof exportsValue !== 'object' || exportsValue === null) {
    throw new Error(`desktop client modules: ${packageName} does not export ./client`)
  }
  const value = (exportsValue as Record<string, unknown>)['./client']
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    const fallback = (value as Record<string, unknown>).default
    if (typeof fallback === 'string') return fallback
  }
  throw new Error(`desktop client modules: ${packageName} does not export a default ./client bundle`)
}

function shortHash(value: string | Buffer): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 12)
}

export const inject = ['loader']

export function apply(ctx: Context): void {
  new DesktopClientModuleRegistry(ctx)
}

export default apply
