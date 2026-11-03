/**
 * Persistent draft storage through the active backend — a file in the chosen
 * desktop folder, or IndexedDB in the browser. Drafts land in persisted storage
 * rather than volatile memory, which is what lets an unsaved entry survive a
 * crash, a power cut, or quitting the app. When the diary is encrypted, the
 * storage layer encrypts drafts too.
 */
import { storage } from './storage';
import { DRAFTS_ITEM } from './storage/types';
import type { StoredDraft } from './types';

const { store: STORE, key: KEY } = DRAFTS_ITEM;

/** All saved drafts, or an empty list if none / unavailable. */
export async function loadDrafts(): Promise<StoredDraft[]> {
  const stored = await storage.getItem<StoredDraft[]>(STORE, KEY);
  return Array.isArray(stored) ? stored : [];
}

/** Overwrite the persisted draft list. */
export async function persistDrafts(drafts: StoredDraft[]): Promise<void> {
  await storage.setItem(STORE, KEY, drafts);
}

/** Put the newest snapshot first and keep only one draft per edited entry. */
export function upsertDraft(
  drafts: StoredDraft[],
  draft: StoredDraft,
): StoredDraft[] {
  return [
    draft,
    ...drafts.filter(
      (candidate) =>
        candidate.id !== draft.id &&
        (!draft.editingUid || candidate.editingUid !== draft.editingUid),
    ),
  ];
}

/** Find a previously autosaved revision of a committed entry. */
export function findEntryDraft(
  drafts: StoredDraft[],
  editingUid: string,
): StoredDraft | undefined {
  return drafts.find((draft) => draft.editingUid === editingUid);
}

/**
 * Serialize store writes so a slow older save can never overwrite a newer one.
 * A failed write does not poison the queue: the next snapshot is still tried.
 */
export function createDraftPersistenceQueue(
  write: (drafts: StoredDraft[]) => Promise<void>,
): (drafts: StoredDraft[]) => Promise<void> {
  let tail = Promise.resolve();

  return (drafts) => {
    const snapshot = drafts.map((draft) => ({ ...draft }));
    const next = tail.catch(() => undefined).then(() => write(snapshot));
    tail = next;
    return next;
  };
}
