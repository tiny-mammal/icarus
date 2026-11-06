/**
 * Platform-agnostic storage contract.
 *
 * The app owns a single diary, stored as `.ics` text (or an encrypted
 * container) in one of two media:
 *  - `browser`: IndexedDB.
 *  - `device` (desktop and Android apps): files in the app's private data
 *    directory, with daily copies of earlier versions.
 * Everything above this layer talks to a `StorageBackend` and never branches
 * on the platform.
 *
 * Encryption is layered on top of any backend (`./encrypted.ts`): backends
 * only store opaque text and values, and know nothing about keys.
 */

/** The diary the app owns. */
export type VaultRef = { kind: 'app' };

export const APP_VAULT: VaultRef = { kind: 'app' };

/** Where a backend stores the diary; see the module comment. */
export type StorageKind = 'browser' | 'device';

/** How UI copy names the place that holds the diary, as in "erased from this device". */
export function appPlaceName(kind: StorageKind): string {
  return kind === 'device' ? 'this device' : 'this browser';
}

/** The place with its preposition, as in "stored on this device" or "in this browser". */
export function appPlaceWithPreposition(kind: StorageKind): string {
  return `${kind === 'device' ? 'on' : 'in'} ${appPlaceName(kind)}`;
}

/** Key-value namespaces: JSON files beside the diary, or IndexedDB stores. */
export type StoreName = 'settings' | 'drafts';

export interface StoreItem {
  store: StoreName;
  key: string;
}

/** The persisted draft list. */
export const DRAFTS_ITEM: StoreItem = { store: 'drafts', key: 'drafts' };
/** The personal spell-check dictionary. */
export const SPELL_WORDS_ITEM: StoreItem = { store: 'settings', key: 'spellWords' };
/**
 * Items that contain the user's own writing (or reveal it). They are encrypted
 * whenever the diary is, and erased together with a browser diary. Plain UI
 * preferences (week start, spell check, auto-lock) stay readable so the lock
 * screen can honour them before the diary is unlocked.
 */
export const PRIVATE_ITEMS: readonly StoreItem[] = [DRAFTS_ITEM, SPELL_WORDS_ITEM];

export function isPrivateItem(store: StoreName, key: string): boolean {
  return PRIVATE_ITEMS.some((item) => item.store === store && item.key === key);
}

export interface StorageBackend {
  readonly kind: StorageKind;

  // --- the diary ----------------------------------------------------------
  /** The diary to reopen on boot, or null to show the Welcome screen. */
  getRememberedVault(): Promise<VaultRef | null>;
  /** Whether the diary's data is present. */
  vaultExists(ref: VaultRef): Promise<boolean>;
  /** Read the raw text of the diary (`.ics`, or an encrypted container). */
  readVault(ref: VaultRef): Promise<string>;
  /** Replace the diary's contents atomically. */
  writeVault(ref: VaultRef, contents: string): Promise<void>;
  /** Erase the diary and any copies of it. */
  forgetVault(ref: VaultRef): Promise<void>;
  /**
   * Erase the copies of earlier versions kept as a safety net, e.g. readable
   * ones once the diary is encrypted. No-op where none are kept.
   */
  discardVaultCopies(): Promise<void>;

  // --- user-facing file flows --------------------------------------------
  /** Ask for a diary file (`.ics` or encrypted) to import and read it. */
  pickDiaryText(): Promise<string | null>;
  /** Read a diary dropped onto the window (desktop only; null elsewhere). */
  readDroppedPath(path: string): Promise<string | null>;
  /** Write a backup copy where the user chooses. False when cancelled. */
  saveBackup(contents: string, defaultName: string): Promise<boolean>;

  // --- key-value persistence ---------------------------------------------
  getItem<T>(store: StoreName, key: string): Promise<T | null>;
  setItem<T>(store: StoreName, key: string, value: T): Promise<void>;
  removeItem(store: StoreName, key: string): Promise<void>;
}

export function sameVault(a: VaultRef | null, b: VaultRef | null): boolean {
  return a === null || b === null ? a === b : a.kind === b.kind;
}

/** File extensions for the two diary formats. */
export const PLAIN_EXTENSION = 'ics';
export const ENCRYPTED_EXTENSION = 'icarus';

/** Whether a file name looks like a diary Icarus can open. */
export function isDiaryFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(`.${PLAIN_EXTENSION}`) || lower.endsWith(`.${ENCRYPTED_EXTENSION}`);
}
