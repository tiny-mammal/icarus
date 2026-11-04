/**
 * Global application state, built on Svelte 5 runes. A single instance (`app`)
 * is shared across components. It owns the entries, the current view, the
 * calendar position, and all the side-effecting actions (load / commit /
 * import / export / lock) — each of which keeps the in-memory model and the
 * vault (a file on desktop, IndexedDB in the browser) in sync.
 */
import type {
  DiaryEntry,
  StoredDraft,
  Toast,
  ToastAction,
  ToastLevel,
} from './types';
import { generateUid, parseIcs, serializeIcs } from './ical';
import {
  createDraftPersistenceQueue,
  findEntryDraft,
  loadDrafts,
  persistDrafts,
  upsertDraft,
} from './drafts';
import { isDiaryFileName, storage, type UnlockSecret, type VaultRef } from './storage';
import {
  BackupExistsError,
  FolderHasDiaryError,
  VaultLockedError,
} from './storage/errors';
import { PRIVATE_ITEMS, appPlaceName, type StorageKind } from './storage/types';
import {
  CorruptVaultError,
  WrongSecretError,
  changePassword,
  createVaultKeys,
  encryptionSupported,
  isEncryptedVault,
  replaceRecoveryKey,
  type VaultKeys,
} from './crypto/vault';
import {
  getSavedWeekStart,
  getSavedDateFormat,
  setSavedDateFormat,
  setSavedWeekStart,
  getSavedSpellcheck,
  setSavedSpellcheck,
  getSavedSpellWords,
  setSavedSpellWords,
  getSavedAutoLock,
  setSavedAutoLock,
  getSavedLockWhenHidden,
  setSavedLockWhenHidden,
  type AutoLockMinutes,
  type WeekStart,
  type DateFormat,
} from './config';
import {
  buildSearchIndex,
  indexAddEntry,
  indexRemoveEntry,
  indexUpdateEntry,
} from './search';
import { addMonths, adjacentKey, dateKey, keyToDate, startOfMonth } from './date';
import { addUserWord, setUserWords } from './spellcheck';
import { randomId } from './random';
import { devError } from './log';

type View = 'welcome' | 'locked' | 'main';

/** Outcome of a password-gated action, so dialogs can show the right message. */
export type SecretResult = 'ok' | 'wrong-secret' | 'failed';

/** Rewrapped keys waiting for the user to confirm they saved a recovery key. */
type PendingKeys =
  | { kind: 'enable'; keys: VaultKeys }
  | { kind: 'recovery'; keys: VaultKeys };

export type BackupFormat = 'encrypted' | 'plain';

/**
 * A new or imported diary waiting for the user to choose whether to protect
 * it. Nothing is written until they choose, so a diary meant to be encrypted
 * never touches the disk in plain text.
 */
export interface PendingDiary {
  ref: VaultRef;
  text: string;
  source: 'new' | 'import';
}

function groupByDay(entries: DiaryEntry[]): Map<string, DiaryEntry[]> {
  const map = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const key = dateKey(e.date);
    const bucket = map.get(key);
    if (bucket) bucket.push(e);
    else map.set(key, [e]);
  }
  return map;
}

let toastSeq = 0;

class AppStore {
  // --- core reactive state ------------------------------------------------
  entries = $state<DiaryEntry[]>([]);
  /** Where the open diary lives (null while on the welcome or lock screen). */
  vault = $state<VaultRef | null>(null);
  /** Which backend this session runs on — drives platform-aware UI copy. */
  readonly storageKind: StorageKind = storage.kind;
  /** "this browser" or "this device": where an app-owned diary is kept. */
  readonly appPlace: string = appPlaceName(storage.kind);
  view = $state<View>('welcome');
  ready = $state(false); // finished the initial boot check

  // --- encryption ---------------------------------------------------------
  /** Whether this context can encrypt at all (secure contexts only). */
  readonly encryptionSupported = encryptionSupported();
  /** The open diary is encrypted (and therefore unlocked). */
  encrypted = $state(false);
  /** The encrypted diary waiting on the lock screen. */
  lockedVault = $state<VaultRef | null>(null);
  /** Minutes of inactivity before locking (0 = never). User preference. */
  autoLockMinutes = $state<AutoLockMinutes>(15);
  /** Lock as soon as the window is hidden. User preference. */
  lockWhenHidden = $state(false);
  encryptionSetupOpen = $state(false);
  /** Bumped on every open, so each run of the setup starts from a fresh state. */
  encryptionSetupRun = $state(0);
  exportOpen = $state(false);
  privacyDialog = $state<'password' | 'recovery' | 'disable' | null>(null);
  /** A new or imported diary waiting on the protection choice. */
  pendingDiary = $state<PendingDiary | null>(null);
  // Keys that are only written once the user confirms the recovery key.
  private pendingKeys: PendingKeys | null = null;

  /** `YYYY-MM-DD` of the day pane currently open on the right (or null). */
  selectedKey = $state<string | null>(null);
  currentMonth = $state<Date>(startOfMonth(new Date()));

  /** When a day pane is opened from a search hit, the term(s) to highlight. */
  searchHighlight = $state('');
  /** UID of the entry to focus inside the opened day (from a search hit). */
  focusEntryUid = $state<string | null>(null);

  /**
   * Whether the day pane shows the editor (writing a new entry or revising
   * one) instead of the reader. Reading and writing share that one surface.
   */
  editing = $state(false);
  settingsOpen = $state(false);
  statsOpen = $state(false);
  busy = $state(false);
  toasts = $state<Toast[]>([]);

  /** First day of the calendar week (0 = Sunday, 1 = Monday). User preference. */
  weekStart = $state<WeekStart>(1);

  /** How day labels are written (system locale by default). User preference. */
  dateFormat = $state<DateFormat>('auto');

  /** Underline misspellings in the writing fields. User preference. */
  spellcheck = $state(true);

  /**
   * Wide screens: the day pane fills the window, text centred. Lasts while
   * the pane stays open (across days, reading and writing) and resets when
   * it closes, so the next quick look at a day opens at the side again.
   */
  paneExpanded = $state(false);

