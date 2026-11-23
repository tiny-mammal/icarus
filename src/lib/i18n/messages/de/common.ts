import { plural } from '../../format';

/** Words used all over the app. */
export default {
  appName: 'Icarus',
  cancel: 'Abbrechen',
  close: 'Schließen',
  back: 'Zurück',
  add: 'Hinzufügen',
  remove: 'Entfernen',
  restore: 'Wiederherstellen',
  delete: 'Löschen',
  undo: 'Rückgängig',
  done: 'Fertig',
  continue: 'Weiter',
  untitled: 'Ohne Titel',
  loading: 'Icarus wird geladen',
  entries: plural({ one: '{count} Eintrag', other: '{count} Einträge' }),
  words: plural({ one: '{count} Wort', other: '{count} Wörter' }),
  days: plural({ one: '{count} Tag', other: '{count} Tage' }),
  /** What holds the diary, as a row label. */
  place: { device: 'Dieses Gerät', browser: 'Dieser Browser' },
  couldNotSaveSettings: 'Einstellungen konnten nicht gespeichert werden.',
};
