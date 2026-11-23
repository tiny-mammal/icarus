import { plural } from '../../format';

/** The app shell, the welcome screen, importing and exporting, updates, installing, and the toasts the store raises. */
export default {
  // App shell
  calendar: 'Kalender',
  notifications: 'Benachrichtigungen',
  unsavedChangesTitle: 'Nicht gespeicherte Änderungen',
  quitAnyway: 'Trotzdem beenden',
  unsavedChangesBody:
    'Einige Änderungen, der aktuelle Entwurf oder das Tagebuch selbst konnten nicht im Tagebuchordner gespeichert werden. Wenn du jetzt beendest, gehen sie verloren.',

  // Welcome
  welcomeTitle: 'Icarus Tagebuch',
  welcomeTagline: 'Ein ruhiger, lokaler Ort für deine Tage.',
  welcomeIntro: 'Starte ein neues Tagebuch oder importiere eines, das du bereits führst.',
  startNewDiary: 'Neues Tagebuch starten',
  importDiary: 'Tagebuch importieren (.ics)',
  releaseToOpen: 'Loslassen zum Öffnen',
  chooseFileTouch: 'Tippe, um eine .ics- oder .icarus-Datei auszuwählen',
  chooseFileDesktop: 'Ziehe eine Datei hierher oder klicke, um zu suchen',
  nextProtect: 'Als Nächstes wählst du, ob du es mit einem Passwort schützen möchtest.',

  // Replacing the diary
  replaceTitle: 'Dein Tagebuch ersetzen?',
  replaceStartOver: 'Neu beginnen',
  replaceConfirm: 'Tagebuch ersetzen',
  /** The diary that is open is replaced by a new, empty one. `*…*` marks emphasis. */
  replaceOpenWithEmpty: plural({
    one: 'Dein Tagebuch mit *{count}* Eintrag wird durch ein leeres ersetzt, und seine Entwürfe und das persönliche Wörterbuch werden gelöscht.',
    other: 'Dein Tagebuch mit *{count}* Einträgen wird durch ein leeres ersetzt, und seine Entwürfe und das persönliche Wörterbuch werden gelöscht.',
  }),
  /** The diary that is open is replaced by the imported file. */
  replaceOpenWithImport: plural({
    one: 'Dein Tagebuch mit *{count}* Eintrag wird durch die importierte Datei ersetzt, und seine Entwürfe und das persönliche Wörterbuch werden gelöscht.',
    other: 'Dein Tagebuch mit *{count}* Einträgen wird durch die importierte Datei ersetzt, und seine Entwürfe und das persönliche Wörterbuch werden gelöscht.',
  }),
  /** The saved diary could not be opened, so only its place is known. */
  replaceSavedDeviceWithEmpty:
    'Das auf diesem Gerät gespeicherte Tagebuch wird durch ein leeres ersetzt, und seine Entwürfe und das persönliche Wörterbuch werden gelöscht.',
  replaceSavedDeviceWithImport:
    'Das auf diesem Gerät gespeicherte Tagebuch wird durch die importierte Datei ersetzt, und seine Entwürfe und das persönliche Wörterbuch werden gelöscht.',
  replaceSavedBrowserWithEmpty:
    'Das in diesem Browser gespeicherte Tagebuch wird durch ein leeres ersetzt, und seine Entwürfe und das persönliche Wörterbuch werden gelöscht.',
  replaceSavedBrowserWithImport:
    'Das in diesem Browser gespeicherte Tagebuch wird durch die importierte Datei ersetzt, und seine Entwürfe und das persönliche Wörterbuch werden gelöscht.',
  replaceKeepsCopy:
    'Eine Kopie von heute früher bleibt erhalten, aber exportiere vorher eine Sicherung, um deine neuesten Änderungen zu behalten.',
  replaceExportFirst: 'Exportiere vorher eine Sicherung, falls du sie zurückhaben möchtest. Das kann nicht rückgängig gemacht werden.',

  // Installing as a web app
  installTitle: 'App installieren',
  installIosTitle: 'Zum Home-Bildschirm hinzufügen',
  installIosIntro:
    'Icarus öffnet sich vom Home-Bildschirm im Vollbild wie jede andere App und funktioniert offline. Safari kann die Daten einer Website löschen, wenn du sie eine Weile nicht besuchst; die App auf dem Home-Bildschirm behält dein Tagebuch.',
  /** `{share}` and `{more}` stand for the Share and More icons. */
  installIosStepShare: 'Tippe im Browser auf die Teilen-Schaltfläche {share}. Wenn du sie nicht siehst, tippe zuerst auf {more}.',
  /** `*…*` marks the names of buttons in Safari. */
  installIosStepAdd:
    'Wähle *Zum Home-Bildschirm*. Vielleicht musst du nach unten scrollen oder auf *Mehr anzeigen* tippen, um es zu finden.',
  installIosStepConfirm: 'Tippe auf *Hinzufügen*. Icarus erscheint auf deinem Home-Bildschirm.',
  installIntro: 'Icarus kann sich in einem eigenen Fenster öffnen, wie jede andere App, und offline funktionieren.',
  /** `{more}` stands for the browser's three-dot menu icon. */
  installStepMenu: 'Öffne das Menü deines Browsers, meist {more} oder ☰ neben der Adresszeile.',
  /** `*…*` marks the names of menu items in browsers. */
  installStepChoose: 'Wähle *App installieren*, *Icarus installieren* oder *Zum Startbildschirm hinzufügen*.',
  installNotFound: 'Nicht gefunden? Chrome, Edge und Safari können Icarus alle installieren.',
  installBringEntries: 'Nimm deine Einträge mit',
  installBringEntriesHint:
    'Die installierte App hat ihr eigenes Tagebuch, getrennt von dem in diesem Browser. Exportiere jetzt eine Sicherung und importiere sie, wenn du die App zum ersten Mal öffnest.',
  exportBackup: 'Sicherung exportieren',

  // Updates
  /** `{version}` is a version number, like 0.9.0. */
  updateReady: 'Icarus {version} ist verfügbar',
  /** `{ago}` reads like "3 weeks ago". */
  updateReleased: 'Veröffentlicht {ago}',
  updateGet: 'Update holen',
  updateLater: 'Später',
  updateInstallHint: 'Installiere die neue Version über dieser. Dein Tagebuch bleibt, wo es ist.',
  updateDismiss: 'Bis zum nächsten Start ausblenden',
  reminderTitle: 'Nach einer neueren Version von Icarus suchen?',
  /** `{version}` is the installed version and `{month}` the month it was built, like "October" or "October 2025". `*…*` marks emphasis. */
  reminderBuilt: 'Du nutzt *{version}* von {month}.',
  /** Used when the build date is unknown. */
  reminderNoDate: 'Du nutzt *{version}*.',
  reminderBenefit: 'Neue Versionen bringen Fehlerbehebungen und neue Funktionen.',
  reminderCheck: 'Nach Updates suchen',
  reminderChecking: 'Prüfen…',
  reminderNotNow: 'Nicht jetzt',
  reminderRemindNextMonth: 'Nächsten Monat erinnern',
  /** `{version}` is the installed version. */
  upToDate: 'Du hast die neueste Version, {version}.',
  updateUnreachable: 'icarus.4oli.com ist nicht erreichbar. Versuche es später noch einmal.',

  // File dialogs
  importDialogTitle: 'Tagebuch importieren',
  exportDialogTitle: 'Tagebuch exportieren',

  // Toasts: opening and importing
  couldNotOpenSavedDiary: 'Das gespeicherte Tagebuch konnte nicht geöffnet werden.',
  couldNotOpenDiary: 'Dieses Tagebuch konnte nicht geöffnet werden.',
  /** `{error}` is the reason, written by the file parser (in English). */
  couldNotReadFile: 'Diese Datei konnte nicht gelesen werden — {error}',
  couldNotSaveDiary: 'Das Tagebuch konnte nicht gespeichert werden.',
  couldNotSaveDiaryInLocation: 'Das Tagebuch konnte am ausgewählten Ort nicht gespeichert werden.',
  couldNotCreateDiary: 'Das Tagebuch konnte nicht erstellt werden.',
  couldNotReplaceDiary: 'Das Tagebuch konnte nicht ersetzt werden.',
  replacedButDraftsRemain: 'Das Tagebuch wurde ersetzt, aber die alten Entwürfe konnten nicht gelöscht werden.',
  couldNotImportDiary: 'Dieses Tagebuch konnte nicht importiert werden.',
  dropDiaryFile: 'Bitte ziehe eine .ics- oder .icarus-Datei hierher.',
  couldNotOpenFile: 'Diese Datei konnte nicht geöffnet werden.',
  couldNotDeleteDiary: 'Das Tagebuch konnte nicht gelöscht werden.',

  // Toasts: exporting
  backupExported: 'Sicherung exportiert.',
  encryptedBackupExported: 'Verschlüsselte Sicherung exportiert.',
  backupExists: 'Sicherung existiert bereits. Wähle einen neuen Dateinamen.',
  exportFailed: 'Export fehlgeschlagen.',

  // Toasts: saving
  savedDevice: 'Auf diesem Gerät gespeichert',
  savedBrowser: 'In diesem Browser gespeichert',
  writeFailed: 'Schreiben fehlgeschlagen — deine Änderungen sind noch im Arbeitsspeicher.',

  // Toasts: entries, drafts and the dictionary
  writeSomethingFirst: 'Schreibe zuerst etwas.',
  entryGone: 'Der ursprüngliche Eintrag ist nicht mehr verfügbar.',
  entryUpdated: 'Eintrag aktualisiert',
  entryDeleted: 'Eintrag gelöscht',
  couldNotReadDrafts: 'Deine Entwürfe konnten nicht gelesen werden.',
  draftNotSaved: 'Entwurf nicht gespeichert — dein Text steht noch im Editor.',
  couldNotUpdateDrafts: 'Entwürfe konnten nicht aktualisiert werden.',
  draftDiscarded: 'Entwurf verworfen',
  draftDeleted: 'Entwurf gelöscht',
  /** `{word}` is the word that was added. */
  wordAdded: '„{word}“ zu deinem Wörterbuch hinzugefügt',
  /** `{word}` is the word that was removed. */
  wordRemoved: '„{word}“ entfernt',
};
