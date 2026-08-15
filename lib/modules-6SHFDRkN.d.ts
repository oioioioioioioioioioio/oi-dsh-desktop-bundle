import { Context, Service } from "@deepseek-ai/cordis";
import { WebBootGraph } from "@deepseek-ai/dsh-client-modules/client";

//#region src/host/modules.d.ts
declare module '@deepseek-ai/cordis' {
  interface Context {
    clientModules: DesktopClientModuleRegistry;
  }
}
/** Client graph registry that needs Loader only and never mounts HTTP routes. */
declare class DesktopClientModuleRegistry extends Service {
  static inject: string[];
  private readonly records;
  private readonly graphListeners;
  private readonly dirty;
  private readonly resolvers;
  private flushQueued;
  private composed;
  constructor(ctx: Context);
  graph(): WebBootGraph;
  clientPath(id: string): string | undefined;
  onGraphChanged(listener: () => void): () => void;
  private markDirty;
  private refreshAll;
  private flush;
  private reconcile;
  private resolveDescriptor;
  private packageDescriptor;
  private resolvePackageManifest;
}
declare function createPackageResolvers(profileBaseUrl: string): NodeJS.Require[];
declare const inject: string[];
declare function apply(ctx: Context): void;
//#endregion
export { inject as i, apply as n, createPackageResolvers as r, DesktopClientModuleRegistry as t };