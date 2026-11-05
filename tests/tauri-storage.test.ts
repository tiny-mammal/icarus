import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  files: new Map<string, string>(),
  selections: [] as (string | null)[],
  writes: [] as string[],
  failWrites: new Set<string>(),
  // Stands in for the record `src-tauri/src/remembered.rs` keeps on the computer.
  rememberedFolder: null as string | null,
  failRemember: false,
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: async (command: string, args?: { folder: string | null }) => {
    if (command === 'remembered_folder') return mocks.rememberedFolder;
    if (command === 'set_remembered_folder') {
      if (mocks.failRemember) throw new Error('Config directory is read-only');
      mocks.rememberedFolder = args!.folder;
      return null;
    }
    throw new Error(`Unexpected command: ${command}`);
  },
}));

vi.mock('@tauri-apps/api/path', () => ({
  join: async (...parts: string[]) => parts.join('/').replace(/\/+/, '/'),
  dirname: async (path: string) => path.slice(0, path.lastIndexOf('/')),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: async () => mocks.selections.shift() ?? null,
  save: async () => mocks.selections.shift() ?? null,
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: async (path: string) => mocks.files.has(path),
  readTextFile: async (path: string) => {
    const contents = mocks.files.get(path);
    if (contents === undefined) throw new Error(`Missing file: ${path}`);
    return contents;
  },
  writeTextFile: async (path: string, contents: string) => {
    if (mocks.failWrites.has(path)) throw new Error('Drive disconnected');
    mocks.writes.push(path);
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

import { tauriBackend } from '../src/lib/storage/tauri';

beforeEach(async () => {
  mocks.failRemember = false;
  await tauriBackend.rememberVault(null);
  mocks.files.clear();
  mocks.selections.length = 0;
  mocks.writes.length = 0;
  mocks.failWrites.clear();
  mocks.rememberedFolder = null;
  mocks.failRemember = false;
});

describe('desktop diary folder', () => {
  it('writes the diary, drafts and settings only in the selected folder', async () => {
    await expect(tauriBackend.setItem('drafts', 'drafts', ['private']))
      .rejects.toThrow('Choose a diary folder first');
    expect(await tauriBackend.getRememberedVault()).toBeNull();

    mocks.selections.push('/usb/Journal');
    const ref = await tauriBackend.pickVaultLocation();
    expect(ref).toEqual({ kind: 'file', path: '/usb/Journal/diary.ics' });
    await tauriBackend.rememberVault(ref);
    await tauriBackend.writeVault(ref!, 'BEGIN:VCALENDAR');
    await tauriBackend.setItem('drafts', 'drafts', ['private']);
    await tauriBackend.setItem('settings', 'weekStart', 1);

    expect([...mocks.files.keys()].sort()).toEqual([
      '/usb/Journal/diary.ics',
      '/usb/Journal/drafts.json',
      '/usb/Journal/settings.json',
    ]);
    expect(mocks.writes.every((path) => path.startsWith('/usb/Journal/'))).toBe(true);
    expect(await tauriBackend.getItem('drafts', 'drafts')).toEqual(['private']);
  });

  it('reopens the last folder on launch, preferring its encrypted diary', async () => {
    await tauriBackend.rememberVault({ kind: 'file', path: '/usb/Journal/diary.ics' });
    expect(mocks.rememberedFolder).toBe('/usb/Journal');

    // A later launch, with the diary encrypted in the meantime.
    await tauriBackend.rememberVault(null);
    mocks.rememberedFolder = '/usb/Journal';
    mocks.files.set('/usb/Journal/diary.icarus', '{"format":"icarus-encrypted-diary"}');
    mocks.files.set('/usb/Journal/settings.json', '{"autoLockMinutes":5}');
    expect(await tauriBackend.getRememberedVault()).toEqual({
      kind: 'file',
      path: '/usb/Journal/diary.icarus',
    });
    // Its settings are readable before the lock screen asks for the password.
    expect(await tauriBackend.getItem('settings', 'autoLockMinutes')).toBe(5);
  });

  it('keeps nothing on the computer when the folder opts out or is closed', async () => {
    const ref = { kind: 'file' as const, path: '/usb/Journal/diary.ics' };
    await tauriBackend.rememberVault(ref);
    await tauriBackend.setItem('settings', 'rememberFolder', false);
    await tauriBackend.rememberVault(ref);
    expect(mocks.rememberedFolder).toBeNull();

    await tauriBackend.setItem('settings', 'rememberFolder', true);
    await tauriBackend.rememberVault(ref);
    expect(mocks.rememberedFolder).toBe('/usb/Journal');
    await tauriBackend.rememberVault(null);
    expect(mocks.rememberedFolder).toBeNull();
  });

  it('reports a record that cannot be erased, and honours an opt-out on launch', async () => {
    const ref = { kind: 'file' as const, path: '/usb/Journal/diary.ics' };
    await tauriBackend.rememberVault(ref);
    await tauriBackend.setItem('settings', 'rememberFolder', false);
    mocks.failRemember = true;
    await expect(tauriBackend.rememberVault(ref)).rejects.toThrow('read-only');
    await expect(tauriBackend.rememberVault(null)).rejects.toThrow('read-only');

    // The record survived, but the folder's opt-out wins on the next launch.
    await tauriBackend.rememberVault(null).catch(() => undefined);
    mocks.rememberedFolder = '/usb/Journal';
    expect(await tauriBackend.getRememberedVault()).toBeNull();
  });

  it('still opens the folder when the computer refuses the record', async () => {
    mocks.failRemember = true;
    const ref = { kind: 'file' as const, path: '/usb/Journal/diary.ics' };
    await expect(tauriBackend.rememberVault(ref)).resolves.toBeUndefined();
    await tauriBackend.setItem('settings', 'weekStart', 0);
    expect(mocks.files.has('/usb/Journal/settings.json')).toBe(true);
  });

  it('keeps preferences separate when the user switches folders', async () => {
    await tauriBackend.rememberVault({ kind: 'file', path: '/first/diary.ics' });
    await tauriBackend.setItem('settings', 'spellcheck', false);
    await tauriBackend.rememberVault({ kind: 'file', path: '/second/diary.ics' });
    expect(await tauriBackend.getItem('settings', 'spellcheck')).toBeNull();
    await tauriBackend.rememberVault({ kind: 'file', path: '/first/diary.ics' });
    expect(await tauriBackend.getItem('settings', 'spellcheck')).toBe(false);
  });

  it('serializes settings updates and reports an unavailable drive', async () => {
    const ref = { kind: 'file' as const, path: '/usb/Journal/diary.ics' };
    await tauriBackend.rememberVault(ref);
    await Promise.all([
      tauriBackend.setItem('settings', 'weekStart', 0),
      tauriBackend.setItem('settings', 'spellcheck', false),
    ]);
    expect(JSON.parse(mocks.files.get('/usb/Journal/settings.json')!)).toEqual({
      weekStart: 0,
      spellcheck: false,
    });

    mocks.failWrites.add('/usb/Journal/diary.ics.tmp');
    await expect(tauriBackend.writeVault(ref, 'new entry'))
      .rejects.toThrow('Drive disconnected');
    expect(mocks.files.has('/usb/Journal/diary.ics.tmp')).toBe(false);
  });

  it('does not replace an existing diary during import', async () => {
    mocks.files.set('/source/old.ics', 'existing diary');
    mocks.files.set('/target/diary.ics', 'keep this diary');
    mocks.selections.push('/source/old.ics', '/target');
    await expect(tauriBackend.pickDiaryText()).rejects.toThrow('already contains');
    expect(mocks.files.get('/target/diary.ics')).toBe('keep this diary');
  });

  it('does not overwrite an existing backup during export', async () => {
    mocks.files.set('/backup/previous.ics', 'previous backup');
    mocks.selections.push('/backup/previous.ics');
    await expect(tauriBackend.saveBackup('new backup', 'backup.ics'))
      .rejects.toThrow('new filename');
    expect(mocks.files.get('/backup/previous.ics')).toBe('previous backup');
  });

  it('exports a backup to a fresh filename', async () => {
    mocks.selections.push('/backup/new.ics');
    await expect(tauriBackend.saveBackup('diary content', 'backup.ics')).resolves.toBe(true);
    expect(mocks.files.get('/backup/new.ics')).toBe('diary content');
  });

  it('opens the encrypted diary of a folder in preference to a plain one', async () => {
    mocks.files.set('/usb/Journal/diary.icarus', '{"format":"icarus-encrypted-diary"}');
    mocks.selections.push('/usb/Journal');
    expect(await tauriBackend.pickVaultLocation()).toEqual({
      kind: 'file',
      path: '/usb/Journal/diary.icarus',
    });
  });

  it('imports an encrypted backup as diary.icarus and refuses folders with any diary', async () => {
    mocks.files.set('/backup/old.icarus', '{"format":"icarus-encrypted-diary"}');
    mocks.selections.push('/backup/old.icarus', '/target');
    expect((await tauriBackend.pickDiaryText())?.ref).toEqual({
      kind: 'file',
      path: '/target/diary.icarus',
    });

    mocks.files.set('/other/diary.icarus', 'existing');
    mocks.selections.push('/backup/old.icarus', '/other');
    await expect(tauriBackend.pickDiaryText()).rejects.toThrow('already contains');
  });

  it('swaps between plain and encrypted siblings inside the selected folder only', async () => {
    const plain = { kind: 'file' as const, path: '/usb/Journal/diary.ics' };
    await tauriBackend.rememberVault(plain);
    const encrypted = await tauriBackend.siblingVault(plain, true);
    expect(encrypted).toEqual({ kind: 'file', path: '/usb/Journal/diary.icarus' });
    mocks.files.set(plain.path, 'plain');
    await tauriBackend.removeSupersededVault(plain);
    expect(mocks.files.has(plain.path)).toBe(false);
    await expect(tauriBackend.removeSupersededVault({ kind: 'file', path: '/elsewhere/diary.ics' }))
      .rejects.toThrow('inside the selected folder');
  });
});
