import { plural } from '../../format';

/** Writing: the entry editor, the spelling menu, drafts, deleting entries and the length count. */
export default {
  newEntry: 'Nuova voce',
  editEntry: 'Modifica voce',
  titlePlaceholder: 'Titolo',
  locationPlaceholder: 'Aggiungi un luogo o un sottotitolo',
  /** Placeholder of an empty entry dated today. */
  bodyPlaceholderToday: 'Scrivi il capitolo di oggi… Il Markdown è benvenuto.',
  /** Placeholder of an empty entry dated on another day. */
  bodyPlaceholderOtherDay: 'Scrivi il capitolo di questo giorno… Il Markdown è benvenuto.',

  redo: 'Ripeti',
  /** Closes the editor but keeps unsaved work waiting in the draft strip. */
  minimize: 'Riduci',
  minimizeHint: 'Riduci — continua a scrivere più tardi dalla barra',

  /** Status in the editor footer: the work is autosaved as a draft, not yet saved as an entry. */
  draftSaved: 'Bozza salvata',
  /** A shorter "Draft saved", for very narrow screens. */
  draftSavedShort: 'Salvata',
  saveEntry: 'Salva voce',
  save: 'Salva',
  /** The Save button while the entry is being written to the diary. */
  saving: 'Salvataggio',

  /** Length of the entry, as the editor and the reader show it. */
  chars: plural({ one: '{count} car.', other: '{count} car.' }),
  /** Both counts side by side; `{words}` and `{chars}` are already written out, like "12 words". */
  lengthBoth: '{words} · {chars}',

  spellingSuggestions: 'Suggerimenti ortografici',
  noSuggestions: 'Nessun suggerimento',
  addToDictionary: 'Aggiungi al dizionario',
  /** Stop underlining this misspelled word (menu item). */
  ignoreWord: 'Ignora',

  drafts: 'Bozze',
  savedDrafts: 'Bozze salvate',
  noDrafts: 'Nessuna bozza.',
  /** Tag on a draft that revises an existing entry rather than a new one. */
  draftIsEntryEdit: 'Modifica di voce',
  deleteDraft: 'Elimina bozza',

  /** The draft strip reopens the minimized editor; `{title}` is the draft's title or start. */
  continueWriting: 'Continua a scrivere: {title}',
  /** Second line of the draft strip; `{day}` is the day the entry is dated. */
  stripEditingEntry: 'Modifica voce · {day}',
  stripDraft: 'Bozza · {day}',

  deleteDraftTitle: 'Eliminare la bozza?',
  discardDraftTitle: 'Scartare la bozza?',
  discard: 'Scarta',
  /** `{subject}` is the draft's title, shown emphasised. */
  deleteDraftBody: 'La bozza {subject} verrà eliminata in modo definitivo. Non si può annullare.',

  deleteEntry: 'Elimina voce',
  deleteEntryTitle: 'Eliminare la voce?',
  /** `{subject}` is the entry's title, shown emphasised. */
  deleteEntryBodyDevice: 'La voce {subject} verrà eliminata in modo definitivo da questo dispositivo. Non si può annullare.',
  deleteEntryBodyBrowser: 'La voce {subject} verrà eliminata in modo definitivo da questo browser. Non si può annullare.',
};