  /** Personal spell-check dictionary (words added from the editor menu). */
  spellWords = $state<string[]>([]);

  // --- draft editor state -------------------------------------------------
  // The live contents of the editor. Kept here (not in the component) so
  // it can be autosaved and swapped between drafts from one place.
  draftId = $state<string | null>(null); // null = a fresh, unsaved draft
  // True only when the editor was loaded from a previously saved draft (not a
  // brand-new entry that merely got autosaved). Gates the "Discard" action.
  draftOpened = $state(false);
  // When set, the editor is revising this existing committed entry in place
  // (preserving its UID) rather than creating a new one.
  editingUid = $state<string | null>(null);
  draftTitle = $state('');
  draftLocation = $state('');
  draftContent = $state('');
  draftDateKey = $state(dateKey(new Date()));

  /** All persisted drafts, newest first. */
  drafts = $state<StoredDraft[]>([]);
  /** Id of the draft awaiting delete confirmation (null = dialog closed). */
  confirmDeleteId = $state<string | null>(null);
  /** UID of the committed entry awaiting delete confirmation (null = closed). */
  confirmDeleteUid = $state<string | null>(null);

  // Debounce handle for autosave (plain field — not reactive).
  private draftSaveTimer: ReturnType<typeof setTimeout> | null = null;
  // Keep writes ordered so an older, slower save cannot win a race.
  private persistDraftList = createDraftPersistenceQueue(persistDrafts);

  // --- derived ------------------------------------------------------------
  entriesByDay = $derived.by(() => groupByDay(this.entries));

  selectedEntries = $derived.by<DiaryEntry[]>(() =>
    this.selectedKey ? (this.entriesByDay.get(this.selectedKey) ?? []) : [],
  );

  /** Every day that holds an entry, ascending (`YYYY-MM-DD` sorts naturally). */
  dayKeys = $derived.by<string[]>(() => [...this.entriesByDay.keys()].sort());

  /** Nearest days with entries before/after the open day (null at the ends). */
  prevDayKey = $derived.by<string | null>(() =>
    this.selectedKey ? adjacentKey(this.dayKeys, this.selectedKey, -1) : null,
  );
  nextDayKey = $derived.by<string | null>(() =>
    this.selectedKey ? adjacentKey(this.dayKeys, this.selectedKey, 1) : null,
  );

  // --- boot ---------------------------------------------------------------
  /** Desktop asks for a folder; browser reopens its IndexedDB vault. */
  async init(): Promise<void> {
    if (this.storageKind === 'folder') {
      // The desktop session has no host-side remembered path or settings.
      // Pick the data folder before reading any persisted state.
      this.ready = true;
      this.view = 'welcome';
      return;
    }
    void this.loadDraftsFromDisk();
    void this.loadWeekStart();
    void this.loadDateFormat();
    void this.loadSpellcheck();
    void this.loadSpellWords();
    void this.loadLockPreferences();
    try {
      const saved = await storage.getRememberedVault();
      if (saved && (await storage.vaultExists(saved))) {
        const ok = await this.loadVault(saved, { remember: false });
        // An encrypted vault stops at the lock screen instead.
        if (ok || this.view === 'locked') return;
      } else if (saved) {
        // The remembered vault moved or was deleted — forget it gracefully.
        await storage.rememberVault(null);
      }
    } catch (err) {
      // Any boot failure simply falls through to the Welcome screen.
      devError('init: failed to restore the saved vault', err);
    } finally {
      this.ready = true;
    }
    this.view = 'welcome';
  }

  // --- vault loading ------------------------------------------------------
  /**
   * Read and adopt the vault at `ref`. `remember: false` is used on boot so a
   * restored vault is not re-persisted.
   */
  async loadVault(
    ref: VaultRef,
    opts: { remember?: boolean } = {},
  ): Promise<boolean> {
    this.busy = true;
    try {
      const text = await storage.readVault(ref);
      return await this.adoptVault(ref, text, opts.remember !== false);
    } catch (err) {
      if (err instanceof VaultLockedError) {
        await this.showLockScreen(ref);
        return false;
      }
      devError('loadVault: could not open the diary', err);
      this.toast('error', err instanceof CorruptVaultError
        ? 'This encrypted diary is damaged or was modified.'
        : 'Could not open that diary.');
      return false;
    } finally {
      this.busy = false;
    }
  }

  /**
   * Replace the in-memory diary with the parsed contents of `text` and make
   * `ref` the current vault. In the browser there is no source file to keep,
   * so an adopted vault is materialized into IndexedDB right away.
   */
  private async adoptVault(
    ref: VaultRef,
    text: string,
    remember: boolean,
    writeCopy = false,
  ): Promise<boolean> {
    if (isEncryptedVault(text)) return this.adoptEncryptedFile(ref, text);
    const res = parseIcs(text);
    if (!res.ok) {
      this.toast('error', `Couldn't read this file — ${res.error}`);
      return false;
    }
    const previousVault = this.vault;
    try {
      if (remember) await storage.rememberVault(ref);
      if (writeCopy) {
        await storage.writeVault(ref, text);
      } else if (remember && ref.kind === 'app') {
        await storage.writeVault(ref, serializeIcs(res.entries));
      }
    } catch (err) {
      if (remember) await storage.rememberVault(previousVault);
      devError('adoptVault: could not persist the imported diary', err);
      this.toast('error', 'Could not save the diary in the selected location.');
      return false;
    }
    await this.enterVault(ref, res.entries);
    return true;
  }

  /** Show `entries` as the diary at `ref`, which is already persisted. */
  private async enterVault(ref: VaultRef, entries: DiaryEntry[]): Promise<void> {
    this.cancelDraftSave();
    this.resetEditor();
    this.entries = entries;
    this.vault = ref;
    this.lockedVault = null;
    storage.encryption.keepSessionFor(ref);
    this.encrypted = storage.encryption.isUnlocked(ref);
    buildSearchIndex(this.entries);
    this.view = 'main';
    this.ready = true;
    await this.loadVaultState();
  }

