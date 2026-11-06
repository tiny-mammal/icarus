import { describe, expect, it } from 'vitest';
import { CorruptVaultError, createVaultKeys, isEncryptedVault, type Argon2Params } from '../src/lib/crypto/vault';
import { withEncryption } from '../src/lib/storage/encrypted';
import { VaultLockedError } from '../src/lib/storage/errors';
import { createMemoryBackend } from '../src/lib/storage/memory';
import type { StorageBackend, StoreName, VaultRef } from '../src/lib/storage/types';

const FAST: Argon2Params = { memoryKiB: 256, iterations: 1, parallelism: 1 };
const PASSWORD = 'correct horse battery';
const ICS = 'BEGIN:VCALENDAR\r\nSUMMARY:My secret day\r\nEND:VCALENDAR\r\n';
const DRAFTS = [{ id: 'd1', title: 'Half-written secret' }];

/**
 * A device-like backend: one diary file that keeps a copy of the version it
 * replaces, like the desktop and Android apps' daily copies.
 */
function deviceLikeBackend() {
  let vault: string | null = null;
  const copies: string[] = [];
  const items = new Map<string, unknown>();
  const id = (store: StoreName, key: string) => `${store}/${key}`;
  const backend: StorageBackend = {
    kind: 'device',
    getRememberedVault: async () => (vault === null ? null : APP),
    vaultExists: async () => vault !== null,
    readVault: async () => {
      if (vault === null) throw new Error('missing');
      return vault;
    },
    writeVault: async (_ref, contents) => {
      if (vault !== null) copies.push(vault);
      vault = contents;
    },
    forgetVault: async () => {
      vault = null;
      copies.length = 0;
    },
    discardVaultCopies: async () => void (copies.length = 0),
    pickDiaryText: async () => null,
    readDroppedPath: async () => null,
    saveBackup: async () => false,
    getItem: async <T>(store: StoreName, key: string) => (items.get(id(store, key)) as T) ?? null,
    setItem: async (store, key, value) => void items.set(id(store, key), structuredClone(value)),
    removeItem: async (store, key) => void items.delete(id(store, key)),
  };
  return { backend, items, copies, vault: () => vault };
}

const APP: VaultRef = { kind: 'app' };

async function encryptedDevice() {
  const device = deviceLikeBackend();
  const storage = withEncryption(device.backend);
  await storage.writeVault(APP, ICS);
  await storage.writeVault(APP, ICS);
  await storage.setItem('drafts', 'drafts', DRAFTS);
  await storage.setItem('settings', 'spellWords', ['Ícaro']);
  await storage.setItem('settings', 'weekStart', 0);
  const { keys, recoveryKey } = await createVaultKeys(PASSWORD, FAST);
  await storage.encryption.enable(APP, ICS, keys);
  return { ...device, storage, keys, recoveryKey };
}

describe('encrypted storage', () => {
  it('seals the diary and every private item, and drops readable copies', async () => {
    const { items, copies, vault, storage } = await encryptedDevice();

    expect(isEncryptedVault(vault()!)).toBe(true);
    expect(copies).toEqual([]);
    const atRest = JSON.stringify([vault(), ...items.values()]);
    expect(atRest).not.toContain('secret');
    expect(atRest).not.toContain('Ícaro');
    // Preferences stay readable for the lock screen.
    expect(items.get('settings/weekStart')).toBe(0);

    expect(await storage.readVault(APP)).toBe(ICS);
    expect(await storage.getItem('drafts', 'drafts')).toEqual(DRAFTS);
  });

  it('refuses to read anything private once locked', async () => {
    const { storage, recoveryKey } = await encryptedDevice();
    storage.encryption.lock();

    await expect(storage.readVault(APP)).rejects.toBeInstanceOf(VaultLockedError);
    await expect(storage.getItem('drafts', 'drafts')).rejects.toBeInstanceOf(VaultLockedError);
    expect(await storage.getItem('settings', 'weekStart')).toBe(0);
    // A late write cannot slip private data out in plain text.
    await expect(storage.setItem('drafts', 'drafts', ['leak'])).rejects.toBeInstanceOf(VaultLockedError);
    await storage.setItem('settings', 'weekStart', 1);

    await storage.encryption.unlock(APP, { recoveryKey });
    expect(await storage.readVault(APP)).toBe(ICS);
    expect(await storage.getItem('settings', 'spellWords')).toEqual(['Ícaro']);
  });

  it('drops copies that the previous password would still open', async () => {
    const { copies, storage, keys } = await encryptedDevice();
    await storage.writeVault(APP, ICS);
    expect(copies).toHaveLength(1);
    await storage.encryption.rekey(APP, ICS, keys);
    expect(copies).toEqual([]);
  });

  it('reports copies it could not erase and retries until they are gone', async () => {
    const device = deviceLikeBackend();
    let failures = 1;
    const backend: StorageBackend = {
      ...device.backend,
      discardVaultCopies: async () => {
        if (failures-- > 0) throw new Error('read-only backups');
        await device.backend.discardVaultCopies();
      },
    };
    const storage = withEncryption(backend);
    await storage.writeVault(APP, ICS);
    await storage.writeVault(APP, ICS);
    const { keys } = await createVaultKeys(PASSWORD, FAST);
    await storage.encryption.enable(APP, ICS, keys);

    // Readable copies remain, and that is reported and remembered.
    expect(storage.encryption.copiesRemain()).toBe(true);
    expect(device.copies.some((copy) => !isEncryptedVault(copy))).toBe(true);
    expect(device.items.get('settings/copiesToErase')).toBe(true);

    // After a restart, the unlock retries and clears the record.
    const restarted = withEncryption(backend);
    await restarted.encryption.unlock(APP, { password: PASSWORD });
    expect(restarted.encryption.copiesRemain()).toBe(false);
    expect(device.copies).toEqual([]);
    expect(device.items.has('settings/copiesToErase')).toBe(false);
  });

  it('removes encryption only with the right password', async () => {
    const { items, vault, storage } = await encryptedDevice();
    await expect(storage.encryption.disable(APP, ICS, 'nope nope nope')).rejects.toThrow();
    expect(isEncryptedVault(vault()!)).toBe(true);

    await storage.encryption.disable(APP, ICS, PASSWORD);
    expect(vault()).toBe(ICS);
    expect(items.get('drafts/drafts')).toEqual(DRAFTS);
    expect(storage.encryption.isUnlocked()).toBe(false);
  });

  it('fails loudly, keeping the plain session, when a write does not read back', async () => {
    const { backend } = deviceLikeBackend();
    const storage = withEncryption({ ...backend, readVault: async () => 'truncated' });
    const { keys } = await createVaultKeys(PASSWORD, FAST);
    await expect(storage.encryption.enable(APP, ICS, keys)).rejects.toBeInstanceOf(CorruptVaultError);
    expect(storage.encryption.isUnlocked()).toBe(false);
  });

  it('encrypts the single browser slot in place', async () => {
    const storage = withEncryption(createMemoryBackend(ICS, { kind: 'browser' } as StorageBackend));
    const ref: VaultRef = { kind: 'app' };
    const { keys } = await createVaultKeys(PASSWORD, FAST);
    await storage.encryption.enable(ref, ICS, keys);
    storage.encryption.lock();
    await expect(storage.readVault(ref)).rejects.toBeInstanceOf(VaultLockedError);
    await storage.encryption.unlock(ref, { password: PASSWORD });
    expect(await storage.readVault(ref)).toBe(ICS);
  });
});
