/**
 * File storage shared by the Tauri backends: the desktop folder (`./tauri.ts`)
 * and the Android app's private storage (`./device.ts`). Both keep drafts and
 * settings as JSON beside the diary and replace files atomically.
 */
import { exists, readTextFile, remove, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { open, save } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';
import { devError } from '../log';
import { BackupExistsError } from './errors';
import {
  ENCRYPTED_EXTENSION,
  PLAIN_EXTENSION,
  type StorageBackend,
  type StoreName,
} from './types';

const STORE_FILES: Record<StoreName, string> = {
  settings: 'settings.json',
  drafts: 'drafts.json',
};

/** Keep the temporary file beside the destination, including on removable media. */
export async function writeAtomic(path: string, contents: string): Promise<void> {
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

type JsonStores = Pick<StorageBackend, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Key-value stores as JSON files in the folder `folder()` returns. Writes to
 * one file are serialized so concurrent updates never drop each other.
 */
export function jsonFileStores(folder: () => Promise<string>): JsonStores {
  const pendingWrites = new Map<string, Promise<void>>();
  const storePath = async (store: StoreName) => join(await folder(), STORE_FILES[store]);

  async function update(store: StoreName, change: (value: Record<string, unknown>) => void) {
    const path = await storePath(store);
    const previous = pendingWrites.get(path) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      const value = await readStore(path);
      change(value);
      await writeAtomic(path, JSON.stringify(value));
    });
    pendingWrites.set(path, next);
    try {
      await next;
    } finally {
      if (pendingWrites.get(path) === next) pendingWrites.delete(path);
    }
  }

  return {
    async getItem<T>(store: StoreName, key: string) {
      const path = await storePath(store);
      await pendingWrites.get(path);
      return ((await readStore(path))[key] as T | undefined) ?? null;
    },
    async setItem<T>(store: StoreName, key: string, value: T) {
      await update(store, (items) => { items[key] = value; });
    },
    async removeItem(store: StoreName, key: string) {
      await update(store, (items) => { delete items[key]; });
    },
  };
}

const ICS_FILTER = { name: 'iCalendar', extensions: [PLAIN_EXTENSION] };
const ENCRYPTED_FILTER = { name: 'Encrypted Icarus diary', extensions: [ENCRYPTED_EXTENSION] };
const DIARY_FILTER = { name: 'Diary', extensions: [PLAIN_EXTENSION, ENCRYPTED_EXTENSION] };

/**
 * Ask for a diary file to import and read it. Null when cancelled.
 *
 * `filterByExtension` is for desktop pickers. Android's picker filters by MIME
 * type and drops extensions it can't map, so `.icarus` (encrypted backups)
 * would become unselectable. There any file can be picked, and the import
 * itself rejects contents that aren't a diary.
 */
export async function pickDiaryFileText(filterByExtension: boolean): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    fileAccessMode: 'scoped',
    filters: filterByExtension ? [DIARY_FILTER] : undefined,
    title: 'Import diary',
  });
  return typeof selected === 'string' ? readTextFile(selected) : null;
}

/**
 * Ask where to save a backup and write it there. False when cancelled. Never
 * replaces an existing file. `checkExisting` refuses a path that is already
 * taken. Android skips it: its save picker always creates a new document, and
 * the content URI it returns can't be checked with `exists`.
 */
export async function saveBackupFile(
  contents: string,
  defaultName: string,
  checkExisting: boolean,
): Promise<boolean> {
  const path = await save({
    defaultPath: defaultName,
    filters: [defaultName.endsWith(`.${ENCRYPTED_EXTENSION}`) ? ENCRYPTED_FILTER : ICS_FILTER],
    title: 'Export diary',
  });
  if (!path) return false;
  if (checkExisting && (await exists(path))) throw new BackupExistsError();
  await writeTextFile(path, contents);
  return true;
}
