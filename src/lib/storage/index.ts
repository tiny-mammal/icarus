/**
 * Picks the storage backend once, at module load:
 *  - Tauri (desktop and Android) → the app's private storage (`./device.ts`).
 *  - Plain browser → IndexedDB (`./web.ts`), still exportable as `.ics`.
 *  - `pnpm dev:seed` → memory only (`./memory.ts`), preloaded with a sample
 *    diary. The mode check is static, so production builds drop it.
 *
 * Every backend is wrapped by `withEncryption`, so diaries can be protected
 * with a password on any platform. Consumers import `storage` and stay
 * platform-agnostic.
 */
import { runningUnderTauri } from '../runtime';
import { deviceBackend } from './device';
import { webBackend } from './web';
import { createMemoryBackend } from './memory';
import { withEncryption, type SecureStorage } from './encrypted';
import { serializeIcs } from '../ical';
import { SEED_SPELL_WORDS, seedEntries, seedTracker } from '../seed';
import { SPELL_WORDS_ITEM, type StorageBackend } from './types';
import type { Diary } from '../types';

function platformBackend(): StorageBackend {
  return runningUnderTauri() ? deviceBackend : webBackend;
}

function seedDiary(years?: number): Diary {
  return { entries: seedEntries(years), tracker: seedTracker(years) };
}

export const storage: SecureStorage = withEncryption(
  import.meta.env.MODE === 'seed'
    ? createMemoryBackend(
        serializeIcs(seedDiary(Number(import.meta.env.VITE_SEED_YEARS) || undefined)),
        platformBackend(),
        [[SPELL_WORDS_ITEM, SEED_SPELL_WORDS]],
      )
    : platformBackend(),
);

export type { StorageBackend, StoreName, VaultRef } from './types';
export type { SecureStorage, UnlockSecret, VaultEncryption } from './encrypted';
export { APP_VAULT, isDiaryFileName, sameVault } from './types';