  /**
   * Offer the protection choice for a new or imported plain diary before
   * anything is written. Encrypted files go straight to the lock screen, and
   * an encrypted browser diary keeps protecting whatever replaces it.
   */
  private async proposeDiary(ref: VaultRef, text: string, source: PendingDiary['source']): Promise<void> {
    const writeCopy = this.storageKind === 'folder';
    if (isEncryptedVault(text) || storage.encryption.isUnlocked(ref)) {
      await this.adoptVault(ref, text, true, writeCopy);
      return;
    }
    const res = parseIcs(text);
    if (!res.ok) {
      this.toast('error', `Couldn't read this file — ${res.error}`);
      return;
    }
    this.settingsOpen = false;
    this.pendingDiary = { ref, text, source };
    this.openEncryptionSetup();
  }

  /** The user chose not to protect the pending diary: save it as plain `.ics`. */
  async keepPendingDiaryPlain(): Promise<boolean> {
    const diary = this.pendingDiary;
    if (!diary) return false;
    this.busy = true;
    try {
      if (!(await this.adoptVault(diary.ref, diary.text, true, this.storageKind === 'folder'))) {
        return false;
      }
      this.pendingDiary = null;
      this.encryptionSetupOpen = false;
      return true;
    } finally {
      this.busy = false;
    }
  }

  /** Open the password setup (for the pending diary, or else the open one). */
  openEncryptionSetup(): void {
    this.settingsOpen = false;
    this.encryptionSetupRun++;
    this.encryptionSetupOpen = true;
  }

  /** Close the protection choice without creating or importing anything. */
  cancelPendingDiary(): void {
    this.pendingDiary = null;
    this.pendingKeys = null;
    this.encryptionSetupOpen = false;
  }

  /** App-owned onboarding: start an empty diary in this browser or device. */
  async startNewDiary(): Promise<void> {
    const ref = await storage.pickVaultLocation();
    if (ref) await this.proposeDiary(ref, serializeIcs([]), 'new');
  }

  /**
   * An imported or dropped file that is itself encrypted: store it as-is and
   * ask for its password. The current diary is closed first.
   */
  private async adoptEncryptedFile(ref: VaultRef, text: string): Promise<boolean> {
    if (!this.encryptionSupported) {
      this.toast('error', 'Encrypted diaries need HTTPS or the desktop app.');
      return false;
    }
    const previousVault = this.vault;
    try {
      await storage.rememberVault(ref);
      await storage.encryption.storeEncrypted(ref, text);
    } catch (err) {
      await storage.rememberVault(previousVault);
      devError('adoptEncryptedFile: could not store the encrypted diary', err);
      this.toast('error', err instanceof CorruptVaultError
        ? 'This encrypted diary is damaged or was modified.'
        : 'Could not save the diary in the selected location.');
      return false;
    }
    await this.showLockScreen(ref);
    return true;
  }

  /**
   * Reload everything stored beside the diary: drafts, the personal
   * dictionary and preferences. Private items can only be read once an
   * encrypted diary is unlocked, and each desktop folder has its own.
   */
  private async loadVaultState(): Promise<void> {
    this.drafts = [];
    this.weekStart = 1;
    this.dateFormat = 'auto';
    this.spellcheck = true;
    this.spellWords = [];
    setUserWords([]);
    await Promise.all([
      this.loadDraftsFromDisk(),
      this.loadWeekStart(),
      this.loadDateFormat(),
      this.loadSpellcheck(),
      this.loadSpellWords(),
      this.loadLockPreferences(),
    ]);
  }

  // --- lock / unlock ------------------------------------------------------
  /** Drop every trace of diary content from memory. */
  private clearDiaryFromMemory(): void {
    this.cancelDraftSave();
    this.resetEditor();
    this.entries = [];
    this.drafts = [];
    this.spellWords = [];
    setUserWords([]);
    buildSearchIndex([]);
    this.selectedKey = null;
    this.paneExpanded = false;
    this.searchHighlight = '';
    this.focusEntryUid = null;
    this.editing = false;
    this.settingsOpen = false;
    this.statsOpen = false;
    this.exportOpen = false;
    this.encryptionSetupOpen = false;
    this.privacyDialog = null;
    this.pendingKeys = null;
    this.confirmDeleteId = null;
    this.confirmDeleteUid = null;
    this.toasts = [];
  }

  private async showLockScreen(ref: VaultRef): Promise<void> {
    storage.encryption.lock();
    this.clearDiaryFromMemory();
    this.vault = null;
    this.encrypted = false;
    this.lockedVault = ref;
    this.view = 'locked';
    this.ready = true;
    // Preferences stay readable while locked (desktop: from the folder).
    if (this.storageKind === 'folder') await this.loadLockPreferences();
  }

  /**
   * Lock the open encrypted diary: save the draft (encrypted), forget the key
   * and clear the diary from memory. Refuses while a write is in flight or if
   * the draft cannot be saved, so locking never loses work.
   */
  async lock(): Promise<boolean> {
    if (!this.encrypted || !this.vault || this.busy) return false;
    if (!(await this.flushDraftNow())) return false;
    await this.showLockScreen(this.vault);
    return true;
  }

  /**
   * Unlock the diary on the lock screen. With a recovery key, `newPassword`
   * replaces the forgotten password straight away.
   */
  async unlock(secret: UnlockSecret, newPassword?: string): Promise<SecretResult> {
    const ref = this.lockedVault;
    if (!ref) return 'failed';
    this.busy = true;
    try {
      await storage.encryption.unlock(ref, secret);
    } catch (err) {
      if (err instanceof WrongSecretError) return 'wrong-secret';
      devError('unlock: could not open the keyring', err);
      this.toast('error', err instanceof CorruptVaultError
        ? err.message
        : 'Could not read the diary.');
      return 'failed';
    } finally {
      this.busy = false;
    }
    if (!(await this.loadVault(ref, { remember: ref.kind === 'file' }))) {
      storage.encryption.lock();
      return 'failed';
    }
    if (newPassword !== undefined) {
      const keys = await changePassword(storage.encryption.currentKeys(), newPassword);
      if (await this.rekey(keys)) this.toast('success', 'Password changed.');
    }
    return 'ok';
  }

