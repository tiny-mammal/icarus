import { plural } from '../../format';

/** Words used all over the app. */
export default {
  appName: 'Icarus',
  cancel: 'Cancel',
  close: 'Close',
  back: 'Back',
  add: 'Add',
  remove: 'Remove',
  restore: 'Restore',
  delete: 'Delete',
  undo: 'Undo',
  done: 'Done',
  continue: 'Continue',
  untitled: 'Untitled',
  loading: 'Loading Icarus',
  entries: plural({ one: '{count} entry', other: '{count} entries' }),
  words: plural({ one: '{count} word', other: '{count} words' }),
  days: plural({ one: '{count} day', other: '{count} days' }),
  /** What holds the diary, as a row label. */
  place: { device: 'This device', browser: 'This browser' },
  couldNotSaveSettings: 'Could not save settings.',
};
