import { Context } from "@deepseek-ai/cordis";

//#region src/host/directory-picker.d.ts
declare const inject: string[];
declare function apply(ctx: Context): void;
//#endregion
export { apply, apply as default, inject };