  // --- encryption management ----------------------------------------------
  /**
   * Derive keys for `password` and return the new recovery key. Nothing is
   * written until `confirmEncryption()`, once the user has saved that key.
   */
  async prepareEncryption(password: string): Promise<string> {
    const { keys, recoveryKey } = await createVaultKeys(password);
    this.pendingKeys = { kind: 'enable', keys };
    return recoveryKey;
  }

  /**
   * Encrypt with the prepared keys: the pending new/imported diary (written
   * encrypted from the start), or else the open diary.
   */
  async confirmEncryption(): Promise<boolean> {
    const pending = this.pendingKeys;
    const diary = this.pendingDiary;
    const ref = diary?.ref ?? this.vault;
    if (pending?.kind !== 'enable' || !ref) return false;
    const parsed = diary ? parseIcs(diary.text) : null;
    if (parsed && !parsed.ok) return false;
    const entries = parsed?.ok ? parsed.entries : this.entries;
    if (this.vault && !(await this.flushDraftNow())) return false;
    const previousVault = this.vault;
    this.busy = true;
    try {
      const encryptedRef = await storage.encryption.enable(ref, serializeIcs(entries), pending.keys);
      this.pendingKeys = null;
      if (diary) {
        this.pendingDiary = null;
        await this.enterVault(encryptedRef, entries);
      } else {
        this.vault = encryptedRef;
        this.encrypted = true;
      }
      return true;
    } catch (err) {
      devError('confirmEncryption: could not encrypt the diary', err);
      if (diary) await storage.rememberVault(previousVault).catch(() => undefined);
      this.toast('error', diary
        ? 'Could not save the encrypted diary. Nothing was written.'
        : 'Could not encrypt the diary. Nothing was changed.');
      return false;
    } finally {
      this.busy = false;
    }
  }

  /** Forget keys prepared for a setup or recovery-key change that was cancelled. */
  discardPendingKeys(): void {
    this.pendingKeys = null;
  }

  private async checkPassword(password: string): Promise<SecretResult> {
    try {
      await storage.encryption.verifyPassword(password);
      return 'ok';
    } catch (err) {
      if (err instanceof WrongSecretError) return 'wrong-secret';
      devError('checkPassword: could not verify the password', err);
      return 'failed';
    }
  }

  /** Rewrite the open diary under rewrapped keys. Toasts on failure. */
  private async rekey(keys: VaultKeys): Promise<boolean> {
    if (!this.vault) return false;
    this.busy = true;
    try {
      await storage.encryption.rekey(this.vault, serializeIcs(this.entries), keys);
      return true;
    } catch (err) {
      devError('rekey: could not rewrite the diary', err);
      this.toast('error', 'Could not save the diary. The previous password still applies.');
      return false;
    } finally {
      this.busy = false;
    }
  }

  async changePassword(current: string, next: string): Promise<SecretResult> {
    const checked = await this.checkPassword(current);
    if (checked !== 'ok') return checked;
    const keys = await changePassword(storage.encryption.currentKeys(), next);
    return (await this.rekey(keys)) ? 'ok' : 'failed';
  }

  /**
   * Generate a replacement recovery key once `password` checks out. Like
   * setup, it only takes effect with `confirmRecoveryKey()`.
   */
  async prepareRecoveryKey(password: string): Promise<{ result: SecretResult; recoveryKey?: string }> {
    const checked = await this.checkPassword(password);
    if (checked !== 'ok') return { result: checked };
    const { keys, recoveryKey } = await replaceRecoveryKey(storage.encryption.currentKeys());
    this.pendingKeys = { kind: 'recovery', keys };
    return { result: 'ok', recoveryKey };
  }

  async confirmRecoveryKey(): Promise<boolean> {
    const pending = this.pendingKeys;
    if (pending?.kind !== 'recovery') return false;
    if (!(await this.rekey(pending.keys))) return false;
    this.pendingKeys = null;
    return true;
  }

  /** Store the open diary unencrypted again, once `password` checks out. */
  async disableEncryption(password: string): Promise<SecretResult> {
    const ref = this.vault;
    if (!ref || !this.encrypted) return 'failed';
    if (!(await this.flushDraftNow())) return 'failed';
    this.busy = true;
    try {
      this.vault = await storage.encryption.disable(ref, serializeIcs(this.entries), password);
      this.encrypted = false;
      return 'ok';
    } catch (err) {
      if (err instanceof WrongSecretError) return 'wrong-secret';
      devError('disableEncryption: could not decrypt the diary', err);
      this.toast('error', 'Could not remove encryption. The diary is still encrypted.');
      return 'failed';
    } finally {
      this.busy = false;
    }
  }

  async loadLockPreferences(): Promise<void> {
    try {
      [this.autoLockMinutes, this.lockWhenHidden] = await Promise.all([
        getSavedAutoLock(),
        getSavedLockWhenHidden(),
      ]);
    } catch (err) {
      devError('loadLockPreferences: could not read the lock preferences', err);
    }
  }

  async setAutoLock(minutes: AutoLockMinutes): Promise<void> {
    this.autoLockMinutes = minutes;
    try {
      await setSavedAutoLock(minutes);
    } catch (err) {
      devError('setAutoLock: could not persist the auto-lock preference', err);
      this.toast('error', 'Could not save settings to the diary folder.');
    }
  }

  async setLockWhenHidden(enabled: boolean): Promise<void> {
    this.lockWhenHidden = enabled;
    try {
      await setSavedLockWhenHidden(enabled);
    } catch (err) {
      devError('setLockWhenHidden: could not persist the preference', err);
      this.toast('error', 'Could not save settings to the diary folder.');
    }
  }

