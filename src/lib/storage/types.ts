/**
 * Platform-agnostic storage contract.
 *
 * The app is backed by `.ics` content either way, but the medium differs:
 * on desktop a user-selected folder owns the diary and settings, while in the
 * browser IndexedDB owns the data. Everything above this layer talks to a
 * `StorageBackend` and never branches on the platform.
 *
 * Encryption is layered on top of any backend (`./encrypted.ts`): backends
 * only store opaque text and values, and know nothing about keys.
 */

/** Where the diary currently lives. */
export type VaultRef =
  | { kind: 'file'; path: string }
  | { kind: 'browser' };

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
  readonly kind: 'tauri' | 'web';

  // --- vault lifecycle ----------------------------------------------------
  /** The vault available on boot, or null until a desktop folder is chosen. */
  getRememberedVault(): Promise<VaultRef | null>;
  /** Select the active vault for this session; desktop never remembers its path. */
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
