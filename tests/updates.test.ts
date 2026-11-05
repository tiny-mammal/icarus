import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  settings: new Map<string, unknown>(),
  latest: { version: '0.3.0', published: '2026-11-03T12:00:00.000Z' } as unknown,
  fail: false,
  opened: [] as string[],
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
  builtAt: '2026-11-01T10:00:00.000Z',
}));

vi.mock('../src/lib/runtime', () => ({ runningUnderTauri: () => true }));
vi.mock('../src/lib/storage', () => ({
  storage: {
    getItem: async (_store: string, key: string) => state.settings.get(key),
    setItem: async (_store: string, key: string, value: unknown) => void state.settings.set(key, value),
  },
}));
vi.mock('@tauri-apps/api/app', () => ({ getVersion: async () => '0.2.0' }));
vi.mock('@tauri-apps/api/core', () => ({
  invoke: async (command: string) => {
    expect(command).toBe('latest_release');
    if (state.fail) throw new Error('offline');
    return state.latest;
  },
}));
vi.mock('../src/lib/external', () => ({
  openExternal: async (url: string) => void state.opened.push(url),
}));

async function freshUpdates() {
  vi.resetModules();
  // Vitest imports the module as TypeScript; this stands in for the rune.
  vi.stubGlobal('$state', (value: unknown) => value);
  vi.stubGlobal('__ICARUS_BUILT_AT__', state.builtAt);
  vi.stubGlobal('navigator', { userAgent: state.userAgent });
  const module = await import('../src/lib/updates.svelte');
  await vi.waitFor(() => expect(module.updates.current).toBe('0.2.0'));
  return module;
}

beforeEach(() => {
  vi.useRealTimers();
  state.settings.clear();
  state.latest = { version: '0.3.0', published: '2026-11-03T12:00:00.000Z' };
  state.fail = false;
  state.opened = [];
  state.userAgent = 'Mozilla/5.0 (X11; Linux x86_64)';
  state.builtAt = '2026-11-01T10:00:00.000Z';
});

describe('update checks', () => {
  it('stays off and never asks the network unless the user opts in', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const { updates } = await freshUpdates();
    await updates.load();
    await vi.runAllTimersAsync();
    expect(updates.enabled).toBe(false);
    expect(updates.status).toBe('idle');
  });

  it('checks shortly after the diary opens once enabled', async () => {
    state.settings.set('checkForUpdates', true);
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const { updates } = await freshUpdates();
    await updates.load();
    expect(updates.status).toBe('idle');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(updates.status).toBe('done');
    expect(updates.available).toBe(true);
    expect(updates.notice).toBe('update');
  });

  it('persists the choice and checks right away when turned on', async () => {
    const { updates } = await freshUpdates();
    await updates.setEnabled(true);
    expect(state.settings.get('checkForUpdates')).toBe(true);
    await vi.waitFor(() => expect(updates.status).toBe('done'));
    expect(updates.available).toBe(true);
  });

  it('reports no update for the same or an older version', async () => {
    state.latest = { version: '0.2.0', published: '2026-11-01T12:00:00.000Z' };
    const { updates } = await freshUpdates();
    expect(await updates.check()).toBe(true);
    expect(updates.available).toBe(false);
  });

  it('rejects a malformed manifest and a failed request', async () => {
    state.latest = { version: 'latest', published: 'now' };
    const { updates } = await freshUpdates();
    expect(await updates.check()).toBe(false);
    expect(updates.status).toBe('failed');
    state.fail = true;
    expect(await updates.check()).toBe(false);
    expect(updates.available).toBe(false);
  });

  it('puts the notice away after a download but keeps the update known', async () => {
    const { updates, DOWNLOAD_PAGE } = await freshUpdates();
    await updates.check();
    await updates.download();
    expect(state.opened).toEqual([`${DOWNLOAD_PAGE}?installed=0.2.0`]);
    expect(updates.notice).toBe(null);
    expect(updates.available).toBe(true);
  });
});

describe('monthly reminder', () => {
  const built = Date.parse('2026-11-01T10:00:00.000Z');
  const DAY = 86_400_000;

  it('waits until the build is a month old', async () => {
    const { updates } = await freshUpdates();
    await updates.load(built + 29 * DAY);
    expect(updates.notice).toBe(null);
    await updates.load(built + 31 * DAY);
    expect(updates.notice).toBe('reminder');
  });

  it('rests for a month after "Not now", and the snooze survives a restart', async () => {
    const { updates } = await freshUpdates();
    await updates.load(built + 31 * DAY);
    await updates.snoozeReminder(built + 31 * DAY);
    expect(updates.notice).toBe(null);
    expect(state.settings.get('updateRemindAfter')).toBe(built + 61 * DAY);

    const reopened = (await freshUpdates()).updates;
    await reopened.load(built + 50 * DAY);
    expect(reopened.notice).toBe(null);
    await reopened.load(built + 62 * DAY);
    expect(reopened.notice).toBe('reminder');
  });

  it('stays away when turned off or when automatic checks are on', async () => {
    state.settings.set('updateReminder', false);
    let { updates } = await freshUpdates();
    await updates.load(built + 40 * DAY);
    expect(updates.notice).toBe(null);

    state.settings.set('updateReminder', true);
    state.settings.set('checkForUpdates', true);
    ({ updates } = await freshUpdates());
    await updates.load(built + 40 * DAY);
    expect(updates.reminderDue).toBe(false);
  });

  it('checks directly on desktop and reports what it found', async () => {
    const { updates } = await freshUpdates();
    await updates.load(built + 40 * DAY);
    expect(await updates.lookForUpdate()).toBe('available');
    expect(updates.notice).toBe('update');
    state.latest = { version: '0.2.0', published: '2026-11-01T10:00:00.000Z' };
    expect(await updates.lookForUpdate()).toBe('current');
    expect(state.opened).toEqual([]);
  });

  it('opens the download page on Android, which never goes online itself', async () => {
    state.userAgent = 'Mozilla/5.0 (Linux; Android 15; Pixel 9)';
    const { updates, DOWNLOAD_PAGE } = await freshUpdates();
    expect(updates.canCheck).toBe(false);
    await updates.load(built + 40 * DAY);
    expect(updates.notice).toBe('reminder');
    expect(await updates.lookForUpdate()).toBe('opened');
    expect(state.opened).toEqual([`${DOWNLOAD_PAGE}?installed=0.2.0`]);
    expect(updates.notice).toBe(null);
  });
});
