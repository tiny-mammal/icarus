/**
 * Desktop storage. The selected folder owns the diary (`diary.ics`, or
 * `diary.icarus` when encrypted), drafts and settings.
 */
import {
  readTextFile,
  writeTextFile,
  rename,
  remove,
  exists,
} from '@tauri-apps/plugin-fs';
import { open, save } from '@tauri-apps/plugin-dialog';
import { dirname, join } from '@tauri-apps/api/path';
import { devError } from '../log';
import { isEncryptedVault } from '../crypto/vault';
import { BackupExistsError, FolderHasDiaryError } from './errors';
import {
  ENCRYPTED_EXTENSION,
  PLAIN_EXTENSION,
  type StorageBackend,
  type StoreName,
  type VaultRef,
} from './types';

const ICS_FILTER = { name: 'iCalendar', extensions: [PLAIN_EXTENSION] };
const ENCRYPTED_FILTER = { name: 'Encrypted Icarus diary', extensions: [ENCRYPTED_EXTENSION] };
const DIARY_FILTER = { name: 'Diary', extensions: [PLAIN_EXTENSION, ENCRYPTED_EXTENSION] };
const PLAIN_DIARY_FILE = `diary.${PLAIN_EXTENSION}`;
const ENCRYPTED_DIARY_FILE = `diary.${ENCRYPTED_EXTENSION}`;
const STORE_FILES: Record<StoreName, string> = {
  settings: 'settings.json',
  drafts: 'drafts.json',
};

let activeFolder: string | null = null;
const pendingWrites = new Map<string, Promise<void>>();

async function pickFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    recursive: true,
    multiple: false,
    fileAccessMode: 'scoped',
    title: 'Choose Icarus data folder',
  });
  return typeof selected === 'string' ? selected : null;
}

async function fileInFolder(
  folder: string,
  encrypted: boolean,
): Promise<{ kind: 'file'; path: string }> {
  return {
    kind: 'file',
    path: await join(folder, encrypted ? ENCRYPTED_DIARY_FILE : PLAIN_DIARY_FILE),
  };
}

/** The diary already in `folder` (encrypted wins), or where a new one goes. */
async function diaryInFolder(folder: string): Promise<{ kind: 'file'; path: string }> {
  const encrypted = await fileInFolder(folder, true);
  return (await exists(encrypted.path)) ? encrypted : fileInFolder(folder, false);
}

async function destinationForImport(text: string): Promise<{ text: string; ref: VaultRef } | null> {
  const folder = await pickFolder();
  if (!folder) return null;
  for (const encrypted of [false, true]) {
    if (await exists((await fileInFolder(folder, encrypted)).path)) {
      throw new FolderHasDiaryError();
    }
  }
  return { text, ref: await fileInFolder(folder, isEncryptedVault(text)) };
}

function requireFolder(): string {
  if (!activeFolder) throw new Error('Choose a diary folder first');
  return activeFolder;
}

/** The vault's path, refusing anything outside the selected folder. */
async function pathInFolder(ref: VaultRef): Promise<string> {
  if (ref.kind !== 'file') throw new Error('Desktop requires a file vault');
  if ((await dirname(ref.path)) !== requireFolder()) {
    throw new Error('The diary must be inside the selected folder');
  }
  return ref.path;
}

/** Keep the temporary file beside the destination, including on removable media. */
async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp`;
  try {
    await writeTextFile(tmp, contents);
    await rename(tmp, path);
  } catch (err) {
    try {
      if (await exists(tmp)) await remove(tmp);
    } catch (cleanupErr) {
      devError('writeAtomic: failed to clean up the temp file', cleanupErr);
    }
    throw err;
  }
}

async function readStore(path: string): Promise<Record<string, unknown>> {
  if (!(await exists(path))) return {};
  const value: unknown = JSON.parse(await readTextFile(path));
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid Icarus store: ${path}`);
  }
  return value as Record<string, unknown>;
}

async function updateStore(
  store: StoreName,
  update: (value: Record<string, unknown>) => void,
): Promise<void> {
  const path = await join(requireFolder(), STORE_FILES[store]);
  const previous = pendingWrites.get(path) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    const value = await readStore(path);
    update(value);
    await writeAtomic(path, JSON.stringify(value));
  });
  pendingWrites.set(path, next);
  try {
    await next;
  } finally {
    if (pendingWrites.get(path) === next) pendingWrites.delete(path);
  }
}

export const tauriBackend: StorageBackend = {
  kind: 'tauri',

  async getRememberedVault() {
    // No path, diary content or preference is stored on the host by Icarus.
    return null;
  },

  async rememberVault(ref) {
    activeFolder = ref?.kind === 'file' ? await dirname(ref.path) : null;
  },

  async vaultExists(ref) {
    return ref.kind === 'file' && (await exists(ref.path));
  },

  async readVault(ref) {
    if (ref.kind !== 'file') throw new Error('Desktop requires a file vault');
    return readTextFile(ref.path);
  },

  async writeVault(ref, contents) {
    await writeAtomic(await pathInFolder(ref), contents);
  },

  async forgetVault() {
    // Closing a folder never deletes its files.
  },

  async siblingVault(ref, encrypted) {
    if (ref.kind !== 'file') throw new Error('Desktop requires a file vault');
    return fileInFolder(await dirname(ref.path), encrypted);
  },

  async removeSupersededVault(ref) {
    const path = await pathInFolder(ref);
    if (await exists(path)) await remove(path);
  },

  async pickVaultLocation() {
    const folder = await pickFolder();
    return folder ? diaryInFolder(folder) : null;
  },

  async pickDiaryText() {
    const selected = await open({
      multiple: false,
      directory: false,
      fileAccessMode: 'scoped',
      filters: [DIARY_FILTER],
      title: 'Import diary',
    });
    if (typeof selected !== 'string') return null;
    return destinationForImport(await readTextFile(selected));
  },

  async readDroppedPath(path) {
    return destinationForImport(await readTextFile(path));
  },

  async saveBackup(contents, defaultName) {
    const path = await save({
      defaultPath: defaultName,
      filters: [defaultName.endsWith(`.${ENCRYPTED_EXTENSION}`) ? ENCRYPTED_FILTER : ICS_FILTER],
      title: 'Export diary',
    });
    if (!path) return false;
    if (await exists(path)) {
      throw new BackupExistsError();
    }
    await writeTextFile(path, contents);
    return true;
  },

  async getItem<T>(store: StoreName, key: string) {
    const path = await join(requireFolder(), STORE_FILES[store]);
    await pendingWrites.get(path);
    return ((await readStore(path))[key] as T | undefined) ?? null;
  },

  async setItem<T>(store: StoreName, key: string, value: T) {
    await updateStore(store, (items) => { items[key] = value; });
  },

  async removeItem(store: StoreName, key: string) {
    await updateStore(store, (items) => { delete items[key]; });
  },
};
