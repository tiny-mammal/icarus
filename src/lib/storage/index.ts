/**
 * Picks the storage backend once, at module load:
 *  - Tauri desktop → a user-selected folder (`./tauri.ts`).
 *  - Tauri on Android → the app's private storage (`./device.ts`).
 *  - Plain browser → IndexedDB (`./web.ts`), still exportable as `.ics`.
 *  - `pnpm dev:seed` → memory only (`./memory.ts`), preloaded with a sample
 *    diary. The mode check is static, so production builds drop it.
 *
 * Every backend is wrapped by `withEncryption`, so diaries can be protected
 * with a password on any platform. Consumers import `storage` and stay
 * platform-agnostic.
 */
import { isTauri } from '@tauri-apps/api/core';
import { tauriBackend } from './tauri';
import { deviceBackend } from './device';
import { webBackend } from './web';
import { createMemoryBackend } from './memory';
import { withEncryption, type SecureStorage } from './encrypted';
import { serializeIcs } from '../ical';
import { seedEntries } from '../seed';
import type { StorageBackend } from './types';

function runningUnderTauri(): boolean {
  if (isTauri()) return true;
  // Belt and braces: `__TAURI_INTERNALS__` is the object every Tauri API calls
  // into, so its presence is a reliable signal even without the helper.
  return '__TAURI_INTERNALS__' in globalThis;
}

function platformBackend(): StorageBackend {
  if (!runningUnderTauri()) return webBackend;
  // The Android WebView always names the OS in its user agent.
  return /android/i.test(navigator.userAgent) ? deviceBackend : tauriBackend;
}

export const storage: SecureStorage = withEncryption(
  import.meta.env.MODE === 'seed'
    ? createMemoryBackend(
        serializeIcs(seedEntries(Number(import.meta.env.VITE_SEED_YEARS) || undefined)),
        platformBackend(),
      )
    : platformBackend(),
);

export type { StorageBackend, StoreName, VaultRef } from './types';
export type { SecureStorage, UnlockSecret, VaultEncryption } from './encrypted';
export { isDiaryFileName, sameVault, vaultFileName } from './types';
