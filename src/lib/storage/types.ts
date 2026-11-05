/**
 * Platform-agnostic storage contract.
 *
 * The app is backed by `.ics` content either way, but the medium differs:
 *  - `folder` (desktop): a user-selected folder owns the diary and settings.
 *  - `browser`: IndexedDB owns the data.
 *  - `device` (Android): files in the app's private storage own the data.
 * The last two hold a single app-owned diary (`{ kind: 'app' }`). Everything
 * above this layer talks to a `StorageBackend` and never branches on the
 * platform, only on these storage models.
 *
 * Encryption is layered on top of any backend (`./encrypted.ts`): backends
 * only store opaque text and values, and know nothing about keys.
 */

/**
 * Where the diary currently lives: a file in a user-selected folder, or the
 * single diary the app owns (in the browser or the app's private storage).
 */
export type VaultRef =
  | { kind: 'file'; path: string }
  | { kind: 'app' };

/** How a backend stores the diary; see the module comment. */
export type StorageKind = 'folder' | 'browser' | 'device';

/**
 * How UI copy names the place that holds an app-owned diary, as in
 * "stored in this browser". Folder backends name the folder instead.
 */
export function appPlaceName(kind: StorageKind): string {
  return kind === 'device' ? 'this device' : 'this browser';
}

/** Key-value namespaces for folder JSON files or browser IndexedDB stores. */
export type StoreName = 'settings' | 'drafts';

export interface StoreItem {
  store: StoreName;
  key: string;
}

/** The persisted draft list. */
export const DRAFTS_ITEM: StoreItem = { store: 'drafts', key: 'drafts' };
/** The personal spell-check dictionary. */
export const SPELL_WORDS_ITEM: StoreItem = { store: 'settings', key: 'spellWords' };
/** Whether desktop reopens this folder on launch. */
export const REMEMBER_FOLDER_ITEM: StoreItem = { store: 'settings', key: 'rememberFolder' };

/** Reading of `REMEMBER_FOLDER_ITEM`: on unless the user turned it off. */
export function remembersFolder(value: unknown): boolean {
  return value !== false;
}

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

  // --- vault lifecycle ----------------------------------------------------
  /**
   * The vault to reopen on boot, or null to show the Welcome screen. Desktop
   * reopens the last folder unless that folder's settings turn it off.
   */
  getRememberedVault(): Promise<VaultRef | null>;
  /**
   * Select the active vault and remember it for the next launch; null forgets
   * it. Desktop keeps only the folder's path on the computer, and only while
   * `REMEMBER_FOLDER_ITEM` allows it.
   */
  rememberVault(ref: VaultRef | null): Promise<void>;
  /** Whether the vault's data is still present. */
  vaultExists(ref: VaultRef): Promise<boolean>;
  /** Read the raw text of a vault (`.ics`, or an encrypted container). */
  readVault(ref: VaultRef): Promise<string>;
  /** Replace the vault's contents (atomically on desktop). */
  writeVault(ref: VaultRef, contents: string): Promise<void>;
  /** Destroy the app-owned copy (browser). External files are left intact. */
  forgetVault(ref: VaultRef): Promise<void>;
  /**
   * Where the same diary lives once (un)encrypted. Desktop uses a distinct
   * file name so a calendar app never mistakes ciphertext for `.ics`; the
   * browser has a single slot, so the ref is unchanged.
   */
  siblingVault(ref: VaultRef, encrypted: boolean): Promise<VaultRef>;
  /** Delete a vault file replaced by its sibling. No-op for the browser slot. */
  removeSupersededVault(ref: VaultRef): Promise<void>;

  // --- user-facing file flows --------------------------------------------
  /**
   * Ask where a brand-new vault should live. Native folder dialog on desktop
   * (yielding the diary already in that folder, if any); the browser has no
   * location to choose, so it yields the browser vault.
   */
  pickVaultLocation(): Promise<VaultRef | null>;
  /** Ask for a diary file (`.ics` or encrypted) to import, with its new ref. */
  pickDiaryText(): Promise<{ text: string; ref: VaultRef } | null>;
  /** Read a diary dropped onto the window (desktop only; null elsewhere). */
  readDroppedPath(path: string): Promise<{ text: string; ref: VaultRef } | null>;
  /** Write a backup copy where the user chooses. False when cancelled. */
  saveBackup(contents: string, defaultName: string): Promise<boolean>;

  // --- key-value persistence ---------------------------------------------
  getItem<T>(store: StoreName, key: string): Promise<T | null>;
  setItem<T>(store: StoreName, key: string, value: T): Promise<void>;
  removeItem(store: StoreName, key: string): Promise<void>;
}

export function sameVault(a: VaultRef | null, b: VaultRef | null): boolean {
  if (!a || !b) return a === b;
  if (a.kind === 'file' && b.kind === 'file') return a.path === b.path;
  return a.kind === b.kind;
}

/** File extensions for the two diary formats. */
export const PLAIN_EXTENSION = 'ics';
export const ENCRYPTED_EXTENSION = 'icarus';

/** Whether a file name looks like a diary Icarus can open. */
export function isDiaryFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(`.${PLAIN_EXTENSION}`) || lower.endsWith(`.${ENCRYPTED_EXTENSION}`);
}

/** The diary file name to show for a vault, or null for browser/blank. */
export function vaultFileName(ref: VaultRef | null): string | null {
  if (ref?.kind !== 'file') return null;
  return ref.path.split(/[\\/]/).pop() || ref.path;
}
