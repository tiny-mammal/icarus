import { beforeEach, describe, expect, it, vi } from 'vitest';

const DATA_DIR = '/home/oli/.local/share/com.icarus.diary';

const mocks = vi.hoisted(() => ({
  files: new Map<string, string>(),
  copies: [] as string[],
  selections: [] as (string | null)[],
  openOptions: [] as unknown[],
  android: false,
  failWrites: false,
}));

vi.mock('../src/lib/runtime', () => ({
  runningOnAndroid: () => mocks.android,
  runningUnderTauri: () => true,
}));

vi.mock('@tauri-apps/api/path', () => ({
  join: async (...parts: string[]) => parts.join('/'),
}));

// Stands in for `src-tauri/src/diary_dir.rs`, which has its own Rust tests.
vi.mock('@tauri-apps/api/core', () => ({
  invoke: async (command: string, args: Record<string, unknown>) => {
    const path = `${DATA_DIR}/${args?.name as string}`;
    switch (command) {
      case 'diary_dir':
        return DATA_DIR;
      case 'write_diary_file': {
        if (mocks.failWrites) throw new Error('disk full');
        const previous = mocks.files.get(path);
        if (args.dailyCopy && previous !== undefined) mocks.copies.push(previous);
        mocks.files.set(path, args.contents as string);
        return;
      }
      case 'remove_diary_file':
        if (args.withCopies) mocks.copies.length = 0;
        mocks.files.delete(path);
        return;
      case 'remove_diary_copies':
        mocks.copies.length = 0;
        return;
      default:
        throw new Error(`Unexpected command ${command}`);
    }
  },
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: async (options: unknown) => {
    mocks.openOptions.push(options);
    return mocks.selections.shift() ?? null;
  },
  save: async () => mocks.selections.shift() ?? null,
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: async (path: string) => {
    // Content URIs can't be checked on Android; the backend must not try.
    if (path.startsWith('content://')) throw new Error('exists() on a content URI');
    return mocks.files.has(path);
  },
  readTextFile: async (path: string) => {
    const contents = mocks.files.get(path);
    if (contents === undefined) throw new Error(`Missing file: ${path}`);
    return contents;
  },
  writeTextFile: async (path: string, contents: string) => {
    mocks.files.set(path, contents);
  },
}));

import { deviceBackend } from '../src/lib/storage/device';
import { BackupExistsError } from '../src/lib/storage/errors';

const APP = { kind: 'app' } as const;

beforeEach(() => {
  mocks.files.clear();
  mocks.copies.length = 0;
  mocks.selections.length = 0;
  mocks.android = false;
  mocks.failWrites = false;
});

describe('device storage (desktop and Android)', () => {
  it('keeps one diary, drafts and settings in the private data directory', async () => {
    expect(await deviceBackend.getRememberedVault()).toBeNull();

    await deviceBackend.writeVault(APP, 'BEGIN:VCALENDAR');
    await deviceBackend.setItem('drafts', 'drafts', ['private']);

    expect([...mocks.files.keys()].sort()).toEqual([
      `${DATA_DIR}/diary.vault`,
      `${DATA_DIR}/drafts.json`,
    ]);
    expect(await deviceBackend.getRememberedVault()).toEqual(APP);
    expect(await deviceBackend.readVault(APP)).toBe('BEGIN:VCALENDAR');
    expect(await deviceBackend.getItem('drafts', 'drafts')).toEqual(['private']);
  });

  it('keeps the replaced version of the diary, but not of settings', async () => {
    await deviceBackend.writeVault(APP, 'v1');
    await deviceBackend.writeVault(APP, 'v2');
    await deviceBackend.setItem('settings', 'weekStart', 0);
    await deviceBackend.setItem('settings', 'weekStart', 1);
    expect(mocks.copies).toEqual(['v1']);

    await deviceBackend.discardVaultCopies();
    expect(mocks.copies).toEqual([]);
    expect(await deviceBackend.readVault(APP)).toBe('v2');
  });

  it('surfaces a failed write instead of losing it', async () => {
    await deviceBackend.writeVault(APP, 'v1');
    mocks.failWrites = true;
    await expect(deviceBackend.writeVault(APP, 'v2')).rejects.toThrow('disk full');
    expect(await deviceBackend.readVault(APP)).toBe('v1');
  });

  it('erases the diary and its copies when it is deleted', async () => {
    await deviceBackend.writeVault(APP, 'v1');
    await deviceBackend.writeVault(APP, 'v2');
    await deviceBackend.forgetVault(APP);
    expect(await deviceBackend.vaultExists(APP)).toBe(false);
    expect(await deviceBackend.getRememberedVault()).toBeNull();
    expect(mocks.copies).toEqual([]);
  });

  it('imports and exports through desktop pickers, never overwriting a file', async () => {
    mocks.files.set('/home/oli/old.ics', 'BEGIN:VCALENDAR\nOLD');
    mocks.selections.push('/home/oli/old.ics');
    expect(await deviceBackend.pickDiaryText()).toBe('BEGIN:VCALENDAR\nOLD');
    expect(mocks.openOptions.at(-1)).toMatchObject({ filters: [{ extensions: ['ics', 'icarus'] }] });

    mocks.selections.push('/home/oli/old.ics');
    await expect(deviceBackend.saveBackup('BACKUP', 'old.ics')).rejects.toBeInstanceOf(BackupExistsError);
    expect(mocks.files.get('/home/oli/old.ics')).toBe('BEGIN:VCALENDAR\nOLD');

    mocks.files.set('/home/oli/dropped.ics', 'DROPPED');
    expect(await deviceBackend.readDroppedPath('/home/oli/dropped.ics')).toBe('DROPPED');
  });

  it('imports and exports through Android content URIs', async () => {
    mocks.android = true;
    mocks.files.set('content://downloads/old.ics', 'BEGIN:VCALENDAR\nOLD');
    mocks.selections.push('content://downloads/old.ics');
    expect(await deviceBackend.pickDiaryText()).toBe('BEGIN:VCALENDAR\nOLD');
    // Android's picker would drop the `.icarus` extension and hide encrypted backups.
    expect(mocks.openOptions.at(-1)).toMatchObject({ filters: undefined });

    mocks.selections.push('content://documents/backup.ics');
    expect(await deviceBackend.saveBackup('BACKUP', 'icarus-diary-backup.ics')).toBe(true);
    expect(mocks.files.get('content://documents/backup.ics')).toBe('BACKUP');

    expect(await deviceBackend.saveBackup('BACKUP', 'icarus-diary-backup.ics')).toBe(false);
  });
});
