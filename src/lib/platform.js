// Detect whether we're running inside the Capacitor native shell.
// The native runtime injects window.Capacitor; in a plain browser it's absent.

export function isNative() {
  return Boolean(globalThis.Capacitor?.isNativePlatform?.());
}

export function platformName() {
  return globalThis.Capacitor?.getPlatform?.() ?? 'web';
}
