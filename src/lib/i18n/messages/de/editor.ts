import { plural } from '../../format';

/** Writing: the entry editor, the spelling menu, drafts, deleting entries and the length count. */
export default {
  newEntry: 'Neuer Eintrag',
  editEntry: 'Eintrag bearbeiten',
  titlePlaceholder: 'Titel',
  locationPlaceholder: 'Ort oder Untertitel hinzufügen',
  /** Placeholder of an empty entry dated today. */
  bodyPlaceholderToday: 'Schreibe das heutige Kapitel… Markdown ist willkommen.',
  /** Placeholder of an empty entry dated on another day. */
  bodyPlaceholderOtherDay: 'Schreibe das Kapitel für diesen Tag… Markdown ist willkommen.',

  redo: 'Wiederholen',
  /** Closes the editor but keeps unsaved work waiting in the draft strip. */
  minimize: 'Minimieren',
  minimizeHint: 'Minimieren — später im Streifen weiterschreiben',

  /** Status in the editor footer: the work is autosaved as a draft, not yet saved as an entry. */
  draftSaved: 'Entwurf gespeichert',
  /** A shorter "Draft saved", for very narrow screens. */
  draftSavedShort: 'Gespeichert',
  saveEntry: 'Eintrag speichern',
  save: 'Speichern',
  /** The Save button while the entry is being written to the diary. */
  saving: 'Wird gespeichert',

  /** Length of the entry, as the editor and the reader show it. */
  chars: plural({ one: '{count} Zeichen', other: '{count} Zeichen' }),
  /** Both counts side by side; `{words}` and `{chars}` are already written out, like "12 words". */
  lengthBoth: '{words} · {chars}',

  spellingSuggestions: 'Rechtschreibvorschläge',
  noSuggestions: 'Keine Vorschläge',
  addToDictionary: 'Zum Wörterbuch hinzufügen',
  /** Stop underlining this misspelled word (menu item). */
  ignoreWord: 'Ignorieren',

  drafts: 'Entwürfe',
  savedDrafts: 'Gespeicherte Entwürfe',
  noDrafts: 'Noch keine Entwürfe.',
  /** Tag on a draft that revises an existing entry rather than a new one. */
  draftIsEntryEdit: 'Bearbeitung',
  deleteDraft: 'Entwurf löschen',

  /** The draft strip reopens the minimized editor; `{title}` is the draft's title or start. */
  continueWriting: 'Weiterschreiben: {title}',
  /** Second line of the draft strip; `{day}` is the day the entry is dated. */
  stripEditingEntry: 'Eintrag wird bearbeitet · {day}',
  stripDraft: 'Entwurf · {day}',

  deleteDraftTitle: 'Entwurf löschen?',
  discardDraftTitle: 'Entwurf verwerfen?',
  discard: 'Verwerfen',
  /** `{subject}` is the draft's title, shown emphasised. */
  deleteDraftBody: '{subject} wird dauerhaft entfernt. Das kann nicht rückgängig gemacht werden.',

  deleteEntry: 'Eintrag löschen',
  deleteEntryTitle: 'Eintrag löschen?',
  /** `{subject}` is the entry's title, shown emphasised. */
  deleteEntryBodyDevice: '{subject} wird dauerhaft von diesem Gerät entfernt. Das kann nicht rückgängig gemacht werden.',
  deleteEntryBodyBrowser: '{subject} wird dauerhaft aus diesem Browser entfernt. Das kann nicht rückgängig gemacht werden.',
};
