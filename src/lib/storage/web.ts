/**
 * Browser backend: the diary lives in IndexedDB, serialized as `.ics` text (or
 * an encrypted container). Import reads a File the user picks; export
 * downloads a backup (or writes through the File System Access API where
 * available). Drafts and
 * preferences share the same database, replacing the Tauri store.
 *
 * Everything stays on the machine: no network, no account.
 */
import { devError } from '../log';
import { downloadText } from '../download';
import {
  idbDelete,
  idbGet,
  idbGetItem,
  idbRemoveItem,
  idbSet,
  idbSetItem,
} from './idb';
import {
  APP_VAULT,
  ENCRYPTED_EXTENSION,
  PLAIN_EXTENSION,
  type StorageBackend,
  type StoreName,
} from './types';

// The key predates encryption: the record holds `.ics` or an encrypted container.
const VAULT_KEY = 'ics';

interface BackupType {
  description: string;
  mime: string;
  extension: string;
}

const ICS_BACKUP: BackupType = {
  description: 'iCalendar',
  mime: 'text/calendar',
  extension: PLAIN_EXTENSION,
};
const ENCRYPTED_BACKUP: BackupType = {
  description: 'Encrypted Icarus diary',
  mime: 'application/octet-stream',
  extension: ENCRYPTED_EXTENSION,
};

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

export const webBackend: StorageBackend = {
  kind: 'browser',

  async getRememberedVault() {
    return (await idbGet<string>(VAULT_KEY)) === undefined ? null : APP_VAULT;
  },

  async vaultExists(ref) {
    return (
      ref.kind === 'app' && (await idbGet<string>(VAULT_KEY)) !== undefined
    );
  },

  async readVault(ref) {
    if (ref.kind !== 'app') {
      throw new Error('Browser backend expects a browser vault');
    }
    const contents = await idbGet<string>(VAULT_KEY);
    if (contents === undefined) {
      throw new Error('The diary is not stored in this browser');
    }
    return contents;
  },

  async writeVault(ref, contents) {
    if (ref.kind !== 'app') {
      throw new Error('Browser backend expects a browser vault');
    }
    await idbSet(VAULT_KEY, contents);
    requestPersistentStorage();
  },

  async forgetVault(ref) {
    if (ref.kind === 'app') await idbDelete(VAULT_KEY);
  },

  async discardVaultCopies() {
    // The browser keeps no copies.
  },

  async pickDiaryText() {
    const file = await pickFile(`.${PLAIN_EXTENSION},.${ENCRYPTED_EXTENSION},text/calendar`);
    return file ? file.text() : null;
  },

  async readDroppedPath() {
    // OS-level path drops only exist on desktop; the browser uses File objects.
    return null;
  },

  async saveBackup(contents, defaultName) {
    const type = defaultName.endsWith(`.${ENCRYPTED_EXTENSION}`) ? ENCRYPTED_BACKUP : ICS_BACKUP;
    const picker = (
      window as unknown as { showSaveFilePicker?: SaveFilePickerLike }
    ).showSaveFilePicker;
    if (picker) {
      try {
        const handle = await picker({
          suggestedName: defaultName,
          types: [
            {
              description: type.description,
              accept: { [type.mime]: [`.${type.extension}`] },
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
        devError('saveBackup: save picker failed, downloading instead', err);
      }
    }
    downloadText(contents, defaultName, type.mime);
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
