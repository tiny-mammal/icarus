import { beforeEach, describe, expect, it, vi } from 'vitest';

const DATA_DIR = '/data/user/0/com.icarus.diary';

const mocks = vi.hoisted(() => ({
  files: new Map<string, string>(),
  dirs: new Set<string>(),
  selections: [] as (string | null)[],
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: async () => DATA_DIR,
  join: async (...parts: string[]) => parts.join('/').replace(/\/+/, '/'),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: async () => mocks.selections.shift() ?? null,
  save: async () => mocks.selections.shift() ?? null,
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: async (path: string) => {
    // Content URIs can't be checked on Android; the backend must not try.
    if (path.startsWith('content://')) throw new Error('exists() on a content URI');
    return mocks.files.has(path) || mocks.dirs.has(path);
  },
  mkdir: async (path: string) => { mocks.dirs.add(path); },
  readTextFile: async (path: string) => {
    const contents = mocks.files.get(path);
    if (contents === undefined) throw new Error(`Missing file: ${path}`);
    return contents;
  },
  writeTextFile: async (path: string, contents: string) => {
    if (!path.startsWith('content://') && !mocks.dirs.has(DATA_DIR)) {
      throw new Error('The data directory does not exist');
    }
    mocks.files.set(path, contents);
  },
  rename: async (from: string, to: string) => {
    const contents = mocks.files.get(from);
    if (contents === undefined) throw new Error(`Missing file: ${from}`);
    mocks.files.set(to, contents);
    mocks.files.delete(from);
  },
  remove: async (path: string) => { mocks.files.delete(path); },
}));

import { deviceBackend } from '../src/lib/storage/device';

const APP = { kind: 'app' } as const;

beforeEach(() => {
  mocks.files.clear();
  mocks.selections.length = 0;
});

describe('Android private storage', () => {
  it('keeps one app-owned diary, drafts and settings in the private data directory', async () => {
    expect(await deviceBackend.getRememberedVault()).toBeNull();
    expect(await deviceBackend.pickVaultLocation()).toEqual(APP);

    await deviceBackend.writeVault(APP, 'BEGIN:VCALENDAR');
    await deviceBackend.setItem('drafts', 'drafts', ['private']);

    expect([...mocks.files.keys()].sort()).toEqual([
      `${DATA_DIR}/diary.vault`,
      `${DATA_DIR}/drafts.json`,
    ]);
    expect(await deviceBackend.getRememberedVault()).toEqual(APP);
    expect(await deviceBackend.readVault(APP)).toBe('BEGIN:VCALENDAR');
    expect(await deviceBackend.getItem('drafts', 'drafts')).toEqual(['private']);
    expect(await deviceBackend.siblingVault(APP, true)).toEqual(APP);
  });

  it('erases the diary when it is forgotten', async () => {
    await deviceBackend.writeVault(APP, 'BEGIN:VCALENDAR');
    await deviceBackend.forgetVault(APP);
    expect(await deviceBackend.vaultExists(APP)).toBe(false);
    expect(await deviceBackend.getRememberedVault()).toBeNull();
  });

  it('imports a picked file into the app vault and exports to a new document', async () => {
    mocks.files.set('content://downloads/old.ics', 'BEGIN:VCALENDAR\nOLD');
    mocks.selections.push('content://downloads/old.ics');
    expect(await deviceBackend.pickDiaryText()).toEqual({ text: 'BEGIN:VCALENDAR\nOLD', ref: APP });

    mocks.selections.push('content://documents/backup.ics');
    expect(await deviceBackend.saveBackup('BACKUP', 'icarus-diary-backup.ics')).toBe(true);
    expect(mocks.files.get('content://documents/backup.ics')).toBe('BACKUP');

    expect(await deviceBackend.saveBackup('BACKUP', 'icarus-diary-backup.ics')).toBe(false);
  });

  it('refuses vaults that are not app-owned', async () => {
    await expect(deviceBackend.readVault({ kind: 'file', path: '/sdcard/diary.ics' }))
      .rejects.toThrow('Android storage expects the app vault');
  });
});
