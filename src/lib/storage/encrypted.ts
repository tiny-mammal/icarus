/**
 * Transparent at-rest encryption over any `StorageBackend`.
 *
 * While an encrypted vault is unlocked, its key lives only in this module's
 * session (memory). Reads decrypt and writes encrypt the diary and every
 * private item (drafts, personal dictionary); backends only ever see
 * ciphertext. Without a session, encrypted data cannot be read at all: reads
 * throw `VaultLockedError` and the app shows the lock screen.
 *
 * The session is bound to the vault it unlocked, and ends when the app calls
 * `keepSessionFor` with another (or none).
 *
 * Backends may keep copies of earlier versions (see `discardVaultCopies`).
 * Those are erased whenever the key changes, so no copy stays readable without
 * the current password. An erase that fails is recorded and retried on every
 * unlock and save until it succeeds, and `copiesRemain` lets the UI say so.
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
import { devError } from '../log';
import { VaultLockedError } from './errors';
import {
  COPIES_TO_ERASE_ITEM,
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
  /**
   * Open the vault's keyring with a password or recovery key, then finish any
   * protection left pending: seal plain private items, erase stale copies.
   */
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
   * the encrypted diary, seal private items, then erase readable copies.
   */
  enable(ref: VaultRef, ics: string, keys: VaultKeys): Promise<void>;
  /** The reverse of `enable`, once `password` is verified. */
  disable(ref: VaultRef, ics: string, password: string): Promise<void>;
  /** Rewrite the unlocked vault under rewrapped `keys` (same master key). */
  rekey(ref: VaultRef, ics: string, keys: VaultKeys): Promise<void>;
  /** An encrypted backup of `ics`, openable with the same password. */
  exportEncrypted(ics: string): Promise<string>;
  /**
   * Store an already-encrypted diary file as-is (import); it stays locked.
   * Copies of the diary it replaces are erased.
   */
  storeEncrypted(ref: VaultRef, text: string): Promise<void>;
  /**
   * Whether copies made under an older key (or none) are still waiting to be
   * erased, because the last attempt failed.
   */
  copiesRemain(): boolean;
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
   * Replace the vault with `contents`, which are proven to decode before
   * anything is written and read back afterwards.
   */
  async function writeVerified(
    ref: VaultRef,
    contents: string,
    decodes: (contents: string) => Promise<boolean>,
  ): Promise<void> {
    if (!(await decodes(contents))) {
      throw new CorruptVaultError('The rewritten diary could not be verified');
    }
    await base.writeVault(ref, contents);
    if ((await base.readVault(ref)) !== contents) {
      throw new CorruptVaultError('The rewritten diary could not be verified');
    }
  }

  // Whether stale copies are known to remain; null until read from settings.
  let copiesToErase: boolean | null = null;
  const { store: ERASE_STORE, key: ERASE_KEY } = COPIES_TO_ERASE_ITEM;

  /**
   * Erase copies made under another key (or none). The diary itself is
   * already safe, so a failure does not undo that: it is recorded, reported
   * through `copiesRemain`, and retried on the next unlock or save.
   */
  async function discardCopies(): Promise<void> {
    try {
      await base.discardVaultCopies();
    } catch (err) {
      devError('discardCopies: could not erase earlier copies of the diary', err);
      copiesToErase = true;
      await base.setItem(ERASE_STORE, ERASE_KEY, true).catch((saveErr: unknown) => {
        devError('discardCopies: could not record the pending erase', saveErr);
      });
      return;
    }
    if (copiesToErase !== false) {
      copiesToErase = false;
      await base.removeItem(ERASE_STORE, ERASE_KEY).catch((clearErr: unknown) => {
        devError('discardCopies: could not clear the pending erase', clearErr);
      });
    }
  }

  /**
   * Seal private items still stored in plain text, e.g. drafts left by a plain
   * diary that an encrypted import replaced. Needs the session's key.
   */
  async function sealPlainPrivateItems(): Promise<void> {
    for (const item of PRIVATE_ITEMS) {
      const value = await base.getItem<unknown>(item.store, item.key);
      if (value !== null && !isSealedValue(value)) {
        await storage.setItem(item.store, item.key, value);
      }
    }
  }

  async function retryPendingDiscard(): Promise<void> {
    if (copiesToErase === null) {
      copiesToErase = (await base.getItem<boolean>(ERASE_STORE, ERASE_KEY).catch(() => null)) === true;
    }
    if (copiesToErase) await discardCopies();
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
      // Never lets a cleanup failure keep the user out of the diary; the next
      // unlock tries again.
      await sealPlainPrivateItems().catch((err: unknown) => {
        devError('unlock: could not seal plain private items', err);
      });
      await retryPendingDiscard();
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
      await writeVerified(
        ref,
        await encryptVaultText(keys, ics),
        async (sealed) => (await decryptVaultText(keys, sealed)) === ics,
      );
      // Read before they are sealed.
      const items = await readPrivateItems();
      setSession({ ref, keys });
      await writePrivateItems(items);
      await discardCopies();
    },

    async disable(ref, ics, password) {
      await encryption.verifyPassword(password);
      await writeVerified(ref, ics, async () => true);
      const items = await readPrivateItems();
      setSession(null);
      await writePrivateItems(items);
    },

    async rekey(ref, ics, keys) {
      if (!sessionFor(ref)) throw new VaultLockedError();
      await base.writeVault(ref, await encryptVaultText(keys, ics));
      setSession({ ref, keys });
      // Older copies still open with the previous password or recovery key.
      await discardCopies();
    },

    async exportEncrypted(ics) {
      return encryptVaultText(requireSession().keys, ics);
    },

    copiesRemain: () => copiesToErase === true,

    async storeEncrypted(ref, text) {
      parseEncryptedVault(text);
      await base.writeVault(ref, text);
      // Copies of the diary it replaced may be readable, or open with another
      // password; leftover plain private items are sealed on unlock.
      await discardCopies();
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
      await retryPendingDiscard();
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
