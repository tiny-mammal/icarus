/**
 * In-memory backend: holds the vault, drafts and preferences in plain maps for
 * the lifetime of the page. Used by `pnpm dev:seed` so a sample diary can be
 * browsed and edited without ever touching the real browser or disk vault.
 * File pickers and exports are delegated to `base`, since they only move data
 * the user explicitly chooses.
 */
import type { StorageBackend, StoreName, VaultRef } from './types';

const MEMORY_VAULT: VaultRef = { kind: 'browser' };

export function createMemoryBackend(
  initialIcs: string | null,
  base: StorageBackend,
): StorageBackend {
  let vault = initialIcs;
  const stores = new Map<string, unknown>();
  const id = (store: StoreName, key: string) => `${store}:${key}`;

  return {
    kind: base.kind,

    async getRememberedVault() {
      return vault === null ? null : MEMORY_VAULT;
    },
    async rememberVault() {},
    async vaultExists() {
      return vault !== null;
    },
    async readVault() {
      if (vault === null) throw new Error('No diary in memory');
      return vault;
    },
    async writeVault(_ref, contents) {
      vault = contents;
    },
    async forgetVault() {
      vault = null;
    },
    async siblingVault() {
      return MEMORY_VAULT;
    },
    async removeSupersededVault() {},

    async pickVaultLocation() {
      return MEMORY_VAULT;
    },
    async pickDiaryText() {
      const picked = await base.pickDiaryText();
      return picked && { text: picked.text, ref: MEMORY_VAULT };
    },
    async readDroppedPath() {
      return null;
    },
    saveBackup: (contents, defaultName) => base.saveBackup(contents, defaultName),

    async getItem<T>(store: StoreName, key: string) {
      return (stores.get(id(store, key)) as T | undefined) ?? null;
    },
    async setItem<T>(store: StoreName, key: string, value: T) {
      stores.set(id(store, key), structuredClone(value));
    },
    async removeItem(store: StoreName, key: string) {
      stores.delete(id(store, key));
    },
  };
}
