import { plural } from '../../format';

/** Writing: the entry editor, the spelling menu, drafts, deleting entries and the length count. */
export default {
  newEntry: 'Nouvelle entrée',
  editEntry: 'Modifier l’entrée',
  titlePlaceholder: 'Titre',
  locationPlaceholder: 'Ajouter un lieu ou un sous-titre',
  /** Placeholder of an empty entry dated today. */
  bodyPlaceholderToday: 'Écrivez le chapitre d’aujourd’hui… Le Markdown est bienvenu.',
  /** Placeholder of an empty entry dated on another day. */
  bodyPlaceholderOtherDay: 'Écrivez le chapitre de ce jour… Le Markdown est bienvenu.',

  redo: 'Rétablir',
  /** Closes the editor but keeps unsaved work waiting in the draft strip. */
  minimize: 'Réduire',
  minimizeHint: 'Réduire — reprendre plus tard depuis la bande des brouillons',

  /** Status in the editor footer: the work is autosaved as a draft, not yet saved as an entry. */
  draftSaved: 'Brouillon enregistré',
  /** A shorter "Draft saved", for very narrow screens. */
  draftSavedShort: 'Enregistré',
  saveEntry: 'Enregistrer l’entrée',
  save: 'Enregistrer',
  /** The Save button while the entry is being written to the diary. */
  saving: 'Enregistrement',

  /** Length of the entry, as the editor and the reader show it. */
  chars: plural({ one: '{count} caractère', other: '{count} caractères' }),
  /** Both counts side by side; `{words}` and `{chars}` are already written out, like "12 words". */
  lengthBoth: '{words} · {chars}',

  spellingSuggestions: 'Suggestions orthographiques',
  noSuggestions: 'Aucune suggestion',
  addToDictionary: 'Ajouter au dictionnaire',
  /** Stop underlining this misspelled word (menu item). */
  ignoreWord: 'Ignorer',

  drafts: 'Brouillons',
  savedDrafts: 'Brouillons enregistrés',
  noDrafts: 'Aucun brouillon pour l’instant.',
  /** Tag on a draft that revises an existing entry rather than a new one. */
  draftIsEntryEdit: 'Modification',
  deleteDraft: 'Supprimer le brouillon',

  /** The draft strip reopens the minimized editor; `{title}` is the draft's title or start. */
  continueWriting: 'Reprendre la rédaction : {title}',
  /** Second line of the draft strip; `{day}` is the day the entry is dated. */
  stripEditingEntry: 'Modification d’une entrée · {day}',
  stripDraft: 'Brouillon · {day}',

  deleteDraftTitle: 'Supprimer le brouillon ?',
  discardDraftTitle: 'Abandonner le brouillon ?',
  discard: 'Abandonner',
  /** `{subject}` is the draft's title, shown emphasised. */
  deleteDraftBody: 'Le brouillon « {subject} » sera supprimé définitivement. Cette action est irréversible.',

  deleteEntry: 'Supprimer l’entrée',
  deleteEntryTitle: 'Supprimer l’entrée ?',
  /** `{subject}` is the entry's title, shown emphasised. */
  deleteEntryBodyDevice:
    'L’entrée « {subject} » sera supprimée définitivement de cet appareil. Cette action est irréversible.',
  deleteEntryBodyBrowser:
    'L’entrée « {subject} » sera supprimée définitivement de ce navigateur. Cette action est irréversible.',
};
