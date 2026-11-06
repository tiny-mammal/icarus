/**
 * In-memory backend: holds the vault, drafts and preferences in plain maps for
 * the lifetime of the page. Used by `pnpm dev:seed` so a sample diary can be
 * browsed and edited without ever touching the real browser or disk vault.
 * File pickers and exports are delegated to `base`, since they only move data
 * the user explicitly chooses.
 */
import { APP_VAULT, type StorageBackend, type StoreName } from './types';

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
      return vault === null ? null : APP_VAULT;
    },
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
    async discardVaultCopies() {},

    pickDiaryText: () => base.pickDiaryText(),
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
