import { plural } from '../../format';

/** Encryption: setup, password management, the lock screen, recovery keys and encrypted exports. */
export default {
  // Passwords
  password: 'Password',
  newPassword: 'Nuova password',
  currentPassword: 'Password attuale',
  repeatPassword: 'Ripeti password',
  showPassword: 'Mostra password',
  hidePassword: 'Nascondi password',
  passwordTip: 'Suggerimento: una frase di 5–6 parole casuali è sicura e facile da ricordare.',
  passwordsDontMatch: 'Le password non coincidono.',
  passwordIncorrect: 'Questa password non è corretta.',
  recoveryKeyIncorrect: 'Questa chiave di recupero non è corretta.',
  passwordTooShort: plural({
    one: 'Usa almeno {count} carattere.',
    other: 'Usa almeno {count} caratteri.',
  }),
  passwordWeak: 'Debole. Una frase di più parole casuali è più facile da ricordare e molto più sicura.',
  passwordFair: 'Discreta. Qualche parola in più la renderebbe sicura.',
  passwordStrong: 'Sicura.',

  // Recovery key
  recoveryKey: 'Chiave di recupero',
  /** `{key}` is the recovery key, read out letter by letter. */
  recoveryKeyLabel: 'Chiave di recupero {key}',
  recoveryKeyPlaceholder: 'XXXX-XXXX-XXXX-…',
  copy: 'Copia',
  copied: 'Copiata',
  downloadTxt: 'Scarica .txt',
  recoveryKeyConfirm: 'Per confermare di averla salvata, scrivi i suoi ultimi quattro caratteri',
  /** The lines of the downloaded recovery key file. */
  recoveryKeyFileTitle: 'Chiave di recupero di Icarus Diary',
  recoveryKeyFileKeepSafe: 'Conservala in un luogo sicuro, separato dal tuo diario.',
  recoveryKeyFileWarning: 'Chiunque abbia questa chiave può aprire il tuo diario.',

  // Setup: shared
  /** The step counter under the title: "Step 1 of 2". */
  stepOf: 'Passaggio {step} di {total}',
  noPasswordReset: 'Nessun ripristino della password. Se perdi la password e la chiave di recupero, perdi il diario.',
  needsSecureConnection:
    'Richiede una connessione sicura. Apri Icarus tramite HTTPS (o su localhost), oppure usa l’app desktop.',
  encryptedNeedsSecureConnection: 'I diari cifrati richiedono HTTPS o l’app desktop.',

  // Setup: choosing
  protectImportedTitle: 'Proteggere il diario importato?',
  protectNewTitle: 'Proteggere il tuo nuovo diario?',
  choiceIntroDevice: 'Scegli come viene salvato il diario su questo dispositivo. Puoi cambiarlo più tardi nelle Impostazioni.',
  choiceIntroBrowser: 'Scegli come viene salvato il diario in questo browser. Puoi cambiarlo più tardi nelle Impostazioni.',
  protectionLabel: 'Protezione del diario',
  encryptOption: 'Cifra con una password',
  recommended: 'Consigliato',
  encryptOptionHint:
    'Voci, bozze e dizionario non si possono leggere senza la password. Il diario si blocca da solo quando ti allontani.',
  plainOption: 'Non cifrare',
  plainOptionHintDevice: 'Si apre senza password. Chiunque abbia accesso a questo dispositivo può leggerlo.',
  plainOptionHintBrowser: 'Si apre senza password. Chiunque abbia accesso a questo browser può leggerlo.',
  importWithoutPassword: 'Importa senza password',
  createWithoutPassword: 'Crea senza password',
  saving: 'Salvataggio',

  // Setup: password and recovery key
  chooseAPassword: 'Scegli una password',
  protectWithPassword: 'Proteggi con una password',
  protectWithPasswordIntro: 'Cifra voci, bozze e dizionario.',
  preparing: 'Preparazione',
  saveRecoveryKey: 'Salva la chiave di recupero',
  recoveryKeyIntro:
    'È l’unico modo per entrare se dimentichi la password. Tienila separata dal diario, per esempio in un gestore di password. Non verrà mostrata di nuovo.',
  encrypting: 'Cifratura',
  createEncryptedDiary: 'Crea diario cifrato',
  importEncrypted: 'Importa cifrato',
  encryptDiary: 'Cifra diario',

  // Setup: done
  diaryEncrypted: 'Il tuo diario è cifrato',
  doneFromSettings: 'Anche le bozze e il dizionario sono cifrati.',
  doneNewOrImported: 'Voci, bozze e dizionario sono salvati cifrati.',
  autoLockAfter: plural({
    one: 'Si blocca dopo {count} minuto di inattività.',
    other: 'Si blocca dopo {count} minuti di inattività.',
  }),
  autoLockOff: 'Il blocco automatico è disattivato.',
  importedFileUnchanged: 'Il file .ics che hai importato non è cambiato ed è ancora leggibile. Eliminalo se non ti serve più.',
  earlierBackupsReadable: 'I backup esportati in precedenza sono ancora leggibili.',
  openDiary: 'Apri diario',

  // Managing encryption
  changePassword: 'Cambia password',
  changing: 'Modifica in corso',
  newRecoveryKey: 'Nuova chiave di recupero',
  generating: 'Generazione',
  generateRecoveryKeyHint: 'Genera una nuova chiave di recupero se quella attuale potrebbe essere stata vista da altri.',
  newRecoveryKeyIntro: 'Salva questa nuova chiave in un luogo sicuro. Quando confermi, la chiave di recupero precedente smette di funzionare.',
  replaceRecoveryKey: 'Sostituisci chiave di recupero',
  removeEncryption: 'Rimuovi cifratura',
  decrypting: 'Decifratura',
  removeEncryptionWarningDevice:
    'Il diario, le bozze e il dizionario verranno salvati senza cifratura. Chiunque abbia accesso a questo dispositivo potrà leggerli.',
  removeEncryptionWarningBrowser:
    'Il diario, le bozze e il dizionario verranno salvati senza cifratura. Chiunque abbia accesso a questo browser potrà leggerli.',
  passwordChanged: 'Password cambiata.',
  recoveryKeyReplaced: 'Chiave di recupero sostituita. La precedente non funziona più.',
  encryptionRemoved: 'Cifratura rimossa.',

  // Lock screen
  diaryLocked: 'Diario bloccato',
  diaryIsEncrypted: 'Questo diario è cifrato.',
  unlockNeedsSecureConnection:
    'Lo sblocco richiede una connessione sicura. Apri Icarus tramite HTTPS (o su localhost), oppure usa l’app desktop.',
  unlock: 'Sblocca',
  unlockAndSetPassword: 'Sblocca e imposta nuova password',
  unlocking: 'Sblocco in corso',
  forgotPassword: 'Hai dimenticato la password? Usa la chiave di recupero',
  usePasswordInstead: 'Usa invece la password',
  deleteThisDiary: 'Elimina questo diario',
  deleteDiaryTitle: 'Eliminare questo diario?',
  deleteDiaryConfirm: 'Elimina diario',
  deleteDiaryWarningDevice:
    'Il diario cifrato e le sue bozze verranno eliminati in modo definitivo da questo dispositivo. Procedi solo se hai perso la password e la chiave di recupero. Non si può annullare.',
  deleteDiaryWarningBrowser:
    'Il diario cifrato e le sue bozze verranno eliminati in modo definitivo da questo browser. Procedi solo se hai perso la password e la chiave di recupero. Non si può annullare.',

  // Encrypted export
  exportBackup: 'Esporta backup',
  exportEncrypted: 'Backup cifrato (.icarus)',
  exportEncryptedHint: 'Consigliato. Si apre in Icarus con la stessa password o chiave di recupero.',
  exportPlain: '.ics non cifrato',
  exportPlainHint: 'Per app di calendario o altri strumenti.',
  exportPlainWarning:
    'Chiunque riceva questo file può leggere tutto il tuo diario. Conservalo con cura ed eliminalo quando non ti serve più.',
  exportPlainConfirm: 'Esporta non cifrato',

  // Problems
  corruptDiary: 'Questo diario cifrato è danneggiato o è stato modificato.',
  /** The diary was written by a later version of the app. */
  newerVersionDiary: 'Questo diario è stato cifrato da una versione più recente di Icarus',
  couldNotReadDiary: 'Impossibile leggere il diario.',
  couldNotSaveEncryptedDiary: 'Impossibile salvare il diario cifrato. Non è stato scritto nulla.',
  couldNotEncryptDiary: 'Impossibile cifrare il diario. Non è stato cambiato nulla.',
  couldNotRekey: 'Impossibile salvare il diario. Vale ancora la password precedente.',
  couldNotRemoveEncryption: 'Impossibile rimuovere la cifratura. Il diario è ancora cifrato.',
  copiesRemainDevice:
    'Le copie precedenti del diario su questo dispositivo non si sono ancora potute eliminare e si possono leggere senza la password attuale. Icarus riprova a ogni salvataggio.',
  copiesRemainBrowser:
    'Le copie precedenti del diario in questo browser non si sono ancora potute eliminare e si possono leggere senza la password attuale. Icarus riprova a ogni salvataggio.',
};
