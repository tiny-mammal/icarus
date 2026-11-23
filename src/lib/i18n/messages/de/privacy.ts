import { plural } from '../../format';

/** Encryption: setup, password management, the lock screen, recovery keys and encrypted exports. */
export default {
  // Passwords
  password: 'Passwort',
  newPassword: 'Neues Passwort',
  currentPassword: 'Aktuelles Passwort',
  repeatPassword: 'Passwort wiederholen',
  showPassword: 'Passwort anzeigen',
  hidePassword: 'Passwort verbergen',
  passwordTip: 'Tipp: Eine Phrase aus 5–6 zufälligen Wörtern ist stark und leicht zu merken.',
  passwordsDontMatch: 'Die Passwörter stimmen nicht überein.',
  passwordIncorrect: 'Das Passwort ist nicht korrekt.',
  recoveryKeyIncorrect: 'Der Wiederherstellungsschlüssel ist nicht korrekt.',
  passwordTooShort: plural({
    one: 'Verwende mindestens {count} Zeichen.',
    other: 'Verwende mindestens {count} Zeichen.',
  }),
  passwordWeak: 'Schwach. Eine Phrase aus mehreren zufälligen Wörtern ist leichter zu merken und viel stärker.',
  passwordFair: 'Okay. Ein paar Wörter mehr würden es stark machen.',
  passwordStrong: 'Stark.',

  // Recovery key
  recoveryKey: 'Wiederherstellungsschlüssel',
  /** `{key}` is the recovery key, read out letter by letter. */
  recoveryKeyLabel: 'Wiederherstellungsschlüssel {key}',
  recoveryKeyPlaceholder: 'XXXX-XXXX-XXXX-…',
  copy: 'Kopieren',
  copied: 'Kopiert',
  downloadTxt: '.txt herunterladen',
  recoveryKeyConfirm: 'Tippe zur Bestätigung, dass du ihn gespeichert hast, seine letzten vier Zeichen ein',
  /** The lines of the downloaded recovery key file. */
  recoveryKeyFileTitle: 'Icarus Tagebuch Wiederherstellungsschlüssel',
  recoveryKeyFileKeepSafe: 'Bewahre ihn sicher und getrennt von deinem Tagebuch auf.',
  recoveryKeyFileWarning: 'Jeder, der diesen Schlüssel hat, kann dein Tagebuch öffnen.',

  // Setup: shared
  /** The step counter under the title: "Step 1 of 2". */
  stepOf: 'Schritt {step} von {total}',
  noPasswordReset: 'Kein Zurücksetzen des Passworts. Wer Passwort und Wiederherstellungsschlüssel verliert, verliert das Tagebuch.',
  needsSecureConnection:
    'Braucht eine sichere Verbindung. Öffne Icarus über HTTPS (oder auf localhost) oder nutze die Desktop-App.',
  encryptedNeedsSecureConnection: 'Verschlüsselte Tagebücher brauchen HTTPS oder die Desktop-App.',

  // Setup: choosing
  protectImportedTitle: 'Das importierte Tagebuch schützen?',
  protectNewTitle: 'Dein neues Tagebuch schützen?',
  choiceIntroDevice: 'Wähle, wie das Tagebuch auf diesem Gerät gespeichert wird. Du kannst das später in den Einstellungen ändern.',
  choiceIntroBrowser: 'Wähle, wie das Tagebuch in diesem Browser gespeichert wird. Du kannst das später in den Einstellungen ändern.',
  protectionLabel: 'Tagebuchschutz',
  encryptOption: 'Mit Passwort verschlüsseln',
  recommended: 'Empfohlen',
  encryptOptionHint:
    'Einträge, Entwürfe und dein Wörterbuch sind ohne Passwort nicht lesbar. Das Tagebuch sperrt sich selbst, wenn du weggehst.',
  plainOption: 'Nicht verschlüsseln',
  plainOptionHintDevice: 'Öffnet sich ohne Passwort. Wer Zugriff auf dieses Gerät hat, kann es lesen.',
  plainOptionHintBrowser: 'Öffnet sich ohne Passwort. Wer Zugriff auf diesen Browser hat, kann es lesen.',
  importWithoutPassword: 'Ohne Passwort importieren',
  createWithoutPassword: 'Ohne Passwort erstellen',
  saving: 'Wird gespeichert',

  // Setup: password and recovery key
  chooseAPassword: 'Passwort wählen',
  protectWithPassword: 'Mit einem Passwort schützen',
  protectWithPasswordIntro: 'Verschlüsselt deine Einträge, Entwürfe und dein Wörterbuch.',
  preparing: 'Wird vorbereitet',
  saveRecoveryKey: 'Speichere deinen Wiederherstellungsschlüssel',
  recoveryKeyIntro:
    'Der einzige Weg hinein, falls du das Passwort vergisst. Bewahre ihn getrennt vom Tagebuch auf, zum Beispiel in einem Passwort-Manager. Er wird nicht noch einmal angezeigt.',
  encrypting: 'Wird verschlüsselt',
  createEncryptedDiary: 'Verschlüsseltes Tagebuch erstellen',
  importEncrypted: 'Verschlüsselt importieren',
  encryptDiary: 'Tagebuch verschlüsseln',

  // Setup: done
  diaryEncrypted: 'Dein Tagebuch ist verschlüsselt',
  doneFromSettings: 'Entwürfe und dein Wörterbuch sind ebenfalls verschlüsselt.',
  doneNewOrImported: 'Einträge, Entwürfe und dein Wörterbuch werden verschlüsselt gespeichert.',
  autoLockAfter: plural({
    one: 'Es sperrt sich nach {count} Minute ohne Aktivität.',
    other: 'Es sperrt sich nach {count} Minuten ohne Aktivität.',
  }),
  autoLockOff: 'Automatisches Sperren ist aus.',
  importedFileUnchanged:
    'Die importierte .ics-Datei ist unverändert und weiterhin lesbar. Lösche sie, wenn du sie nicht mehr brauchst.',
  earlierBackupsReadable: 'Zuvor exportierte Sicherungen sind weiterhin lesbar.',
  openDiary: 'Tagebuch öffnen',

  // Managing encryption
  changePassword: 'Passwort ändern',
  changing: 'Wird geändert',
  newRecoveryKey: 'Neuer Wiederherstellungsschlüssel',
  generating: 'Wird erzeugt',
  generateRecoveryKeyHint: 'Erzeuge einen neuen Wiederherstellungsschlüssel, wenn der aktuelle möglicherweise von anderen gesehen wurde.',
  newRecoveryKeyIntro:
    'Bewahre diesen neuen Schlüssel sicher auf. Sobald du bestätigst, funktioniert der bisherige Wiederherstellungsschlüssel nicht mehr.',
  replaceRecoveryKey: 'Wiederherstellungsschlüssel ersetzen',
  removeEncryption: 'Verschlüsselung entfernen',
  decrypting: 'Wird entschlüsselt',
  removeEncryptionWarningDevice:
    'Das Tagebuch, die Entwürfe und das Wörterbuch werden unverschlüsselt gespeichert. Wer Zugriff auf dieses Gerät hat, kann sie lesen.',
  removeEncryptionWarningBrowser:
    'Das Tagebuch, die Entwürfe und das Wörterbuch werden unverschlüsselt gespeichert. Wer Zugriff auf diesen Browser hat, kann sie lesen.',
  passwordChanged: 'Passwort geändert.',
  recoveryKeyReplaced: 'Wiederherstellungsschlüssel ersetzt. Der alte funktioniert nicht mehr.',
  encryptionRemoved: 'Verschlüsselung entfernt.',

  // Lock screen
  diaryLocked: 'Tagebuch gesperrt',
  diaryIsEncrypted: 'Dieses Tagebuch ist verschlüsselt.',
  unlockNeedsSecureConnection:
    'Zum Entsperren braucht es eine sichere Verbindung. Öffne Icarus über HTTPS (oder auf localhost) oder nutze die Desktop-App.',
  unlock: 'Entsperren',
  unlockAndSetPassword: 'Entsperren und neues Passwort festlegen',
  unlocking: 'Wird entsperrt',
  forgotPassword: 'Passwort vergessen? Nutze den Wiederherstellungsschlüssel',
  usePasswordInstead: 'Stattdessen das Passwort verwenden',
  deleteThisDiary: 'Dieses Tagebuch löschen',
  deleteDiaryTitle: 'Dieses Tagebuch löschen?',
  deleteDiaryConfirm: 'Tagebuch löschen',
  deleteDiaryWarningDevice:
    'Das verschlüsselte Tagebuch und seine Entwürfe werden dauerhaft von diesem Gerät gelöscht. Tu das nur, wenn Passwort und Wiederherstellungsschlüssel verloren sind. Das kann nicht rückgängig gemacht werden.',
  deleteDiaryWarningBrowser:
    'Das verschlüsselte Tagebuch und seine Entwürfe werden dauerhaft aus diesem Browser gelöscht. Tu das nur, wenn Passwort und Wiederherstellungsschlüssel verloren sind. Das kann nicht rückgängig gemacht werden.',

  // Encrypted export
  exportBackup: 'Sicherung exportieren',
  exportEncrypted: 'Verschlüsselte Sicherung (.icarus)',
  exportEncryptedHint: 'Empfohlen. Öffnet sich in Icarus mit demselben Passwort oder Wiederherstellungsschlüssel.',
  exportPlain: 'Unverschlüsselte .ics',
  exportPlainHint: 'Für Kalender-Apps oder andere Werkzeuge.',
  exportPlainWarning:
    'Wer diese Datei bekommt, kann dein ganzes Tagebuch lesen. Bewahre sie sorgfältig auf und lösche sie, wenn du sie nicht mehr brauchst.',
  exportPlainConfirm: 'Unverschlüsselt exportieren',

  // Problems
  corruptDiary: 'Dieses verschlüsselte Tagebuch ist beschädigt oder wurde verändert.',
  /** The diary was written by a later version of the app. */
  newerVersionDiary: 'Dieses Tagebuch wurde mit einer neueren Version von Icarus verschlüsselt',
  couldNotReadDiary: 'Das Tagebuch konnte nicht gelesen werden.',
  couldNotSaveEncryptedDiary: 'Das verschlüsselte Tagebuch konnte nicht gespeichert werden. Es wurde nichts geschrieben.',
  couldNotEncryptDiary: 'Das Tagebuch konnte nicht verschlüsselt werden. Es wurde nichts verändert.',
  couldNotRekey: 'Das Tagebuch konnte nicht gespeichert werden. Das bisherige Passwort gilt weiterhin.',
  couldNotRemoveEncryption: 'Die Verschlüsselung konnte nicht entfernt werden. Das Tagebuch ist weiterhin verschlüsselt.',
  copiesRemainDevice:
    'Ältere Kopien des Tagebuchs auf diesem Gerät konnten noch nicht gelöscht werden und sind ohne das aktuelle Passwort weiterhin lesbar. Icarus versucht es bei jedem Speichern erneut.',
  copiesRemainBrowser:
    'Ältere Kopien des Tagebuchs in diesem Browser konnten noch nicht gelöscht werden und sind ohne das aktuelle Passwort weiterhin lesbar. Icarus versucht es bei jedem Speichern erneut.',
};
