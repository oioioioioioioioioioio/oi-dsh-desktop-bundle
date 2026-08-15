//#region src/native-host.ts
const DESKTOP_NATIVE_HOST_KEY = "oiDshDesktopNativeHost";
function provideDesktopNativeHost(ctx, host) {
	ctx.provide(DESKTOP_NATIVE_HOST_KEY, host);
}

//#endregion
export { provideDesktopNativeHost as n, DESKTOP_NATIVE_HOST_KEY as t };