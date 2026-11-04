// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeIcs } from '../src/lib/ical';

const backup = vi.hoisted(() => ({
  saved: [] as { contents: string; name: string }[],
  storage: null as unknown as object,
  memory: null as unknown as import('../src/lib/storage/types').StorageBackend,
}));

// The real encryption layer over an in-memory browser vault, rebuilt for each
// test (the mock factory itself is only evaluated once).
vi.mock('../src/lib/storage', async () => {
  const types = await import('../src/lib/storage/types');
  const storage = new Proxy({}, {
    get: (_target, prop) => Reflect.get(backup.storage, prop),
  });
  return { ...types, storage };
});

async function freshStorage() {
  const { withEncryption } = await import('../src/lib/storage/encrypted');
  const { createMemoryBackend } = await import('../src/lib/storage/memory');
  const base = {
    kind: 'browser',
    saveBackup: async (contents: string, name: string) => {
      backup.saved.push({ contents, name });
      return true;
    },
    pickDiaryText: async () => ({
      ref: { kind: 'app' },
      text: serializeIcs([{ uid: 'i1', title: 'Imported secret', content: 'Hush', date: new Date(2026, 5, 8) }]),
    }),
  } as unknown as import('../src/lib/storage/types').StorageBackend;
  backup.memory = createMemoryBackend(
    serializeIcs([{ uid: 'e1', title: 'First entry', content: 'Something private', date: new Date(2026, 9, 1) }]),
    base,
  );
  backup.storage = withEncryption(backup.memory);
}

/** A page reload: fresh modules and no key in memory, same stored data. */
async function reload() {
  vi.resetModules();
  const { withEncryption } = await import('../src/lib/storage/encrypted');
  backup.storage = withEncryption(backup.memory);
}
vi.mock('../src/lib/log', () => ({ devError: vi.fn() }));

const PASSWORD = 'correct horse battery';

beforeEach(async () => {
  vi.resetModules();
  await freshStorage();
  vi.stubGlobal('$state', (value: unknown) => value);
  vi.stubGlobal('$derived', Object.assign((value: unknown) => value, {
    by: (compute: () => unknown) => compute(),
  }));
  backup.saved.length = 0;
});

async function encryptedApp() {
  const { app } = await import('../src/lib/store.svelte');
  await app.init();
  expect(app.view).toBe('main');
  const recoveryKey = await app.prepareEncryption(PASSWORD);
  expect(await app.confirmEncryption()).toBe(true);
  expect(app.encrypted).toBe(true);
  return { app, recoveryKey };
}

describe('encrypted diary flow', () => {
  it('locks, clears memory, and unlocks with the password', async () => {
    const { app } = await encryptedApp();
    app.draftTitle = 'Unsaved thought';
    app.editing = true;

    expect(await app.lock()).toBe(true);
    expect(app.view).toBe('locked');
    expect(app.entries).toEqual([]);
    expect(app.drafts).toEqual([]);
    expect(app.draftTitle).toBe('');
    expect(app.vault).toBeNull();

    expect(await app.unlock({ password: 'not the password' })).toBe('wrong-secret');
    expect(app.view).toBe('locked');

    expect(await app.unlock({ password: PASSWORD })).toBe('ok');
    expect(app.view).toBe('main');
    expect(app.entries.map((entry) => entry.title)).toEqual(['First entry']);
    // The in-progress draft was saved (encrypted) before locking.
    expect(app.drafts.map((draft) => draft.title)).toEqual(['Unsaved thought']);
  });

  it('boots straight to the lock screen', async () => {
    await encryptedApp();
    await reload();
    const { app } = await import('../src/lib/store.svelte');
    await app.init();
    expect(app.view).toBe('locked');
    expect(app.lockedVault).toEqual({ kind: 'app' });
    expect(app.entries).toEqual([]);
    expect(await app.unlock({ password: PASSWORD })).toBe('ok');
    expect(app.entries).toHaveLength(1);
  });

  it('resets a forgotten password with the recovery key', async () => {
    const { app, recoveryKey } = await encryptedApp();
    await app.lock();

    expect(await app.unlock({ recoveryKey }, 'a brand new password')).toBe('ok');
    await app.lock();
    expect(await app.unlock({ password: PASSWORD })).toBe('wrong-secret');
    expect(await app.unlock({ password: 'a brand new password' })).toBe('ok');
  });

  it('gates password changes, recovery keys and removal on the current password', async () => {
    const { app, recoveryKey } = await encryptedApp();

    expect(await app.changePassword('wrong password', 'another password')).toBe('wrong-secret');
    expect(await app.changePassword(PASSWORD, 'another password')).toBe('ok');

    const prepared = await app.prepareRecoveryKey('another password');
    expect(prepared.result).toBe('ok');
    expect(await app.confirmRecoveryKey()).toBe(true);
    await app.lock();
    expect(await app.unlock({ recoveryKey }, 'whatever password')).toBe('wrong-secret');
    expect(await app.unlock({ recoveryKey: prepared.recoveryKey! }, 'final password!')).toBe('ok');

    expect(await app.disableEncryption('another password')).toBe('wrong-secret');
    expect(await app.disableEncryption('final password!')).toBe('ok');
    expect(app.encrypted).toBe(false);
    expect(await app.lock()).toBe(false);
  });

  it('exports encrypted by default and plain only on request', async () => {
    const { app } = await encryptedApp();
    await app.exportVault();
    await app.exportVault('plain');

    expect(backup.saved.map((b) => b.name)).toEqual([
      'icarus-diary-backup.icarus',
      'icarus-diary-backup.ics',
    ]);
    expect(backup.saved[0].contents).not.toContain('First entry');
    expect(backup.saved[1].contents).toBe(serializeIcs(app.entries));
  });

  it('asks before writing an import, then stores it encrypted from the start', async () => {
    const { app } = await import('../src/lib/store.svelte');
    await app.init();
    const before = await backup.memory.readVault({ kind: 'app' });

    await app.importVault();
    expect(app.pendingDiary?.source).toBe('import');
    expect(app.encryptionSetupOpen).toBe(true);
    expect(await backup.memory.readVault({ kind: 'app' })).toBe(before);

    await app.prepareEncryption(PASSWORD);
    expect(await app.confirmEncryption()).toBe(true);
    expect(app.pendingDiary).toBeNull();
    expect(app.encrypted).toBe(true);
    expect(app.entries.map((entry) => entry.title)).toEqual(['Imported secret']);
    expect(await backup.memory.readVault({ kind: 'app' })).not.toContain('Imported secret');
  });

  it('imports in plain text only when the user declines protection', async () => {
    const { app } = await import('../src/lib/store.svelte');
    await app.init();

    await app.importVault();
    app.cancelPendingDiary();
    expect(app.entries.map((entry) => entry.title)).toEqual(['First entry']);

    await app.importVault();
    expect(await app.keepPendingDiaryPlain()).toBe(true);
    expect(app.encrypted).toBe(false);
    expect(app.encryptionSetupOpen).toBe(false);
    expect(await backup.memory.readVault({ kind: 'app' })).toContain('Imported secret');
  });

  it('keeps an encrypted browser diary encrypted when importing into it', async () => {
    const { app } = await encryptedApp();
    await app.importVault();
    expect(app.pendingDiary).toBeNull();
    expect(app.encrypted).toBe(true);
    expect(app.entries.map((entry) => entry.title)).toEqual(['Imported secret']);
    expect(await backup.memory.readVault({ kind: 'app' })).not.toContain('Imported secret');
  });
});
