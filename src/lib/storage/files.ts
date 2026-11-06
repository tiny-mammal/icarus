/**
 * Files in the app's private data directory (desktop and Android), plus the
 * system pickers for importing and exporting diaries.
 *
 * Writes and deletions go through the Rust side (`src-tauri/src/diary_dir.rs`):
 * it resolves the directory (never volatile storage), replaces files
 * atomically and durably, and keeps daily copies of the diary. The webview
 * only reads files, and only inside that directory.
 */
import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { open, save } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';
import { BackupExistsError } from './errors';
import {
  ENCRYPTED_EXTENSION,
  PLAIN_EXTENSION,
  type StorageBackend,
  type StoreName,
} from './types';

let dataDir: Promise<string> | null = null;

/** The app's private data directory, created on first use. */
function diaryDir(): Promise<string> {
  dataDir ??= invoke<string>('diary_dir').catch((err) => {
    dataDir = null;
    throw err;
  });
  return dataDir;
}

async function pathOf(name: string): Promise<string> {
  return join(await diaryDir(), name);
}

export async function diaryFileExists(name: string): Promise<boolean> {
  return exists(await pathOf(name));
}

/** The file's text, or null when it does not exist. */
export async function readDiaryFile(name: string): Promise<string | null> {
  const path = await pathOf(name);
  return (await exists(path)) ? readTextFile(path) : null;
}

/**
 * Replace the file atomically. `dailyCopy` first keeps the previous version
 * as today's copy, if today has none yet.
 */
export async function writeDiaryFile(name: string, contents: string, dailyCopy = false): Promise<void> {
  await invoke('write_diary_file', { name, contents, dailyCopy });
}

/** Delete the file, and with `withCopies` its daily copies too. */
export async function removeDiaryFile(name: string, withCopies = false): Promise<void> {
  await invoke('remove_diary_file', { name, withCopies });
}

/** Delete the file's daily copies, keeping the file itself. */
export async function removeDiaryCopies(name: string): Promise<void> {
  await invoke('remove_diary_copies', { name });
}

const STORE_FILES: Record<StoreName, string> = {
  settings: 'settings.json',
  drafts: 'drafts.json',
};

async function readStore(name: string): Promise<Record<string, unknown>> {
  const text = await readDiaryFile(name);
  if (text === null) return {};
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid Icarus store: ${name}`);
  }
  return value as Record<string, unknown>;
}

type JsonStores = Pick<StorageBackend, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Key-value stores as JSON files beside the diary. Writes to one file are
 * serialized so concurrent updates never drop each other.
 */
export function jsonFileStores(): JsonStores {
  const pendingWrites = new Map<string, Promise<void>>();

  async function update(store: StoreName, change: (value: Record<string, unknown>) => void) {
    const name = STORE_FILES[store];
    const previous = pendingWrites.get(name) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      const value = await readStore(name);
      change(value);
      await writeDiaryFile(name, JSON.stringify(value));
    });
    pendingWrites.set(name, next);
    try {
      await next;
    } finally {
      if (pendingWrites.get(name) === next) pendingWrites.delete(name);
    }
  }

  return {
    async getItem<T>(store: StoreName, key: string) {
      const name = STORE_FILES[store];
      await pendingWrites.get(name);
      return ((await readStore(name))[key] as T | undefined) ?? null;
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
