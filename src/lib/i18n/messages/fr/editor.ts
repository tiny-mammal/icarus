import { plural } from '../../format';

/** Writing: the entry editor, the spelling menu, drafts, deleting entries and the length count. */
export default {
  newEntry: 'New entry',
  editEntry: 'Edit entry',
  titlePlaceholder: 'Title',
  locationPlaceholder: 'Add a location or subtitle',
  /** Placeholder of an empty entry dated today. */
  bodyPlaceholderToday: "Write today's chapter… Markdown is welcome.",
  /** Placeholder of an empty entry dated on another day. */
  bodyPlaceholderOtherDay: 'Write this day’s chapter… Markdown is welcome.',

  redo: 'Redo',
  /** Closes the editor but keeps unsaved work waiting in the draft strip. */
  minimize: 'Minimize',
  minimizeHint: 'Minimize — keep writing later from the strip',

  /** Status in the editor footer: the work is autosaved as a draft, not yet saved as an entry. */
  draftSaved: 'Draft saved',
  /** A shorter "Draft saved", for very narrow screens. */
  draftSavedShort: 'Saved',
  saveEntry: 'Save entry',
  save: 'Save',
  /** The Save button while the entry is being written to the diary. */
  saving: 'Saving',

  /** Length of the entry, as the editor and the reader show it. */
  chars: plural({ one: '{count} char', other: '{count} chars' }),
  /** Both counts side by side; `{words}` and `{chars}` are already written out, like "12 words". */
  lengthBoth: '{words} · {chars}',

  spellingSuggestions: 'Spelling suggestions',
  noSuggestions: 'No suggestions',
  addToDictionary: 'Add to dictionary',
  /** Stop underlining this misspelled word (menu item). */
  ignoreWord: 'Ignore',

  drafts: 'Drafts',
  savedDrafts: 'Saved drafts',
  noDrafts: 'No drafts yet.',
  /** Tag on a draft that revises an existing entry rather than a new one. */
  draftIsEntryEdit: 'Entry edit',
  deleteDraft: 'Delete draft',

  /** The draft strip reopens the minimized editor; `{title}` is the draft's title or start. */
  continueWriting: 'Continue writing: {title}',
  /** Second line of the draft strip; `{day}` is the day the entry is dated. */
  stripEditingEntry: 'Editing entry · {day}',
  stripDraft: 'Draft · {day}',

  deleteDraftTitle: 'Delete draft?',
  discardDraftTitle: 'Discard draft?',
  discard: 'Discard',
  /** `{subject}` is the draft's title, shown emphasised. */
  deleteDraftBody: "{subject} will be permanently removed. This can't be undone.",

  deleteEntry: 'Delete entry',
  deleteEntryTitle: 'Delete entry?',
  /** `{subject}` is the entry's title, shown emphasised. */
  deleteEntryBodyDevice: "{subject} will be permanently removed from this device. This can't be undone.",
  deleteEntryBodyBrowser: "{subject} will be permanently removed from this browser. This can't be undone.",
};
