/**
 * Typed app preferences, persisted through the active storage backend:
 * the chosen folder on desktop, IndexedDB in the browser. Only preferences live
 * here — the diary itself lives in the vault.
 */
import { storage } from './storage';
import { parseDateFormat, type DateFormat, type WeekStart } from './date';
import { SPELL_WORDS_ITEM } from './storage/types';

export type { DateFormat, WeekStart };

const STORE = 'settings' as const;

/** The preferred first day of the week (defaults to Monday). */
export async function getSavedWeekStart(): Promise<WeekStart> {
  const value = await storage.getItem<WeekStart>(STORE, 'weekStart');
  return value === 0 ? 0 : 1;
}

export async function setSavedWeekStart(weekStart: WeekStart): Promise<void> {
  await storage.setItem(STORE, 'weekStart', weekStart);
}

/**
 * Whether native spell-check highlighting is on. Defaults to `true` — the OS
 * webview already underlines misspellings, so the user has to opt out.
 */
export async function getSavedSpellcheck(): Promise<boolean> {
  const value = await storage.getItem<boolean>(STORE, 'spellcheck');
  return value !== false;
}

export async function setSavedSpellcheck(enabled: boolean): Promise<void> {
  await storage.setItem(STORE, 'spellcheck', enabled);
}

/** The user's personal spell-check dictionary (words they added manually). */
export async function getSavedSpellWords(): Promise<string[]> {
  const value = await storage.getItem<string[]>(SPELL_WORDS_ITEM.store, SPELL_WORDS_ITEM.key);
  return Array.isArray(value)
    ? value.filter((word) => typeof word === 'string')
    : [];
}

export async function setSavedSpellWords(words: string[]): Promise<void> {
  await storage.setItem(SPELL_WORDS_ITEM.store, SPELL_WORDS_ITEM.key, words);
}

/** Minutes of inactivity before an encrypted diary locks itself (0 = never). */
export const AUTO_LOCK_CHOICES = [5, 15, 30, 0] as const;
export type AutoLockMinutes = (typeof AUTO_LOCK_CHOICES)[number];
const DEFAULT_AUTO_LOCK: AutoLockMinutes = 15;

export async function getSavedAutoLock(): Promise<AutoLockMinutes> {
  const value = await storage.getItem<number>(STORE, 'autoLockMinutes');
  return AUTO_LOCK_CHOICES.find((choice) => choice === value) ?? DEFAULT_AUTO_LOCK;
}

export async function setSavedAutoLock(minutes: AutoLockMinutes): Promise<void> {
  await storage.setItem(STORE, 'autoLockMinutes', minutes);
}

/** Whether an encrypted diary locks as soon as the window is hidden. Off by default. */
export async function getSavedLockWhenHidden(): Promise<boolean> {
  return (await storage.getItem<boolean>(STORE, 'lockWhenHidden')) === true;
}

export async function setSavedLockWhenHidden(enabled: boolean): Promise<void> {
  await storage.setItem(STORE, 'lockWhenHidden', enabled);
}

/** How day labels are written throughout the app (defaults to the system locale). */
export async function getSavedDateFormat(): Promise<DateFormat> {
  return parseDateFormat(await storage.getItem<DateFormat>(STORE, 'dateFormat'));
}

export async function setSavedDateFormat(format: DateFormat): Promise<void> {
  await storage.setItem(STORE, 'dateFormat', format);
}
