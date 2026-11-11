import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectionFeedback } from '@tauri-apps/plugin-haptics';
import { runningOnAndroid } from '../src/lib/runtime';
import { selectionHaptic, supportsHaptics } from '../src/lib/haptics';

vi.mock('@tauri-apps/plugin-haptics', () => ({ selectionFeedback: vi.fn() }));
vi.mock('../src/lib/runtime', () => ({ runningOnAndroid: vi.fn() }));

const vibrate = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('navigator', { maxTouchPoints: 5, vibrate });
});

afterEach(() => vi.unstubAllGlobals());

describe('selection haptics', () => {
  it('uses native feedback in the Android app instead of WebView vibration', async () => {
    vi.mocked(runningOnAndroid).mockReturnValue(true);
    expect(supportsHaptics()).toBe(true);
    await selectionHaptic();
    expect(selectionFeedback).toHaveBeenCalledOnce();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('gives a brief pulse in a supported touch browser', async () => {
    expect(supportsHaptics()).toBe(true);
    await selectionHaptic();
    expect(vibrate).toHaveBeenCalledWith(10);
    expect(selectionFeedback).not.toHaveBeenCalled();
  });

  it('does nothing without touch support or the vibration API', async () => {
    vi.stubGlobal('navigator', { maxTouchPoints: 0, vibrate });
    expect(supportsHaptics()).toBe(false);
    await selectionHaptic();
    expect(vibrate).not.toHaveBeenCalled();

    vi.stubGlobal('navigator', { maxTouchPoints: 5 });
    expect(supportsHaptics()).toBe(false);
    await expect(selectionHaptic()).resolves.toBeUndefined();
  });

  it('leaves the gesture working if native feedback fails', async () => {
    vi.mocked(runningOnAndroid).mockReturnValue(true);
    vi.mocked(selectionFeedback).mockRejectedValue(new Error('No vibrator'));
    await expect(selectionHaptic()).resolves.toBeUndefined();
  });
});
