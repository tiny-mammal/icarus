import { plural } from '../../format';

/** Words used all over the app. */
export default {
  appName: 'Icarus',
  cancel: 'Annulla',
  close: 'Chiudi',
  back: 'Indietro',
  add: 'Aggiungi',
  remove: 'Rimuovi',
  restore: 'Ripristina',
  delete: 'Elimina',
  undo: 'Annulla',
  done: 'Fatto',
  continue: 'Continua',
  untitled: 'Senza titolo',
  loading: 'Caricamento di Icarus',
  entries: plural({ one: '{count} voce', other: '{count} voci' }),
  words: plural({ one: '{count} parola', other: '{count} parole' }),
  days: plural({ one: '{count} giorno', other: '{count} giorni' }),
  /** What holds the diary, as a row label. */
  place: { device: 'Questo dispositivo', browser: 'Questo browser' },
  couldNotSaveSettings: 'Impossibile salvare le impostazioni.',
};
