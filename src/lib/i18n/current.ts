/**
 * The language dates and numbers are written in, for plain modules (such as
 * `date.ts`) that must not depend on the app's reactive state: the file
 * parser and the test tooling import them outside Svelte. The app installs a
 * reactive reader on startup (`index.svelte.ts`), so anything rendered from
 * these helpers still updates when the language changes.
 */
let read: () => string = () => 'en';

/** The tag to format with, e.g. `en-GB`. */
export function formatLocale(): string {
  return read();
}

export function setFormatLocaleReader(reader: () => string): void {
  read = reader;
}
