import { plural } from '../../format';

/** The app shell, the welcome screen, importing and exporting, updates, installing, and the toasts the store raises. */
export default {
  // App shell
  calendar: 'Calendar',
  notifications: 'Notifications',
  unsavedChangesTitle: 'Unsaved changes',
  quitAnyway: 'Quit anyway',
  unsavedChangesBody:
    'Some changes, the current draft or the diary itself, could not be saved to the diary folder. Quitting now discards them.',

  // Welcome
  welcomeTitle: 'Icarus Diary',
  welcomeTagline: 'A quiet, local-first place for your days.',
  welcomeIntro: 'Start a new diary, or bring in one you already keep.',
  startNewDiary: 'Start a new diary',
  importDiary: 'Import a diary (.ics)',
  releaseToOpen: 'Release to open',
  chooseFileTouch: 'Tap to choose a .ics or .icarus file',
  chooseFileDesktop: 'Drag & drop a file here, or click to browse',
  nextProtect: "Next, you'll choose whether to protect it with a password.",

  // Replacing the diary
  replaceTitle: 'Replace your diary?',
  replaceStartOver: 'Start over',
  replaceConfirm: 'Replace diary',
  /** The diary that is open is replaced by a new, empty one. `*…*` marks emphasis. */
  replaceOpenWithEmpty: plural({
    one: 'Your diary with *{count}* entry will be replaced by an empty one, and its drafts and personal dictionary erased.',
    other: 'Your diary with *{count}* entries will be replaced by an empty one, and its drafts and personal dictionary erased.',
  }),
  /** The diary that is open is replaced by the imported file. */
  replaceOpenWithImport: plural({
    one: 'Your diary with *{count}* entry will be replaced by the imported file, and its drafts and personal dictionary erased.',
    other: 'Your diary with *{count}* entries will be replaced by the imported file, and its drafts and personal dictionary erased.',
  }),
  /** The saved diary could not be opened, so only its place is known. */
  replaceSavedDeviceWithEmpty:
    'The diary saved on this device will be replaced by an empty one, and its drafts and personal dictionary erased.',
  replaceSavedDeviceWithImport:
    'The diary saved on this device will be replaced by the imported file, and its drafts and personal dictionary erased.',
  replaceSavedBrowserWithEmpty:
    'The diary saved in this browser will be replaced by an empty one, and its drafts and personal dictionary erased.',
  replaceSavedBrowserWithImport:
    'The diary saved in this browser will be replaced by the imported file, and its drafts and personal dictionary erased.',
  replaceKeepsCopy: 'A copy from earlier today is kept, but export a backup first to keep your latest changes.',
  replaceExportFirst: "Export a backup first if you may want it back. This can't be undone.",

  // Installing as a web app
  installTitle: 'Install the app',
  installIosTitle: 'Add to Home Screen',
  installIosIntro:
    "Icarus will open full screen from your Home Screen, like any other app, and work offline. Safari can also clear a website's data if you don't visit it for a while; the Home Screen app keeps your diary.",
  /** `{share}` and `{more}` stand for the Share and More icons. */
  installIosStepShare: "Tap the Share button {share} in the browser. If you don't see it, tap {more} first.",
  /** `*…*` marks the names of buttons in Safari. */
  installIosStepAdd:
    'Choose *Add to Home Screen*. You may need to scroll down or tap *View More* to find it.',
  installIosStepConfirm: 'Tap *Add*. Icarus appears on your Home Screen.',
  installIntro: 'Icarus can open in its own window, like any other app, and work offline.',
  /** `{more}` stands for the browser's three-dot menu icon. */
  installStepMenu: "Open your browser's menu, usually {more} or ☰ next to the address bar.",
  /** `*…*` marks the names of menu items in browsers. */
  installStepChoose: 'Choose *Install app*, *Install Icarus* or *Add to Home screen*.',
  installNotFound: "Don't see it? Chrome, Edge and Safari can all install Icarus.",
  installBringEntries: 'Bring your entries with you',
  installBringEntriesHint:
    'The installed app keeps its own diary, separate from the one in this browser. Export a backup now, then import it the first time you open the app.',
  exportBackup: 'Export backup',

  // Updates
  /** `{version}` is a version number, like 0.9.0. */
  updateReady: 'Icarus {version} is ready',
  /** `{ago}` reads like "3 weeks ago". */
  updateReleased: 'Released {ago}',
  updateGet: 'Get the update',
  updateLater: 'Later',
  updateInstallHint: 'Install the new version over this one. Your diary stays where it is.',
  updateDismiss: 'Dismiss until next launch',
  reminderTitle: 'Look for a newer Icarus?',
  /** `{version}` is the installed version and `{month}` the month it was built, like "October" or "October 2025". `*…*` marks emphasis. */
  reminderBuilt: "You're on *{version}*, from {month}.",
  /** Used when the build date is unknown. */
  reminderNoDate: "You're on *{version}*.",
  reminderBenefit: 'New versions bring fixes and new features.',
  reminderCheck: 'Check for updates',
  reminderChecking: 'Checking…',
  reminderNotNow: 'Not now',
  reminderRemindNextMonth: 'Remind me next month',
  /** `{version}` is the installed version. */
  upToDate: 'You have the latest version, {version}.',
  updateUnreachable: 'Could not reach icarus.4oli.com. Try again later.',

  // File dialogs
  importDialogTitle: 'Import diary',
  exportDialogTitle: 'Export diary',

  // Toasts: opening and importing
  couldNotOpenSavedDiary: 'Could not open the saved diary.',
  couldNotOpenDiary: 'Could not open that diary.',
  /** `{error}` is the reason, written by the file parser (in English). */
  couldNotReadFile: "Couldn't read this file — {error}",
  couldNotSaveDiary: 'Could not save the diary.',
  couldNotSaveDiaryInLocation: 'Could not save the diary in the selected location.',
  couldNotCreateDiary: 'Could not create the diary.',
  couldNotReplaceDiary: 'Could not replace the diary.',
  replacedButDraftsRemain: 'The diary was replaced, but the old drafts could not be erased.',
  couldNotImportDiary: 'Could not import that diary.',
  dropDiaryFile: 'Please drop an .ics or .icarus file.',
  couldNotOpenFile: 'Could not open that file.',
  couldNotDeleteDiary: 'Could not delete the diary.',

  // Toasts: exporting
  backupExported: 'Backup exported.',
  encryptedBackupExported: 'Encrypted backup exported.',
  backupExists: 'Backup already exists. Choose a new filename.',
  exportFailed: 'Export failed.',

  // Toasts: saving
  savedDevice: 'Saved on this device',
  savedBrowser: 'Saved in this browser',
  writeFailed: 'Write failed — your changes are still in memory.',

  // Toasts: entries, drafts and the dictionary
  writeSomethingFirst: 'Write something first.',
  entryGone: 'The original entry is no longer available.',
  entryUpdated: 'Entry updated',
  entryDeleted: 'Entry deleted',
  couldNotReadDrafts: 'Could not read your drafts.',
  draftNotSaved: 'Draft not saved — your text is still in the editor.',
  couldNotUpdateDrafts: 'Could not update drafts.',
  draftDiscarded: 'Draft discarded',
  draftDeleted: 'Draft deleted',
  /** `{word}` is the word that was added. */
  wordAdded: 'Added “{word}” to your dictionary',
  /** `{word}` is the word that was removed. */
  wordRemoved: 'Removed “{word}”',
};
