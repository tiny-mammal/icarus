import { describe, expect, it } from 'vitest';
import { createVaultKeys, isEncryptedVault, type Argon2Params } from '../src/lib/crypto/vault';
import { withEncryption } from '../src/lib/storage/encrypted';
import { VaultLockedError } from '../src/lib/storage/errors';
import { createMemoryBackend } from '../src/lib/storage/memory';
import type { StorageBackend, StoreName, VaultRef } from '../src/lib/storage/types';

const FAST: Argon2Params = { memoryKiB: 256, iterations: 1, parallelism: 1 };
const PASSWORD = 'correct horse battery';
const ICS = 'BEGIN:VCALENDAR\r\nSUMMARY:My secret day\r\nEND:VCALENDAR\r\n';
const DRAFTS = [{ id: 'd1', title: 'Half-written secret' }];

/** A folder-like backend that, like desktop, gives each format its own file. */
function folderBackend() {
  const files = new Map<string, string>();
  const items = new Map<string, unknown>();
  const id = (store: StoreName, key: string) => `${store}/${key}`;
  const path = (ref: VaultRef) => (ref.kind === 'file' ? ref.path : 'browser');
  const backend: StorageBackend = {
    kind: 'folder',
    getRememberedVault: async () => null,
    rememberVault: async () => {},
    vaultExists: async (ref) => files.has(path(ref)),
    readVault: async (ref) => {
      const text = files.get(path(ref));
      if (text === undefined) throw new Error('missing');
      return text;
    },
    writeVault: async (ref, contents) => void files.set(path(ref), contents),
    forgetVault: async () => {},
    siblingVault: async (_ref, encrypted) => ({
      kind: 'file',
      path: encrypted ? '/journal/diary.icarus' : '/journal/diary.ics',
    }),
    removeSupersededVault: async (ref) => void files.delete(path(ref)),
    pickVaultLocation: async () => null,
    pickDiaryText: async () => null,
    readDroppedPath: async () => null,
    saveBackup: async () => false,
    getItem: async <T>(store: StoreName, key: string) => (items.get(id(store, key)) as T) ?? null,
    setItem: async (store, key, value) => void items.set(id(store, key), structuredClone(value)),
    removeItem: async (store, key) => void items.delete(id(store, key)),
  };
  return { backend, files, items };
}

const PLAIN: VaultRef = { kind: 'file', path: '/journal/diary.ics' };
const ENCRYPTED: VaultRef = { kind: 'file', path: '/journal/diary.icarus' };

async function encryptedFolder() {
  const folder = folderBackend();
  const storage = withEncryption(folder.backend);
  await storage.writeVault(PLAIN, ICS);
  await storage.setItem('drafts', 'drafts', DRAFTS);
  await storage.setItem('settings', 'spellWords', ['Ícaro']);
  await storage.setItem('settings', 'weekStart', 0);
  const { keys, recoveryKey } = await createVaultKeys(PASSWORD, FAST);
  const ref = await storage.encryption.enable(PLAIN, ICS, keys);
  return { ...folder, storage, ref, recoveryKey };
}

describe('encrypted storage', () => {
  it('replaces the plain file and seals every private item', async () => {
    const { files, items, storage, ref } = await encryptedFolder();

    expect(ref).toEqual(ENCRYPTED);
    expect([...files.keys()]).toEqual(['/journal/diary.icarus']);
    expect(isEncryptedVault(files.get('/journal/diary.icarus')!)).toBe(true);
    const atRest = JSON.stringify([...files.values(), ...items.values()]);
    expect(atRest).not.toContain('secret');
    expect(atRest).not.toContain('Ícaro');
    // Preferences stay readable for the lock screen.
    expect(items.get('settings/weekStart')).toBe(0);

    expect(await storage.readVault(ref)).toBe(ICS);
    expect(await storage.getItem('drafts', 'drafts')).toEqual(DRAFTS);
  });

  it('refuses to read anything private once locked', async () => {
    const { storage, ref, recoveryKey } = await encryptedFolder();
    storage.encryption.lock();

    await expect(storage.readVault(ref)).rejects.toBeInstanceOf(VaultLockedError);
    await expect(storage.getItem('drafts', 'drafts')).rejects.toBeInstanceOf(VaultLockedError);
    expect(await storage.getItem('settings', 'weekStart')).toBe(0);
    // A late write cannot slip private data out in plain text.
    await expect(storage.setItem('drafts', 'drafts', ['leak'])).rejects.toBeInstanceOf(VaultLockedError);
    await storage.setItem('settings', 'weekStart', 1);

    await storage.encryption.unlock(ref, { recoveryKey });
    expect(await storage.readVault(ref)).toBe(ICS);
    expect(await storage.getItem('settings', 'spellWords')).toEqual(['Ícaro']);
  });

  it('keeps writes to another vault in plain text', async () => {
    const { files, storage } = await encryptedFolder();
    const other: VaultRef = { kind: 'file', path: '/other/diary.ics' };
    await storage.writeVault(other, ICS);
    expect(files.get('/other/diary.ics')).toBe(ICS);

    storage.encryption.keepSessionFor(other);
    expect(storage.encryption.isUnlocked()).toBe(false);
  });

  it('removes encryption only with the right password', async () => {
    const { files, items, storage, ref } = await encryptedFolder();
    await expect(storage.encryption.disable(ref, ICS, 'nope nope nope')).rejects.toThrow();
    expect(files.has('/journal/diary.icarus')).toBe(true);

    expect(await storage.encryption.disable(ref, ICS, PASSWORD)).toEqual(PLAIN);
    expect([...files.keys()]).toEqual(['/journal/diary.ics']);
    expect(files.get('/journal/diary.ics')).toBe(ICS);
    expect(items.get('drafts/drafts')).toEqual(DRAFTS);
    expect(storage.encryption.isUnlocked()).toBe(false);
  });

  it('never leaves the folder with two diaries or none', async () => {
    const { files, backend } = folderBackend();
    const storage = withEncryption(backend);
    files.set('/journal/diary.ics', ICS);
    files.set('/journal/diary.icarus', 'leftover');
    const { keys } = await createVaultKeys(PASSWORD, FAST);
    await expect(storage.encryption.enable(PLAIN, ICS, keys)).rejects.toThrow('already contains');
    expect(files.get('/journal/diary.ics')).toBe(ICS);
    expect(storage.encryption.isUnlocked()).toBe(false);
  });

  it('encrypts the single browser slot in place', async () => {
    const storage = withEncryption(createMemoryBackend(ICS, { kind: 'browser' } as StorageBackend));
    const ref: VaultRef = { kind: 'app' };
    const { keys } = await createVaultKeys(PASSWORD, FAST);
    expect(await storage.encryption.enable(ref, ICS, keys)).toEqual(ref);
    storage.encryption.lock();
    await expect(storage.readVault(ref)).rejects.toBeInstanceOf(VaultLockedError);
    await storage.encryption.unlock(ref, { password: PASSWORD });
    expect(await storage.readVault(ref)).toBe(ICS);
  });
});