  /** Open an existing diary folder, or create diary.ics in an empty one. */
  async openVaultFolder(): Promise<void> {
    if (this.storageKind !== 'folder') return;
    try {
      if (this.vault && !(await this.flushDraftNow())) return;
      const ref = await storage.pickVaultLocation();
      if (!ref) return;
      this.settingsOpen = false;
      if (await storage.vaultExists(ref)) await this.loadVault(ref);
      else await this.proposeDiary(ref, serializeIcs([]), 'new');
    } catch (err) {
      devError('openVaultFolder: could not open the folder', err);
      this.toast('error', 'Could not open that folder.');
    }
  }

  /**
   * Import a diary (`.ics` or an encrypted backup): pick a file, parse it, and
   * make it the current vault. On desktop the picked file is copied into a
   * chosen folder. In the browser its contents are copied into IndexedDB; if
   * the browser diary is encrypted, the imported entries stay encrypted.
   */
  async importVault(): Promise<void> {
    this.settingsOpen = false;
    if (this.vault && !(await this.flushDraftNow())) return;
    this.busy = true;
    try {
      const picked = await storage.pickDiaryText();
      if (picked) await this.proposeDiary(picked.ref, picked.text, 'import');
    } catch (err) {
      devError('importVault: could not import the diary', err);
      this.toast('error', err instanceof FolderHasDiaryError
        ? 'That folder already has a diary. Open the folder instead.'
        : 'Could not import that diary.');
    } finally {
      this.busy = false;
    }
  }

  /** A diary dropped onto the welcome zone (desktop path drop). */
  async openDroppedPath(path: string): Promise<void> {
    if (!isDiaryFileName(path)) {
      this.toast('error', 'Please drop an .ics or .icarus file.');
      return;
    }
    this.busy = true;
    try {
      if (this.vault && !(await this.flushDraftNow())) return;
      const picked = await storage.readDroppedPath(path);
      if (picked) await this.proposeDiary(picked.ref, picked.text, 'import');
    } catch (err) {
      this.toast('error', err instanceof FolderHasDiaryError
        ? 'That folder already has a diary. Open the folder instead.'
        : 'Could not open that file.');
    } finally {
      this.busy = false;
    }
  }

  /** A diary dropped onto the welcome zone in a browser (File object). */
  async openDroppedFile(file: File): Promise<void> {
    if (!isDiaryFileName(file.name)) {
      this.toast('error', 'Please drop an .ics or .icarus file.');
      return;
    }
    this.busy = true;
    try {
      if (this.vault && !(await this.flushDraftNow())) return;
      await this.proposeDiary({ kind: 'app' }, await file.text(), 'import');
    } catch {
      this.toast('error', 'Could not open that file.');
    } finally {
      this.busy = false;
    }
  }


  // --- writing ------------------------------------------------------------
  /**
   * Commit the current editor contents as a new entry: update memory, rebuild
   * search, and persist. On success the backing draft is removed, the editor
   * is cleared and the calendar shows the entry's month.
   */
  async commit(): Promise<void> {
    const title = this.draftTitle.trim();
    if (!title && !this.draftContent.trim()) {
      this.toast('info', 'Write something first.');
      return;
    }

    const fields = {
      title: title || 'Untitled',
      content: this.draftContent,
      location: this.draftLocation.trim() || undefined,
      date: keyToDate(this.draftDateKey),
    };

    if (this.editingUid) {
      // Revise the existing entry in place, keeping its UID. Snapshot the prior
      // version first so the edit can be undone.
      const uid = this.editingUid;
      const previous = this.entries.find((e) => e.uid === uid);
      if (!previous) {
        this.toast('error', 'The original entry is no longer available.');
        await this.flushDraftNow();
        return;
      }
      const updated: DiaryEntry = { ...previous, ...fields };
      this.entries = this.entries.map((e) => (e.uid === uid ? updated : e));
      indexUpdateEntry(updated);
      if (this.vault && !(await this.persist())) {
        // Keep the autosaved revision open and restore the committed in-memory
        // value. A retry can safely attempt the vault write again later.
        this.entries = this.entries.map((e) => (e.uid === uid ? previous : e));
        indexUpdateEntry(previous);
        await this.flushDraftNow();
        return;
      }
      const snapshot = { ...previous };
      this.toast('success', 'Entry updated', {
        label: 'Undo',
        run: () => void this.restoreEntry(snapshot),
      });
    } else {
      const entry: DiaryEntry = { uid: generateUid(), ...fields };
      this.entries = [...this.entries, entry];
      indexAddEntry(entry);

      if (!(await this.persist())) {
        this.entries = this.entries.filter((candidate) => candidate.uid !== entry.uid);
        indexRemoveEntry(entry.uid);
        await this.flushDraftNow();
        return;
      }
    }

    // A committed entry must no longer linger as a draft.
    this.cancelDraftSave();
    if (this.draftId) await this.removeDraft(this.draftId);
    this.leaveEditorForCalendar();
  }

  /**
   * Turn an entry in the day pane into the editor to revise it. On the next
   * commit the entry is updated in place rather than duplicated.
   */
  async editEntry(entry: DiaryEntry): Promise<void> {
    // Preserve whatever was already in the editor before swapping it.
    await this.flushDraftNow();
    this.editingUid = entry.uid;
    const saved = findEntryDraft(this.drafts, entry.uid);
    this.draftId = saved?.id ?? randomId();
    this.draftOpened = !!saved;
    this.draftTitle = saved?.title ?? entry.title;
    this.draftLocation = saved?.location ?? entry.location ?? '';
    this.draftContent = saved?.content ?? entry.content;
    this.draftDateKey = saved?.dateKey ?? dateKey(entry.date);
    this.openEditor();
  }

  /**
   * Start a fresh entry dated `key` in the day pane. Work already in the
   * editor is stashed to the drafts list first, so nothing in progress is lost.
   */
  async newEntryOn(key: string): Promise<void> {
    if (this.hasEditorContent() && !(await this.flushDraftNow())) return;
    this.cancelDraftSave();
    this.resetEditor();
    this.draftDateKey = key;
    this.openEditor();
  }

