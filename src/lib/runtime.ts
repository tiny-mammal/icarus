import { isTauri } from '@tauri-apps/api/core';

/** True inside the Tauri shell (desktop or Android), false in a plain browser. */
export function runningUnderTauri(): boolean {
  if (isTauri()) return true;
  // Belt and braces: `__TAURI_INTERNALS__` is the object every Tauri API calls
  // into, so its presence is a reliable signal even without the helper.
  return '__TAURI_INTERNALS__' in globalThis;
}

/** True in the Android app. Its WebView always names the OS in the user agent. */
export function runningOnAndroid(): boolean {
  return runningUnderTauri() && /android/i.test(navigator.userAgent);
}
