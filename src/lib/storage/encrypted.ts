/**
 * Transparent at-rest encryption over any `StorageBackend`.
 *
 * While an encrypted vault is unlocked, its key lives only in this module's
 * session (memory). Reads decrypt and writes encrypt the diary and every
 * private item (drafts, personal dictionary); backends only ever see
 * ciphertext. Without a session, encrypted data cannot be read at all: reads
 * throw `VaultLockedError` and the app shows the lock screen.
 *
 * The session is bound to one vault ref, so the diary of another folder can
 * never be sealed with this diary's key. Switching vaults keeps the session
 * until the app calls `keepSessionFor` with the new vault, so a failed switch
 * can fall back to the still-unlocked previous diary.
 */
import {
  CorruptVaultError,
  decryptVaultText,
  encryptVaultText,
  isEncryptedVault,
  isSealedValue,
  openValue,
  parseEncryptedVault,
  sealValue,
  unlockWithPassword,
  unlockWithRecoveryKey,
  type VaultKeys,
} from '../crypto/vault';
import { VaultLockedError } from './errors';
import {
  PRIVATE_ITEMS,
  isPrivateItem,
  sameVault,
  type StorageBackend,
  type StoreItem,
  type StoreName,
  type VaultRef,
} from './types';

export type UnlockSecret = { password: string } | { recoveryKey: string };

export interface VaultEncryption {
  /** Whether an encrypted vault (or specifically `ref`) is unlocked. */
  isUnlocked(ref?: VaultRef): boolean;
  /**
   * Forget the key unless it belongs to `ref`, the vault now in use (null:
   * none). Unlike `lock`, this declares the encrypted diary closed, so private
   * items may be written in plain text again (for a plain diary).
   */
  keepSessionFor(ref: VaultRef | null): void;
  /** Open the vault's keyring with a password or recovery key. */
  unlock(ref: VaultRef, secret: UnlockSecret): Promise<void>;
  /**
   * Forget the key. Encrypted data becomes unreadable, and private items
   * cannot be written, until the diary is unlocked again.
   */
  lock(): void;
  /** Throws `WrongSecretError` unless `password` opens the unlocked vault. */
  verifyPassword(password: string): Promise<void>;
  /** The unlocked keys, for rewrapping them (password / recovery changes). */
  currentKeys(): VaultKeys;
  /**
   * Encrypt a plain (or not yet written) vault with `keys`: write and verify
   * the encrypted copy, seal private items, then delete any plain file.
   * Returns the new ref, which becomes the remembered vault.
   */
  enable(ref: VaultRef, ics: string, keys: VaultKeys): Promise<VaultRef>;
  /** The reverse of `enable`, once `password` is verified. Returns the new ref. */
  disable(ref: VaultRef, ics: string, password: string): Promise<VaultRef>;
  /** Rewrite the unlocked vault under rewrapped `keys` (same master key). */
  rekey(ref: VaultRef, ics: string, keys: VaultKeys): Promise<void>;
  /** An encrypted backup of `ics`, openable with the same password. */
  exportEncrypted(ics: string): Promise<string>;
  /** Store an already-encrypted diary file as-is (import); it stays locked. */
  storeEncrypted(ref: VaultRef, text: string): Promise<void>;
}

export interface SecureStorage extends StorageBackend {
  readonly encryption: VaultEncryption;
}

interface Session {
  ref: VaultRef;
  keys: VaultKeys;
}

const itemPurpose = (store: StoreName, key: string) => `${store}/${key}`;

