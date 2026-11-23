import { plural } from '../../format';

/** Encryption: setup, password management, the lock screen, recovery keys and encrypted exports. */
export default {
  // Passwords
  password: 'Password',
  newPassword: 'New password',
  currentPassword: 'Current password',
  repeatPassword: 'Repeat password',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  passwordTip: 'Tip: a phrase of 5–6 random words is strong and memorable.',
  passwordsDontMatch: "The passwords don't match.",
  passwordIncorrect: 'That password is not correct.',
  recoveryKeyIncorrect: 'That recovery key is not correct.',
  passwordTooShort: plural({
    one: 'Use at least {count} character.',
    other: 'Use at least {count} characters.',
  }),
  passwordWeak: 'Weak. A phrase of several random words is easier to remember and much stronger.',
  passwordFair: 'Fair. A few more words would make it strong.',
  passwordStrong: 'Strong.',

  // Recovery key
  recoveryKey: 'Recovery key',
  /** `{key}` is the recovery key, read out letter by letter. */
  recoveryKeyLabel: 'Recovery key {key}',
  recoveryKeyPlaceholder: 'XXXX-XXXX-XXXX-…',
  copy: 'Copy',
  copied: 'Copied',
  downloadTxt: 'Download .txt',
  recoveryKeyConfirm: 'To confirm you saved it, type its last four characters',
  /** The lines of the downloaded recovery key file. */
  recoveryKeyFileTitle: 'Icarus Diary recovery key',
  recoveryKeyFileKeepSafe: 'Keep this somewhere safe and separate from your diary.',
  recoveryKeyFileWarning: 'Anyone with this key can open your diary.',

  // Setup: shared
  /** The step counter under the title: "Step 1 of 2". */
  stepOf: 'Step {step} of {total}',
  noPasswordReset: 'No password reset. Lose the password and recovery key, lose the diary.',
  needsSecureConnection:
    'Needs a secure connection. Open Icarus over HTTPS (or on localhost), or use the desktop app.',
  encryptedNeedsSecureConnection: 'Encrypted diaries need HTTPS or the desktop app.',

  // Setup: choosing
  protectImportedTitle: 'Protect the imported diary?',
  protectNewTitle: 'Protect your new diary?',
  choiceIntroDevice: 'Choose how the diary is stored on this device. You can change this later in Settings.',
  choiceIntroBrowser: 'Choose how the diary is stored in this browser. You can change this later in Settings.',
  protectionLabel: 'Diary protection',
  encryptOption: 'Encrypt with a password',
  recommended: 'Recommended',
  encryptOptionHint:
    "Entries, drafts and your dictionary can't be read without the password. The diary locks itself when you step away.",
  plainOption: "Don't encrypt",
  plainOptionHintDevice: 'Opens without a password. Anyone with access to this device can read it.',
  plainOptionHintBrowser: 'Opens without a password. Anyone with access to this browser can read it.',
  importWithoutPassword: 'Import without password',
  createWithoutPassword: 'Create without password',
  saving: 'Saving',

  // Setup: password and recovery key
  chooseAPassword: 'Choose a password',
  protectWithPassword: 'Protect with a password',
  protectWithPasswordIntro: 'Encrypts your entries, drafts and dictionary.',
  preparing: 'Preparing',
  saveRecoveryKey: 'Save your recovery key',
  recoveryKeyIntro:
    "The only way in if you forget the password. Keep it apart from the diary, for example in a password manager. It won't be shown again.",
  encrypting: 'Encrypting',
  createEncryptedDiary: 'Create encrypted diary',
  importEncrypted: 'Import encrypted',
  encryptDiary: 'Encrypt diary',

  // Setup: done
  diaryEncrypted: 'Your diary is encrypted',
  doneFromSettings: 'Drafts and your dictionary are encrypted too.',
  doneNewOrImported: 'Entries, drafts and your dictionary are stored encrypted.',
  autoLockAfter: plural({
    one: 'It locks after {count} minute of inactivity.',
    other: 'It locks after {count} minutes of inactivity.',
  }),
  autoLockOff: 'Automatic locking is off.',
  importedFileUnchanged: 'The .ics you imported is unchanged and still readable. Delete it if you no longer need it.',
  earlierBackupsReadable: 'Backups you exported earlier are still readable.',
  openDiary: 'Open diary',

  // Managing encryption
  changePassword: 'Change password',
  changing: 'Changing',
  newRecoveryKey: 'New recovery key',
  generating: 'Generating',
  generateRecoveryKeyHint: 'Generate a new recovery key if the current one may have been seen by someone else.',
  newRecoveryKeyIntro: 'Save this new key somewhere safe. Once you confirm, the previous recovery key stops working.',
  replaceRecoveryKey: 'Replace recovery key',
  removeEncryption: 'Remove encryption',
  decrypting: 'Decrypting',
  removeEncryptionWarningDevice:
    'The diary, drafts and dictionary will be stored unencrypted. Anyone with access to this device will be able to read them.',
  removeEncryptionWarningBrowser:
    'The diary, drafts and dictionary will be stored unencrypted. Anyone with access to this browser will be able to read them.',
  passwordChanged: 'Password changed.',
  recoveryKeyReplaced: 'Recovery key replaced. The old one no longer works.',
  encryptionRemoved: 'Encryption removed.',

  // Lock screen
  diaryLocked: 'Diary locked',
  diaryIsEncrypted: 'This diary is encrypted.',
  unlockNeedsSecureConnection:
    'Unlocking needs a secure connection. Open Icarus over HTTPS (or on localhost), or use the desktop app.',
  unlock: 'Unlock',
  unlockAndSetPassword: 'Unlock and set new password',
  unlocking: 'Unlocking',
  forgotPassword: 'Forgot your password? Use the recovery key',
  usePasswordInstead: 'Use the password instead',
  deleteThisDiary: 'Delete this diary',
  deleteDiaryTitle: 'Delete this diary?',
  deleteDiaryConfirm: 'Delete diary',
  deleteDiaryWarningDevice:
    "The encrypted diary and its drafts will be permanently erased from this device. Only do this if the password and recovery key are lost. This can't be undone.",
  deleteDiaryWarningBrowser:
    "The encrypted diary and its drafts will be permanently erased from this browser. Only do this if the password and recovery key are lost. This can't be undone.",

  // Encrypted export
  exportBackup: 'Export backup',
  exportEncrypted: 'Encrypted backup (.icarus)',
  exportEncryptedHint: 'Recommended. Opens in Icarus with the same password or recovery key.',
  exportPlain: 'Unencrypted .ics',
  exportPlainHint: 'For calendar apps or other tools.',
  exportPlainWarning:
    'Anyone who gets this file can read your whole diary. Store it carefully and delete it when you no longer need it.',
  exportPlainConfirm: 'Export unencrypted',

  // Problems
  corruptDiary: 'This encrypted diary is damaged or was modified.',
  /** The diary was written by a later version of the app. */
  newerVersionDiary: 'This diary was encrypted by a newer version of Icarus',
  couldNotReadDiary: 'Could not read the diary.',
  couldNotSaveEncryptedDiary: 'Could not save the encrypted diary. Nothing was written.',
  couldNotEncryptDiary: 'Could not encrypt the diary. Nothing was changed.',
  couldNotRekey: 'Could not save the diary. The previous password still applies.',
  couldNotRemoveEncryption: 'Could not remove encryption. The diary is still encrypted.',
  copiesRemainDevice:
    'Older copies of the diary on this device could not be erased yet and can still be read without the current password. Icarus retries on every save.',
  copiesRemainBrowser:
    'Older copies of the diary in this browser could not be erased yet and can still be read without the current password. Icarus retries on every save.',
};
