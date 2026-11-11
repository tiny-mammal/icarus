import { selectionFeedback } from '@tauri-apps/plugin-haptics';
import { runningOnAndroid } from './runtime';

/** Native Android feedback, or the vibration API on touch-capable browsers. */
export function supportsHaptics(): boolean {
  return runningOnAndroid() || (navigator.maxTouchPoints > 0 && typeof navigator.vibrate === 'function');
}

/** A short tick for a changed selection. Missing hardware must never interrupt a gesture. */
export async function selectionHaptic(): Promise<void> {
  try {
    if (runningOnAndroid()) await selectionFeedback();
    else if (supportsHaptics()) navigator.vibrate(10);
  } catch {
    // Some devices expose the API without usable vibration hardware.
  }
}