export function withEncryption(base: StorageBackend): SecureStorage {
  let session: Session | null = null;
  // Set while an encrypted diary is locked: private writes must not fall back
  // to plain text just because the key is gone.
  let locked = false;

  const setSession = (next: Session | null, stillLocked = false) => {
    session = next;
    locked = stillLocked;
  };

  const sessionFor = (ref: VaultRef): Session | null =>
    session && sameVault(session.ref, ref) ? session : null;

  const requireSession = (): Session => {
    if (!session) throw new VaultLockedError();
    return session;
  };

  async function readPrivateItems(): Promise<Map<StoreItem, unknown>> {
    const values = new Map<StoreItem, unknown>();
    for (const item of PRIVATE_ITEMS) {
      values.set(item, await storage.getItem(item.store, item.key));
    }
    return values;
  }

  async function writePrivateItems(values: Map<StoreItem, unknown>): Promise<void> {
    for (const [item, value] of values) {
      if (value !== null) await storage.setItem(item.store, item.key, value);
    }
  }

  /**
   * Make the vault that replaces `from` current and write `contents` to it.
   * The contents are proven to decode before anything is written, and read
   * back afterwards; a refused sibling (e.g. a leftover file) or a failed check
   * leaves `from` untouched. `from` may not exist yet (a brand-new diary).
   */
  async function writeSibling(
    from: VaultRef,
    encrypted: boolean,
    contents: string,
    decodes: (contents: string) => Promise<boolean>,
  ): Promise<VaultRef> {
    if (!(await decodes(contents))) {
      throw new CorruptVaultError('The rewritten diary could not be verified');
    }
    const target = await base.siblingVault(from, encrypted);
    const replacesInPlace = sameVault(target, from);
    if (!replacesInPlace && (await base.vaultExists(target))) {
      throw new Error('The diary folder already contains a diary in the other format');
    }
    await base.rememberVault(target);
    await base.writeVault(target, contents);
    if ((await base.readVault(target)) !== contents) {
      if (!replacesInPlace) await base.removeSupersededVault(target);
      throw new CorruptVaultError('The rewritten diary could not be verified');
    }
    return target;
  }

  const encryption: VaultEncryption = {
    isUnlocked: (ref) => (ref ? sessionFor(ref) !== null : session !== null),

    keepSessionFor(ref) {
      if (!ref || !sessionFor(ref)) setSession(null);
    },

    async unlock(ref, secret) {
      const { keyring } = parseEncryptedVault(await base.readVault(ref));
      const keys = 'password' in secret
        ? await unlockWithPassword(keyring, secret.password)
        : await unlockWithRecoveryKey(keyring, secret.recoveryKey);
      setSession({ ref, keys });
    },

    lock() {
      setSession(null, true);
    },

    async verifyPassword(password) {
      await unlockWithPassword(requireSession().keys.keyring, password);
    },

    currentKeys: () => requireSession().keys,

    async enable(ref, ics, keys) {
      if (sessionFor(ref)) throw new Error('The diary is already encrypted');
      const target = await writeSibling(
        ref,
        true,
        await encryptVaultText(keys, ics),
        async (sealed) => (await decryptVaultText(keys, sealed)) === ics,
      );
      // Items of the target's folder, read before they are sealed.
      const items = await readPrivateItems();
      setSession({ ref: target, keys });
      await writePrivateItems(items);
      if (!sameVault(target, ref)) await base.removeSupersededVault(ref);
      return target;
    },

    async disable(ref, ics, password) {
      await encryption.verifyPassword(password);
      const target = await writeSibling(ref, false, ics, async () => true);
      const items = await readPrivateItems();
      setSession(null);
      await writePrivateItems(items);
      if (!sameVault(target, ref)) await base.removeSupersededVault(ref);
      return target;
    },

    async rekey(ref, ics, keys) {
      if (!sessionFor(ref)) throw new VaultLockedError();
      await base.writeVault(ref, await encryptVaultText(keys, ics));
      setSession({ ref, keys });
    },

    async exportEncrypted(ics) {
      return encryptVaultText(requireSession().keys, ics);
    },

    async storeEncrypted(ref, text) {
      parseEncryptedVault(text);
      await base.writeVault(ref, text);
    },
  };

  const storage: SecureStorage = {
    ...base,
    encryption,

    async forgetVault(ref) {
      if (sessionFor(ref)) setSession(null);
      await base.forgetVault(ref);
    },

    async readVault(ref) {
      const text = await base.readVault(ref);
      if (!isEncryptedVault(text)) return text;
      const active = sessionFor(ref);
      if (!active) throw new VaultLockedError();
      return decryptVaultText(active.keys, text);
    },

    async writeVault(ref, contents) {
      const active = sessionFor(ref);
      await base.writeVault(ref, active ? await encryptVaultText(active.keys, contents) : contents);
    },

    async getItem<T>(store: StoreName, key: string) {
      const value = await base.getItem<unknown>(store, key);
      if (!isSealedValue(value)) return value as T | null;
      if (!session) throw new VaultLockedError();
      return openValue<T>(session.keys, itemPurpose(store, key), value);
    },

    async setItem<T>(store: StoreName, key: string, value: T) {
      if (!isPrivateItem(store, key)) return base.setItem(store, key, value);
      if (locked) throw new VaultLockedError();
      await base.setItem(
        store,
        key,
        session ? await sealValue(session.keys, itemPurpose(store, key), value) : value,
      );
    },
  };

  return storage;
}
