import { t as DESKTOP_NATIVE_HOST_KEY } from "./native-host-BOkUnbWg.js";
import { DirectoryPicker } from "@deepseek-ai/dsh-host-directory-picker";

//#region src/host/directory-picker.ts
var DesktopDirectoryPicker = class extends DirectoryPicker {
	nativeCapability;
	constructor(ctx) {
		super(ctx);
		const nativeHost = ctx.get(DESKTOP_NATIVE_HOST_KEY);
		if (nativeHost === void 0) throw new Error("desktop directory picker: Electron native host is unavailable");
		this.nativeCapability = {
			kind: "native",
			pick: (signal) => nativeHost.pickDirectory(signal)
		};
	}
	capability() {
		return this.nativeCapability;
	}
};
const inject = [DESKTOP_NATIVE_HOST_KEY];
function apply(ctx) {
	new DesktopDirectoryPicker(ctx);
}
var directory_picker_default = apply;

//#endregion
export { apply, directory_picker_default as default, inject };