  /**
   * Resume writing whatever is loaded in the editor: a fresh entry for today,
   * or the work in progress the user left when they last stopped editing.
   */
  resumeWriting(): void {
    this.openEditor();
  }

  /**
   * Go back to reading. Work in progress is flushed to drafts and stays
   * loaded, so resuming picks up exactly where the user left off. Opening an
   * entry for editing and leaving it untouched leaves nothing behind.
   */
  stopEditing(): void {
    if (!this.editing) return;
    this.editing = false;
    if (this.editingUid && this.revisionUnchanged()) {
      const id = this.draftId;
      this.cancelDraftSave();
      this.resetEditor();
      if (id && this.drafts.some((d) => d.id === id)) void this.removeDraft(id);
      return;
    }
    void this.flushDraftNow();
  }

  /** Show the editor in the day pane, on the day the draft is dated. */
  private openEditor(): void {
    this.clearSearchFocus();
    this.selectedKey = this.draftDateKey;
    this.currentMonth = startOfMonth(keyToDate(this.draftDateKey));
    this.editing = true;
  }

  /** True while revising an entry without having changed anything yet. */
  private revisionUnchanged(): boolean {
    const entry = this.editingUid
      ? this.entries.find((e) => e.uid === this.editingUid)
      : undefined;
    return (
      !!entry &&
      this.draftTitle === entry.title &&
      this.draftLocation === (entry.location ?? '') &&
      this.draftContent === entry.content &&
      this.draftDateKey === dateKey(entry.date)
    );
  }

  // --- drafts -------------------------------------------------------------
  /** Pull persisted drafts into memory after the folder is selected. */
  async loadDraftsFromDisk(): Promise<void> {
    try {
      this.drafts = await loadDrafts();
    } catch (err) {
      devError('loadDraftsFromDisk: could not read persisted drafts', err);
      if (this.storageKind === 'folder') {
        this.toast('error', 'Could not read drafts from the diary folder.');
      }
    }
  }

  /** Restore the saved week-start preference on boot (defaults to Monday). */
  async loadWeekStart(): Promise<void> {
    try {
      this.weekStart = await getSavedWeekStart();
    } catch (err) {
      devError('loadWeekStart: could not read the week-start preference', err);
    }
  }

  /** Change the first day of the week and persist it. */
  async setWeekStart(weekStart: WeekStart): Promise<void> {
    this.weekStart = weekStart;
    try {
      await setSavedWeekStart(weekStart);
    } catch (err) {
      devError('setWeekStart: could not persist the week-start preference', err);
      this.toast('error', 'Could not save settings to the diary folder.');
    }
  }

  /** Restore the saved date-format preference on boot (defaults to the system locale). */
  async loadDateFormat(): Promise<void> {
    try {
      this.dateFormat = await getSavedDateFormat();
    } catch (err) {
      devError('loadDateFormat: could not read the date-format preference', err);
    }
  }

  /** Change how day labels are written and persist it. */
  async setDateFormat(format: DateFormat): Promise<void> {
    this.dateFormat = format;
    try {
      await setSavedDateFormat(format);
    } catch (err) {
      devError('setDateFormat: could not persist the date-format preference', err);
      this.toast('error', 'Could not save settings to the diary folder.');
    }
  }

  /** Restore the saved spell-check preference on boot (defaults to on). */
  async loadSpellcheck(): Promise<void> {
    try {
      this.spellcheck = await getSavedSpellcheck();
    } catch (err) {
      devError('loadSpellcheck: could not read the spell-check preference', err);
    }
  }

  /** Turn native spell-check highlighting on/off and persist it. */
  async setSpellcheck(enabled: boolean): Promise<void> {
    this.spellcheck = enabled;
    try {
      await setSavedSpellcheck(enabled);
    } catch (err) {
      devError('setSpellcheck: could not persist the spell-check preference', err);
      this.toast('error', 'Could not save settings to the diary folder.');
    }
  }

  /** Restore the personal spell-check dictionary on boot. */
  async loadSpellWords(): Promise<void> {
    try {
      this.spellWords = await getSavedSpellWords();
      setUserWords(this.spellWords);
    } catch (err) {
      devError('loadSpellWords: could not read the personal dictionary', err);
    }
  }

  /** Add a word to the personal dictionary and persist the updated list. */
  addSpellWord(word: string): void {
    this.spellWords = addUserWord(word);
    void setSavedSpellWords(this.spellWords).catch((err) => {
      devError('addSpellWord: could not persist the personal dictionary', err);
      this.toast('error', 'Could not save settings to the diary folder.');
    });
  }

  /** Whether the editor holds anything worth saving. */
  hasEditorContent(): boolean {
    return !!(
      this.draftTitle.trim() ||
      this.draftContent.trim() ||
      this.draftLocation.trim()
    );
  }

  /** Clear the editor back to a fresh, unsaved draft. */
  resetEditor(): void {
    this.editingUid = null;
    this.draftId = null;
    this.draftOpened = false;
    this.draftTitle = '';
    this.draftLocation = '';
    this.draftContent = '';
    this.draftDateKey = dateKey(new Date());
  }

  private cancelDraftSave(): void {
    if (this.draftSaveTimer) {
      clearTimeout(this.draftSaveTimer);
      this.draftSaveTimer = null;
    }
  }

  /** Debounced autosave — called as the user types. */
  scheduleDraftSave(): void {
    this.cancelDraftSave();
    this.draftSaveTimer = setTimeout(() => {
      this.draftSaveTimer = null;
      void this.flushDraft();
    }, 600);
  }

