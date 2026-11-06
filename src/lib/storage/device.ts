/**
 * Desktop and Android storage. The app owns a single diary, kept with its
 * drafts and settings in the app's private data directory (see `./files.ts`):
 * nothing to choose, and no other app is meant to read it. Android's cloud
 * backup is disabled for the app (see `AndroidManifest.xml`).
 *
 * Every save keeps the previous version as that day's copy (the last week of
 * days), so a bad write or an accidental import can be undone by hand.
 *
 * Import reads the picked file into the private diary, and export writes a
 * copy wherever the user chooses. Android's pickers return content URIs,
 * which differ from desktop paths in the ways noted below.
 */
import { readTextFile } from '@tauri-apps/plugin-fs';
import { runningOnAndroid } from '../runtime';
import {
  diaryFileExists,
  jsonFileStores,
  pickDiaryFileText,
  readDiaryFile,
  removeDiaryCopies,
  removeDiaryFile,
  saveBackupFile,
  writeDiaryFile,
} from './files';
import { APP_VAULT, type StorageBackend, type VaultRef } from './types';

/** Holds `.ics` text or an encrypted container, like the browser's vault record. */
const VAULT_FILE = 'diary.vault';

function requireAppVault(ref: VaultRef): void {
  if (ref.kind !== 'app') throw new Error('Device storage expects the app vault');
}

export const deviceBackend: StorageBackend = {
  kind: 'device',

  async getRememberedVault() {
    return (await diaryFileExists(VAULT_FILE)) ? APP_VAULT : null;
  },

  async vaultExists(ref) {
    return ref.kind === 'app' && (await diaryFileExists(VAULT_FILE));
  },

  async readVault(ref) {
    requireAppVault(ref);
    const text = await readDiaryFile(VAULT_FILE);
    if (text === null) throw new Error('The diary is not stored on this device');
    return text;
  },

  async writeVault(ref, contents) {
    requireAppVault(ref);
    await writeDiaryFile(VAULT_FILE, contents, true);
  },

  async forgetVault(ref) {
    requireAppVault(ref);
    await removeDiaryFile(VAULT_FILE, true);
  },

  async discardVaultCopies() {
    await removeDiaryCopies(VAULT_FILE);
  },

  async pickDiaryText() {
    return pickDiaryFileText(!runningOnAndroid());
  },

  async readDroppedPath(path) {
    return readTextFile(path);
  },

  async saveBackup(contents, defaultName) {
    return saveBackupFile(contents, defaultName, !runningOnAndroid());
  },

  ...jsonFileStores(),
};
