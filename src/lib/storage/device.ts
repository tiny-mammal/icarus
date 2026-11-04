/**
 * Android storage. Like the browser, the app owns a single diary, but it lives
 * in files in the app's private storage: no other app can read them, and
 * Android's cloud backup is disabled for the app (see `AndroidManifest.xml`).
 *
 * Android has no folder paths to hand to a desktop-style picker: its pickers
 * return content URIs, which can be read and written once but not listed or
 * renamed. So import reads the picked file into the private diary, and export
 * writes a copy to a document the user creates.
 */
import { exists, mkdir, readTextFile, remove } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { jsonFileStores, pickDiaryFileText, saveBackupFile, writeAtomic } from './files';
import type { StorageBackend, VaultRef } from './types';

/** Holds `.ics` text or an encrypted container, like the browser's vault record. */
const VAULT_FILE = 'diary.vault';
const APP_VAULT: VaultRef = { kind: 'app' };

let dataDir: Promise<string> | null = null;

/** The app's private data directory, created on first use. */
function folder(): Promise<string> {
  dataDir ??= (async () => {
    const dir = await appDataDir();
    if (!(await exists(dir))) await mkdir(dir, { recursive: true });
    return dir;
  })().catch((err) => {
    dataDir = null;
    throw err;
  });
  return dataDir;
}

async function vaultPath(ref: VaultRef): Promise<string> {
  if (ref.kind !== 'app') throw new Error('Android storage expects the app vault');
  return join(await folder(), VAULT_FILE);
}

export const deviceBackend: StorageBackend = {
  kind: 'device',

  async getRememberedVault() {
    return (await exists(await vaultPath(APP_VAULT))) ? APP_VAULT : null;
  },

  async rememberVault() {
    // The vault file itself is the memory, like the browser's vault record.
  },

  async vaultExists(ref) {
    return ref.kind === 'app' && (await exists(await vaultPath(ref)));
  },

  async readVault(ref) {
    return readTextFile(await vaultPath(ref));
  },

  async writeVault(ref, contents) {
    await writeAtomic(await vaultPath(ref), contents);
  },

  async forgetVault(ref) {
    const path = await vaultPath(ref);
    if (await exists(path)) await remove(path);
  },

  async siblingVault() {
    // One file holds the diary whether or not it is encrypted.
    return APP_VAULT;
  },

  async removeSupersededVault() {
    // The single vault file is rewritten in place.
  },

  async pickVaultLocation() {
    return APP_VAULT;
  },

  async pickDiaryText() {
    const text = await pickDiaryFileText(false);
    return text === null ? null : { text, ref: APP_VAULT };
  },

  async readDroppedPath() {
    return null;
  },

  async saveBackup(contents, defaultName) {
    return saveBackupFile(contents, defaultName, false);
  },

  ...jsonFileStores(folder),
};
