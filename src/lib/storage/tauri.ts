/**
 * Desktop storage. The selected folder owns the diary (`diary.ics`, or
 * `diary.icarus` when encrypted), drafts and settings. The only thing kept on
 * the computer itself is the folder's path, so the next launch can reopen it
 * (see `src-tauri/src/remembered.rs`); the folder's settings can turn that off.
 */
import { invoke } from '@tauri-apps/api/core';
import { readTextFile, remove, exists } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { dirname, join } from '@tauri-apps/api/path';
import { isEncryptedVault } from '../crypto/vault';
import { devError } from '../log';
import { FolderHasDiaryError } from './errors';
import { jsonFileStores, pickDiaryFileText, saveBackupFile, writeAtomic } from './files';
import {
  ENCRYPTED_EXTENSION,
  PLAIN_EXTENSION,
  REMEMBER_FOLDER_ITEM,
  remembersFolder,
  type StorageBackend,
  type VaultRef,
} from './types';

const PLAIN_DIARY_FILE = `diary.${PLAIN_EXTENSION}`;
const ENCRYPTED_DIARY_FILE = `diary.${ENCRYPTED_EXTENSION}`;

let activeFolder: string | null = null;

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

const folderStores = jsonFileStores(async () => requireFolder());

/**
 * Record the active folder for the next launch, or erase the record when no
 * folder is open or its settings say not to. A failure only costs the user
 * the shortcut on the next launch, so it never blocks opening the diary.
 */
async function syncRememberedFolder(): Promise<void> {
  try {
    const keep = activeFolder !== null
      && remembersFolder(await folderStores.getItem(REMEMBER_FOLDER_ITEM.store, REMEMBER_FOLDER_ITEM.key));
    await invoke('set_remembered_folder', { folder: keep ? activeFolder : null });
  } catch (err) {
    devError('syncRememberedFolder: could not update the remembered folder', err);
  }
}

/** The vault's path, refusing anything outside the selected folder. */
async function pathInFolder(ref: VaultRef): Promise<string> {
  if (ref.kind !== 'file') throw new Error('Desktop requires a file vault');
  if ((await dirname(ref.path)) !== requireFolder()) {
    throw new Error('The diary must be inside the selected folder');
  }
  return ref.path;
}

export const tauriBackend: StorageBackend = {
  kind: 'folder',

  async getRememberedVault() {
    const folder = await invoke<string | null>('remembered_folder');
    if (!folder) return null;
    // Select it so its settings (e.g. the lock preferences) can be read.
    activeFolder = folder;
    return diaryInFolder(folder);
  },

  async rememberVault(ref) {
    activeFolder = ref?.kind === 'file' ? await dirname(ref.path) : null;
    await syncRememberedFolder();
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
    const text = await pickDiaryFileText(true);
    return text === null ? null : destinationForImport(text);
  },

  async readDroppedPath(path) {
    return destinationForImport(await readTextFile(path));
  },

  async saveBackup(contents, defaultName) {
    return saveBackupFile(contents, defaultName, true);
  },

  ...folderStores,
};
