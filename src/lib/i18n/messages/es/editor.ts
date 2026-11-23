import { plural } from '../../format';

/** Writing: the entry editor, the spelling menu, drafts, deleting entries and the length count. */
export default {
  newEntry: 'Nueva entrada',
  editEntry: 'Editar entrada',
  titlePlaceholder: 'Título',
  locationPlaceholder: 'Añade un lugar o subtítulo',
  /** Placeholder of an empty entry dated today. */
  bodyPlaceholderToday: 'Escribe el capítulo de hoy… Se admite Markdown.',
  /** Placeholder of an empty entry dated on another day. */
  bodyPlaceholderOtherDay: 'Escribe el capítulo de este día… Se admite Markdown.',

  redo: 'Rehacer',
  /** Closes the editor but keeps unsaved work waiting in the draft strip. */
  minimize: 'Minimizar',
  minimizeHint: 'Minimizar: sigue escribiendo más tarde desde la franja',

  /** Status in the editor footer: the work is autosaved as a draft, not yet saved as an entry. */
  draftSaved: 'Borrador guardado',
  /** A shorter "Draft saved", for very narrow screens. */
  draftSavedShort: 'Guardado',
  saveEntry: 'Guardar entrada',
  save: 'Guardar',
  /** The Save button while the entry is being written to the diary. */
  saving: 'Guardando',

  /** Length of the entry, as the editor and the reader show it. */
  chars: plural({ one: '{count} carácter', other: '{count} caracteres' }),
  /** Both counts side by side; `{words}` and `{chars}` are already written out, like "12 words". */
  lengthBoth: '{words} · {chars}',

  spellingSuggestions: 'Sugerencias ortográficas',
  noSuggestions: 'Sin sugerencias',
  addToDictionary: 'Añadir al diccionario',
  /** Stop underlining this misspelled word (menu item). */
  ignoreWord: 'Ignorar',

  drafts: 'Borradores',
  savedDrafts: 'Borradores guardados',
  noDrafts: 'Aún no hay borradores.',
  /** Tag on a draft that revises an existing entry rather than a new one. */
  draftIsEntryEdit: 'Edición de entrada',
  deleteDraft: 'Eliminar borrador',

  /** The draft strip reopens the minimized editor; `{title}` is the draft's title or start. */
  continueWriting: 'Seguir escribiendo: {title}',
  /** Second line of the draft strip; `{day}` is the day the entry is dated. */
  stripEditingEntry: 'Editando entrada · {day}',
  stripDraft: 'Borrador · {day}',

  deleteDraftTitle: '¿Eliminar borrador?',
  discardDraftTitle: '¿Descartar borrador?',
  discard: 'Descartar',
  /** `{subject}` is the draft's title, shown emphasised. */
  deleteDraftBody: '{subject} se eliminará para siempre. Esto no se puede deshacer.',

  deleteEntry: 'Eliminar entrada',
  deleteEntryTitle: '¿Eliminar entrada?',
  /** `{subject}` is the entry's title, shown emphasised. */
  deleteEntryBodyDevice: '{subject} se eliminará para siempre de este dispositivo. Esto no se puede deshacer.',
  deleteEntryBodyBrowser: '{subject} se eliminará para siempre de este navegador. Esto no se puede deshacer.',
};
