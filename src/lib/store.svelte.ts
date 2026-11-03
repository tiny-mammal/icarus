/**
 * Global application state, built on Svelte 5 runes. A single instance (`app`)
 * is shared across components. It owns the entries, the current view, the
 * calendar position, and all the side-effecting actions (load / commit /
 * import / export) — each of which keeps the in-memory model and the vault
 * (a `.ics` file on desktop, IndexedDB in the browser) in sync.
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
import { storage, type VaultRef } from './storage';
import { BackupExistsError } from './storage/errors';
import {
  getSavedWeekStart,
  setSavedWeekStart,
  getSavedSpellcheck,
  setSavedSpellcheck,
  getSavedSpellWords,
  setSavedSpellWords,
  type WeekStart,
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

type View = 'welcome' | 'main';

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
  /** Where the diary lives right now (null = blank canvas, memory only). */
  vault = $state<VaultRef | null>(null);
  /** Which backend this session runs on — drives platform-aware UI copy. */
  readonly storageKind: 'tauri' | 'web' = storage.kind;
  view = $state<View>('welcome');
  ready = $state(false); // finished the initial boot check

  /** `YYYY-MM-DD` of the day pane currently open on the right (or null). */
  selectedKey = $state<string | null>(null);
  currentMonth = $state<Date>(startOfMonth(new Date()));

  /** When a day pane is opened from a search hit, the term(s) to highlight. */
  searchHighlight = $state('');
  /** UID of the entry to focus inside the opened day (from a search hit). */
  focusEntryUid = $state<string | null>(null);

  /** The writing dock has two states: a collapsed bar, or fullscreen. */
  dockExpanded = $state(false);
  /** Shows the currently-read entry full-screen in distraction-free mode. */
  readerFullscreen = $state(false);
  settingsOpen = $state(false);
  statsOpen = $state(false);
  busy = $state(false);
  toasts = $state<Toast[]>([]);

  /** First day of the calendar week (0 = Sunday, 1 = Monday). User preference. */
  weekStart = $state<WeekStart>(1);

  /** Underline misspellings in the writing fields. User preference. */
  spellcheck = $state(true);

  /** Personal spell-check dictionary (words added from the editor menu). */
  spellWords = $state<string[]>([]);

  // --- draft editor state -------------------------------------------------
  // The live contents of the writing dock. Kept here (not in the component) so
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
    if (this.storageKind === 'tauri') {
      // The desktop session has no host-side remembered path or settings.
      // Pick the data folder before reading any persisted state.
      this.ready = true;
      this.view = 'welcome';
      return;
    }
    void this.loadDraftsFromDisk();
    void this.loadWeekStart();
    void this.loadSpellcheck();
    void this.loadSpellWords();
    try {
      const saved = await storage.getRememberedVault();
      if (saved && (await storage.vaultExists(saved))) {
        const ok = await this.loadVault(saved, { remember: false });
        if (ok) return;
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
    } catch {
      this.toast('error', 'Could not open that diary.');
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
      } else if (remember && ref.kind === 'browser') {
        await storage.writeVault(ref, serializeIcs(res.entries));
      }
    } catch (err) {
      if (remember) await storage.rememberVault(previousVault);
      devError('adoptVault: could not persist the imported diary', err);
      this.toast('error', 'Could not save the diary in the selected location.');
      return false;
    }
    this.cancelDraftSave();
    this.resetEditor();
    this.entries = res.entries;
    this.vault = ref;
    buildSearchIndex(this.entries);
    this.view = 'main';
    this.ready = true;
    if (this.storageKind === 'tauri') await this.loadFolderState();
    return true;
  }

  private async loadFolderState(): Promise<void> {
    this.drafts = [];
    this.weekStart = 1;
    this.spellcheck = true;
    this.spellWords = [];
    setUserWords([]);
    await Promise.all([
      this.loadDraftsFromDisk(),
      this.loadWeekStart(),
      this.loadSpellcheck(),
      this.loadSpellWords(),
    ]);
  }

  /** Open an existing diary folder, or create diary.ics in an empty one. */
  async openVaultFolder(): Promise<void> {
    if (this.storageKind !== 'tauri') return;
    try {
      if (this.vault && !(await this.flushDraftNow())) return;
      const ref = await storage.pickVaultLocation('diary.ics');
      if (!ref) return;
      if (await storage.vaultExists(ref)) {
        await this.loadVault(ref);
      } else {
        await this.adoptVault(ref, serializeIcs([]), true, true);
      }
      this.settingsOpen = false;
    } catch (err) {
      devError('openVaultFolder: could not open the folder', err);
      this.toast('error', 'Could not open that folder.');
    }
  }

  /**
   * Import an `.ics`: pick a file, parse it, and make it the current vault.
   * On desktop the picked file is copied into a chosen folder. In the browser
   * its contents are copied into IndexedDB.
   */
  async importVault(): Promise<void> {
    this.settingsOpen = false;
    if (this.vault && !(await this.flushDraftNow())) return;
    this.busy = true;
    try {
      const picked = await storage.pickIcsText();
      if (picked) await this.adoptVault(picked.ref, picked.text, true, this.storageKind === 'tauri');
    } catch (err) {
      devError('importVault: could not import the diary', err);
      this.toast('error', err instanceof Error && err.message.includes('already contains diary.ics')
        ? 'That folder already has a diary. Open the folder instead.'
        : 'Could not import that diary.');
    } finally {
      this.busy = false;
    }
  }

  /** An `.ics` dropped onto the welcome zone (desktop path drop). */
  async openDroppedPath(path: string): Promise<void> {
    if (!path.toLowerCase().endsWith('.ics')) {
      this.toast('error', 'Please drop an .ics file.');
      return;
    }
    this.busy = true;
    try {
      if (this.vault && !(await this.flushDraftNow())) return;
      const picked = await storage.readDroppedPath(path);
      if (picked) await this.adoptVault(picked.ref, picked.text, true, true);
    } catch (err) {
      this.toast('error', err instanceof Error && err.message.includes('already contains diary.ics')
        ? 'That folder already has a diary. Open the folder instead.'
        : 'Could not open that file.');
    } finally {
      this.busy = false;
    }
  }

  /** An `.ics` dropped onto the welcome zone in a browser (File object). */
  async openDroppedFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.ics')) {
      this.toast('error', 'Please drop an .ics file.');
      return;
    }
    this.busy = true;
    try {
      if (this.vault && !(await this.flushDraftNow())) return;
      await this.adoptVault({ kind: 'browser' }, await file.text(), true);
    } catch {
      this.toast('error', 'Could not open that file.');
    } finally {
      this.busy = false;
    }
  }

  /** "Skip for now" — enter the app with an empty, in-memory canvas. */
  skipToBlank(): void {
    buildSearchIndex(this.entries);
    this.view = 'main';
    this.ready = true;
  }

  // --- writing ------------------------------------------------------------
  /**
   * Commit the current editor contents as a new entry: update memory, rebuild
   * search, and persist. In blank-canvas mode (no file yet) we prompt for a
   * save location on the first commit so the work is never silently lost.
   * On success the backing draft is removed and the editor is cleared.
   */
  async commit(): Promise<void> {
    const title = this.draftTitle.trim();
    if (!title && !this.draftContent.trim()) {
      this.toast('info', 'Write something first.');
      return;
    }

    const targetKey = this.draftDateKey;
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

      if (!this.vault) {
        const created = await this.chooseVaultLocation();
        if (!created) {
          this.toast(
            'info',
            'Saved in memory only — set a vault file to keep it.',
          );
        }
      } else {
        if (!(await this.persist())) {
          this.entries = this.entries.filter((candidate) => candidate.uid !== entry.uid);
          indexRemoveEntry(entry.uid);
          await this.flushDraftNow();
          return;
        }
      }
    }

    // A committed entry must no longer linger as a draft.
    this.cancelDraftSave();
    if (this.draftId) await this.removeDraft(this.draftId);
    this.resetEditor();

    this.selectedKey = targetKey;
    this.currentMonth = startOfMonth(keyToDate(targetKey));
    this.dockExpanded = false;
  }

  /**
   * Load an existing committed entry back into the writing dock to revise it.
   * On the next commit the entry is updated in place rather than duplicated.
   */
  async editEntry(entry: DiaryEntry): Promise<void> {
    // Preserve whatever was already in the writing dock before swapping it.
    await this.flushDraftNow();
    this.readerFullscreen = false;
    this.editingUid = entry.uid;
    const saved = findEntryDraft(this.drafts, entry.uid);
    this.draftId = saved?.id ?? randomId();
    this.draftOpened = !!saved;
    this.draftTitle = saved?.title ?? entry.title;
    this.draftLocation = saved?.location ?? entry.location ?? '';
    this.draftContent = saved?.content ?? entry.content;
    this.draftDateKey = saved?.dateKey ?? dateKey(entry.date);
    this.dockExpanded = true;
  }

  /**
   * Open the writing dock on a fresh entry dated `key`. Work already in the
   * dock is stashed to the drafts list first, so nothing in progress is lost.
   */
  async composeFor(key: string): Promise<void> {
    if (this.hasEditorContent() && !(await this.flushDraftNow())) return;
    this.cancelDraftSave();
    this.resetEditor();
    this.draftDateKey = key;
    this.readerFullscreen = false;
    this.dockExpanded = true;
  }

  // --- drafts -------------------------------------------------------------
  /** Pull persisted drafts into memory after the folder is selected. */
  async loadDraftsFromDisk(): Promise<void> {
    try {
      this.drafts = await loadDrafts();
    } catch (err) {
      devError('loadDraftsFromDisk: could not read persisted drafts', err);
      if (this.storageKind === 'tauri') {
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

  private hasEditorContent(): boolean {
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
    if (!this.hasEditorContent()) return true;
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
    this.dockExpanded = true;
  }

  /** "Save as draft" — stash the current work and start a fresh editor. */
  async saveDraftAndReset(): Promise<void> {
    this.cancelDraftSave();
    if (!this.hasEditorContent()) {
      this.toast('info', 'Write something first.');
      return;
    }
    if (!(await this.flushDraft())) return;
    this.resetEditor();
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

  /** Delete a draft; clears the editor (and pending autosave) if it was open. */
  async deleteDraft(id: string): Promise<boolean> {
    if (this.draftId === id) this.cancelDraftSave();
    if (!(await this.removeDraft(id))) return false;
    if (this.draftId === id) this.resetEditor();
    return true;
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
    if (this.editingUid === uid) this.resetEditor();
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
        vault.kind === 'browser' ? 'Saved in this browser' : 'Saved to vault',
      );
      return true;
    } catch {
      this.toast('error', 'Write failed — your changes are still in memory.');
      return false;
    } finally {
      this.busy = false;
    }
  }

  /** Pick a home for a brand-new vault and persist current entries into it. */
  async chooseVaultLocation(): Promise<boolean> {
    const ref = await storage.pickVaultLocation('icarus-diary.ics');
    if (!ref) return false;
    if (ref.kind === 'file' && await storage.vaultExists(ref)) {
      this.toast('error', 'That folder already has a diary. Open it instead.');
      return false;
    }
    const previousVault = this.vault;
    this.vault = ref;
    await storage.rememberVault(ref);
    if (await this.persist()) return true;
    this.vault = previousVault;
    await storage.rememberVault(previousVault);
    return false;
  }

  // --- import / export ----------------------------------------------------

  /**
   * Forget the current vault: drop the remembered link and the in-memory
   * entries, then return to the Welcome screen. On desktop the `.ics` file on
   * disk is left untouched — only the link is removed. In the browser the
   * app-owned copy in IndexedDB is deleted.
   */
  async forgetVault(): Promise<void> {
    if (this.vault && !(await this.flushDraftNow())) return;
    const ref = this.vault;
    if (ref?.kind === 'browser') {
      await storage.removeItem('drafts', 'drafts');
      await storage.removeItem('settings', 'spellWords');
    }
    if (ref) await storage.forgetVault(ref);
    await storage.rememberVault(null);
    this.entries = [];
    this.drafts = [];
    this.resetEditor();
    this.spellWords = [];
    setUserWords([]);
    buildSearchIndex(this.entries);
    this.vault = null;
    this.selectedKey = null;
    this.settingsOpen = false;
    this.view = 'welcome';
  }

  /** Export a clean backup copy wherever the user chooses (download on web). */
  async exportVault(): Promise<void> {
    this.busy = true;
    try {
      const saved = await storage.saveIcsCopy(
        serializeIcs(this.entries),
        'icarus-diary-backup.ics',
      );
      if (!saved) return;
      this.toast('success', 'Backup exported.');
      this.settingsOpen = false;
    } catch (err) {
      this.toast('error', err instanceof BackupExistsError
        ? 'Backup already exists. Choose a new filename.'
        : 'Export failed.');
    } finally {
      this.busy = false;
    }
  }

  /**
   * Collapse the writing dock back to its bar and flush the current snapshot.
   * The editor state stays loaded so expanding the dock resumes exactly where
   * the user left off, including while revising a committed entry.
   */
  collapseDock(): void {
    void this.flushDraftNow();
    this.dockExpanded = false;
  }

  /** Drop any active search highlight / focus (manual navigation). */
  private clearSearchFocus(): void {
    this.searchHighlight = '';
    this.focusEntryUid = null;
  }

  // --- navigation ---------------------------------------------------------
  selectDay(key: string): void {
    this.clearSearchFocus();
    this.selectedKey = key;
  }
  /** Open a specific day and bring the calendar to its month. */
  openDay(key: string): void {
    this.clearSearchFocus();
    this.currentMonth = startOfMonth(keyToDate(key));
    this.selectedKey = key;
  }
  closeDay(): void {
    this.clearSearchFocus();
    this.selectedKey = null;
    this.readerFullscreen = false;
  }
  /**
   * Open the previous/next day that has entries, skipping empty days, and keep
   * the calendar on that day's month.
   */
  stepDay(dir: -1 | 1): void {
    const key = dir === 1 ? this.nextDayKey : this.prevDayKey;
    if (!key) return;
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
    this.clearSearchFocus();
    this.currentMonth = startOfMonth(new Date());
    this.selectedKey = dateKey(new Date());
  }

  /**
   * Jump from a search hit straight to its day, focusing that entry and
   * carrying the query so the reader can highlight what was searched for.
   */
  jumpToEntry(entry: DiaryEntry, query = ''): void {
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
