/**
 * Browser backend: the diary lives in IndexedDB, still serialized as `.ics`
 * text. Import reads a File the user picks; export downloads a `.ics` copy (or
 * writes through the File System Access API where available). Drafts and
 * preferences share the same database, replacing the Tauri store.
 *
 * Everything stays on the machine: no network, no account.
 */
import { devError } from '../log';
import {
  idbDelete,
  idbGet,
  idbGetItem,
  idbRemoveItem,
  idbSet,
  idbSetItem,
} from './idb';
import type { StorageBackend, StoreName, VaultRef } from './types';

const VAULT_KEY = 'ics';
const BROWSER_VAULT: VaultRef = { kind: 'browser' };
const ICS_MIME = 'text/calendar;charset=utf-8';

interface SaveFilePickerLike {
  (options?: {
    suggestedName?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }): Promise<{ createWritable(): Promise<FileSystemWritableFileStream> }>;
}

interface FileSystemWritableFileStream {
  write(data: BlobPart): Promise<void>;
  close(): Promise<void>;
}

let persistenceRequested = false;

/**
 * Ask the browser to keep this origin's storage under pressure instead of
 * evicting it like a cache. Without it, a public web deployment could lose a
 * diary when the disk fills up. Best-effort: browsers may decline silently or
 * grant it based on engagement, and the diary still saves either way.
 */
function requestPersistentStorage(): void {
  if (persistenceRequested) return;
  persistenceRequested = true;
  navigator.storage?.persist?.().catch(() => {
    /* not granted or unsupported: nothing to recover */
  });
}

/** Open a hidden file input and resolve with the chosen file (null if cancelled). */
function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };

    input.onchange = () => finish(input.files?.[0] ?? null);
    input.oncancel = () => finish(null);
    input.click();
  });
}

/** Trigger a plain browser download of the `.ics` content. */
function downloadIcs(contents: string, name: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: ICS_MIME }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const webBackend: StorageBackend = {
  kind: 'web',

  async getRememberedVault() {
    return (await idbGet<string>(VAULT_KEY)) === undefined ? null : BROWSER_VAULT;
  },

  async rememberVault() {
    // Nothing to do: the vault record itself is the memory. It disappears
    // together with the data when the vault is forgotten.
  },

  async vaultExists(ref) {
    return (
      ref.kind === 'browser' && (await idbGet<string>(VAULT_KEY)) !== undefined
    );
  },

  async readVault(ref) {
    if (ref.kind !== 'browser') {
      throw new Error('Browser backend expects a browser vault');
    }
    const contents = await idbGet<string>(VAULT_KEY);
    if (contents === undefined) {
      throw new Error('The diary is not stored in this browser');
    }
    return contents;
  },

  async writeVault(ref, contents) {
    if (ref.kind !== 'browser') {
      throw new Error('Browser backend expects a browser vault');
    }
    await idbSet(VAULT_KEY, contents);
    requestPersistentStorage();
  },

  async forgetVault(ref) {
    if (ref.kind === 'browser') await idbDelete(VAULT_KEY);
  },

  async pickVaultLocation() {
    return BROWSER_VAULT;
  },

  async pickIcsText() {
    const file = await pickFile('.ics,text/calendar');
    if (!file) return null;
    return { text: await file.text(), ref: BROWSER_VAULT };
  },

  async readDroppedPath() {
    // OS-level path drops only exist on desktop; the browser uses File objects.
    return null;
  },

  async saveIcsCopy(contents, defaultName) {
    const picker = (
      window as unknown as { showSaveFilePicker?: SaveFilePickerLike }
    ).showSaveFilePicker;
    if (picker) {
      try {
        const handle = await picker({
          suggestedName: defaultName,
          types: [
            {
              description: 'iCalendar',
              accept: { 'text/calendar': ['.ics'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(contents);
        await writable.close();
        return true;
      } catch (err) {
        if ((err as DOMException | null)?.name === 'AbortError') return false;
        // Any other picker failure falls back to a plain download.
        devError('saveIcsCopy: save picker failed, downloading instead', err);
      }
    }
    downloadIcs(contents, defaultName);
    return true;
  },

  async getItem<T>(store: StoreName, key: string) {
    return (await idbGetItem<T>(store, key)) ?? null;
  },

  async setItem<T>(store: StoreName, key: string, value: T) {
    await idbSetItem(store, key, value);
  },

  async removeItem(store: StoreName, key: string) {
    await idbRemoveItem(store, key);
  },
};