  /**
   * Write the current editor contents into the persisted draft list right now.
   * Creates a draft id on first save so subsequent edits update the same one.
   * Empty editors are ignored so we never persist a blank draft.
   */
  async flushDraft(): Promise<boolean> {
    // An untouched revision is not a draft: the entry itself already holds it.
    if (!this.hasEditorContent() || this.revisionUnchanged()) return true;
    if (!this.draftId) this.draftId = randomId();

    const draft: StoredDraft = {
      id: this.draftId,
      editingUid: this.editingUid ?? undefined,
      title: this.draftTitle,
      location: this.draftLocation,
      content: this.draftContent,
      dateKey: this.draftDateKey,
      updatedAt: Date.now(),
    };

    this.drafts = upsertDraft(this.drafts, draft);
    try {
      await this.persistDraftList(this.drafts);
      return true;
    } catch (err) {
      devError('flushDraft: could not persist the draft list', err);
      this.toast('error', 'Draft not saved — check that the diary folder is available.');
      return false;
    }
  }

  /** Flush immediately (used on collapse / app close). */
  async flushDraftNow(): Promise<boolean> {
    this.cancelDraftSave();
    return this.flushDraft();
  }

  private async removeDraft(id: string): Promise<boolean> {
    const previous = this.drafts;
    this.drafts = this.drafts.filter((d) => d.id !== id);
    try {
      await this.persistDraftList(this.drafts);
      return true;
    } catch (err) {
      this.drafts = previous;
      devError('removeDraft: could not persist the draft list', err);
      this.toast('error', 'Could not update drafts in the diary folder.');
      return false;
    }
  }

  /** Load a saved draft into the editor, stashing whatever was being written. */
  async openDraft(id: string): Promise<void> {
    // Don't lose the in-progress work: persist it before swapping.
    await this.flushDraftNow();
    const d = this.drafts.find((x) => x.id === id);
    if (!d) return;
    this.editingUid =
      d.editingUid && this.entries.some((entry) => entry.uid === d.editingUid)
        ? d.editingUid
        : null;
    this.draftId = d.id;
    this.draftOpened = true;
    this.draftTitle = d.title;
    this.draftLocation = d.location;
    this.draftContent = d.content;
    this.draftDateKey = d.dateKey;
    this.openEditor();
  }

  /** "Save as draft" — park the current work in drafts and go back to the calendar. */
  async saveDraftAndReset(): Promise<void> {
    this.cancelDraftSave();
    if (!this.hasEditorContent()) {
      this.toast('info', 'Write something first.');
      return;
    }
    if (!(await this.flushDraft())) return;
    this.leaveEditorForCalendar();
    this.toast('success', 'Saved to drafts');
  }

  /** Open the shared confirmation dialog for deleting/discarding a draft. */
  requestDeleteDraft(id: string): void {
    this.confirmDeleteId = id;
  }
  cancelDeleteDraft(): void {
    this.confirmDeleteId = null;
  }
  /** Carry out the pending deletion (both "Delete" and "Discard" land here). */
  async confirmDeleteDraft(): Promise<void> {
    const id = this.confirmDeleteId;
    this.confirmDeleteId = null;
    if (!id) return;
    if (await this.deleteDraft(id)) this.toast('info', 'Draft deleted');
  }

  /** Delete a draft; if it was open, the editor is cleared and closed. */
  async deleteDraft(id: string): Promise<boolean> {
    if (this.draftId === id) this.cancelDraftSave();
    if (!(await this.removeDraft(id))) return false;
    if (this.draftId === id) {
      if (this.editing) this.leaveEditorForCalendar();
      else this.resetEditor();
    }
    return true;
  }

  /**
   * Finish a writing session (saved, parked as a draft or discarded): clear
   * the editor and return to the calendar, on the month the entry was dated.
   */
  private leaveEditorForCalendar(): void {
    const month = startOfMonth(keyToDate(this.draftDateKey));
    this.resetEditor();
    this.editing = false;
    this.hidePane();
    this.currentMonth = month;
  }

  // --- committed entry deletion -------------------------------------------
  /**
   * Show the confirmation dialog for a committed entry. Mirrors the draft
   * delete flow so the destructive action is always one extra click away.
   */
  requestDeleteEntry(uid: string): void {
    this.confirmDeleteUid = uid;
  }
  cancelDeleteEntry(): void {
    this.confirmDeleteUid = null;
  }
  /** Apply the pending delete. Persists if a vault file is open. */
  async confirmDeleteEntry(): Promise<void> {
    const uid = this.confirmDeleteUid;
    this.confirmDeleteUid = null;
    if (!uid) return;
    await this.deleteEntry(uid);
  }

  /**
   * Remove a committed entry from memory and (if a vault is open) from disk.
   * If the day pane was showing that entry on that day, close it: the user
   * just deleted the thing they were reading.
   */
  async deleteEntry(uid: string): Promise<void> {
    const index = this.entries.findIndex((e) => e.uid === uid);
    if (index === -1) return;
    const removed = this.entries[index];
    const previousEntries = this.entries;
    this.entries = this.entries.filter((e) => e.uid !== uid);
    indexRemoveEntry(uid);
    if (this.vault && !(await this.persist())) {
      this.entries = previousEntries;
      indexAddEntry(removed);
      return;
    }
    // If we were editing this entry, drop the editor state.
    if (this.editingUid === uid) {
      this.editing = false;
      this.resetEditor();
    }
    // If the open day no longer has anything or the focused entry is gone,
    // close the pane — nothing to show.
    if (this.focusEntryUid === uid) this.focusEntryUid = null;
    if (this.selectedKey && this.entriesByDay.get(this.selectedKey)?.length === 0) {
      this.closeDay();
    }
    this.toast('info', 'Entry deleted', {
      label: 'Undo',
      run: () => void this.restoreEntry(removed, index),
    });
  }

  /**
   * Put an entry back after an undo. Used for both flavours of undo: restoring
   * a just-deleted entry (with its original position) and reverting an in-place
   * edit (the entry is still present, so it's swapped back by UID).
   */
  private async restoreEntry(entry: DiaryEntry, index?: number): Promise<void> {
    const previousEntries = this.entries;
    const exists = this.entries.some((e) => e.uid === entry.uid);
    if (exists) {
      // Revert an edit: swap the current version back to the snapshot.
      this.entries = this.entries.map((e) => (e.uid === entry.uid ? entry : e));
      indexUpdateEntry(entry);
    } else {
      // Re-insert a deleted entry at (or near) its former position.
      const next = [...this.entries];
      next.splice(Math.min(index ?? next.length, next.length), 0, entry);
      this.entries = next;
      indexAddEntry(entry);
    }
    if (this.vault && !(await this.persist())) {
      this.entries = previousEntries;
      buildSearchIndex(previousEntries);
    }
  }

