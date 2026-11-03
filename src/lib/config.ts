/**
 * Typed app preferences, persisted through the active storage backend:
 * the chosen folder on desktop, IndexedDB in the browser. Only preferences live
 * here — the diary itself lives in the vault.
 */
import { storage } from './storage';
import { parseDateFormat, type DateFormat, type WeekStart } from './date';

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
  const value = await storage.getItem<string[]>(STORE, 'spellWords');
  return Array.isArray(value)
    ? value.filter((word) => typeof word === 'string')
    : [];
}

export async function setSavedSpellWords(words: string[]): Promise<void> {
  await storage.setItem(STORE, 'spellWords', words);
}

/** How day labels are written throughout the app (defaults to the system locale). */
export async function getSavedDateFormat(): Promise<DateFormat> {
  return parseDateFormat(await storage.getItem<DateFormat>(STORE, 'dateFormat'));
}

export async function setSavedDateFormat(format: DateFormat): Promise<void> {
  await storage.setItem(STORE, 'dateFormat', format);
}