  /** Write current entries to the current vault. Toasts on failure. */
  private async persist(): Promise<boolean> {
    if (!this.vault) return false;
    const vault = this.vault;
    this.busy = true;
    try {
      await storage.writeVault(vault, serializeIcs(this.entries));
      this.toast(
        'success',
        vault.kind === 'app' ? `Saved in ${this.appPlace}` : 'Saved to vault',
      );
      return true;
    } catch {
      this.toast('error', 'Write failed — your changes are still in memory.');
      return false;
    } finally {
      this.busy = false;
    }
  }

  // --- import / export ----------------------------------------------------

  /**
   * Forget the current vault: drop the remembered link and the in-memory
   * entries, then return to the Welcome screen. On desktop the `.ics` file on
   * disk is left untouched — only the link is removed. In the browser the
   * app-owned copy in IndexedDB is deleted. Also available from the lock
   * screen, for a diary whose password and recovery key are both lost.
   */
  async forgetVault(): Promise<void> {
    if (this.vault && !(await this.flushDraftNow())) return;
    const ref = this.vault ?? this.lockedVault;
    if (ref?.kind === 'app') {
      for (const item of PRIVATE_ITEMS) await storage.removeItem(item.store, item.key);
    }
    if (ref) await storage.forgetVault(ref);
    await storage.rememberVault(null);
    storage.encryption.keepSessionFor(null);
    this.clearDiaryFromMemory();
    this.vault = null;
    this.lockedVault = null;
    this.encrypted = false;
    this.view = 'welcome';
  }

  /**
   * Export a backup copy wherever the user chooses (download on web). An
   * encrypted diary exports encrypted unless the user explicitly asks for a
   * plain `.ics`.
   */
  async exportVault(format: BackupFormat = this.encrypted ? 'encrypted' : 'plain'): Promise<void> {
    this.busy = true;
    try {
      const ics = serializeIcs(this.entries);
      const saved = format === 'encrypted'
        ? await storage.saveBackup(
            await storage.encryption.exportEncrypted(ics),
            'icarus-diary-backup.icarus',
          )
        : await storage.saveBackup(ics, 'icarus-diary-backup.ics');
      if (!saved) return;
      this.toast('success', format === 'encrypted' ? 'Encrypted backup exported.' : 'Backup exported.');
      this.exportOpen = false;
      this.settingsOpen = false;
    } catch (err) {
      this.toast('error', err instanceof BackupExistsError
        ? 'Backup already exists. Choose a new filename.'
        : 'Export failed.');
    } finally {
      this.busy = false;
    }
  }

  /** True while writing or an overlay is up (blocks reading shortcuts). */
  get overlayOpen(): boolean {
    return (
      this.editing ||
      this.settingsOpen ||
      this.statsOpen ||
      this.exportOpen ||
      this.encryptionSetupOpen ||
      this.privacyDialog !== null ||
      this.confirmDeleteId !== null ||
      this.confirmDeleteUid !== null
    );
  }

  /** Drop any active search highlight / focus (manual navigation). */
  private clearSearchFocus(): void {
    this.searchHighlight = '';
    this.focusEntryUid = null;
  }

  // --- navigation ---------------------------------------------------------
  selectDay(key: string): void {
    this.stopEditing();
    this.clearSearchFocus();
    this.selectedKey = key;
  }
  /** Open a specific day and bring the calendar to its month. */
  openDay(key: string): void {
    this.stopEditing();
    this.clearSearchFocus();
    this.currentMonth = startOfMonth(keyToDate(key));
    this.selectedKey = key;
  }
  closeDay(): void {
    this.stopEditing();
    this.hidePane();
  }
  /** Close the day pane; full screen only lasts while it is open. */
  private hidePane(): void {
    this.clearSearchFocus();
    this.selectedKey = null;
    this.paneExpanded = false;
  }
  /**
   * Open the previous/next day that has entries, skipping empty days, and keep
   * the calendar on that day's month.
   */
  stepDay(dir: -1 | 1): void {
    const key = dir === 1 ? this.nextDayKey : this.prevDayKey;
    if (!key) return;
    this.stopEditing();
    this.clearSearchFocus();
    this.selectedKey = key;
    this.currentMonth = startOfMonth(keyToDate(key));
  }
  navigateMonth(delta: number): void {
    this.currentMonth = addMonths(this.currentMonth, delta);
  }
  /** Jump straight to a given month/year (used by the header picker). */
  goToMonth(year: number, month: number): void {
    this.currentMonth = new Date(year, month, 1);
  }
  goToToday(): void {
    this.stopEditing();
    this.clearSearchFocus();
    this.currentMonth = startOfMonth(new Date());
    this.selectedKey = dateKey(new Date());
  }

  /**
   * Jump from a search hit straight to its day, focusing that entry and
   * carrying the query so the reader can highlight what was searched for.
   */
  jumpToEntry(entry: DiaryEntry, query = ''): void {
    this.stopEditing();
    this.currentMonth = startOfMonth(entry.date);
    this.selectedKey = dateKey(entry.date);
    this.focusEntryUid = entry.uid;
    this.searchHighlight = query;
  }

  // --- toasts -------------------------------------------------------------
  toast(level: ToastLevel, message: string, action?: ToastAction): void {
    const id = ++toastSeq;
    this.toasts = [...this.toasts, { id, level, message, action }];
    // Actionable toasts (e.g. "Undo") linger a little longer so there's time
    // to react before they vanish.
    setTimeout(() => this.dismiss(id), action ? 7000 : 3600);
  }
  dismiss(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}

export const app = new AppStore();
