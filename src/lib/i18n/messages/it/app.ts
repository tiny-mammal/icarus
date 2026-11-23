import { plural } from '../../format';

/** The app shell, the welcome screen, importing and exporting, updates, installing, and the toasts the store raises. */
export default {
  // App shell
  calendar: 'Calendario',
  notifications: 'Notifiche',
  unsavedChangesTitle: 'Modifiche non salvate',
  quitAnyway: 'Esci comunque',
  unsavedChangesBody:
    'Alcune modifiche, la bozza attuale o il diario stesso, non sono state salvate nella cartella del diario. Uscendo ora, andranno perse.',

  // Welcome
  welcomeTitle: 'Icarus Diary',
  welcomeTagline: 'Un posto tranquillo, sul tuo dispositivo, per le tue giornate.',
  welcomeIntro: 'Inizia un nuovo diario, oppure importa quello che hai già.',
  startNewDiary: 'Inizia un nuovo diario',
  importDiary: 'Importa un diario (.ics)',
  releaseToOpen: 'Rilascia per aprire',
  chooseFileTouch: 'Tocca per scegliere un file .ics o .icarus',
  chooseFileDesktop: 'Trascina qui un file, oppure clicca per sfogliare',
  nextProtect: 'Poi sceglierai se proteggerlo con una password.',

  // Replacing the diary
  replaceTitle: 'Sostituire il tuo diario?',
  replaceStartOver: 'Ricomincia da capo',
  replaceConfirm: 'Sostituisci diario',
  /** The diary that is open is replaced by a new, empty one. `*…*` marks emphasis. */
  replaceOpenWithEmpty: plural({
    one: 'Il tuo diario con *{count}* voce verrà sostituito con uno vuoto, e le sue bozze e il dizionario personale verranno eliminati.',
    other: 'Il tuo diario con *{count}* voci verrà sostituito con uno vuoto, e le sue bozze e il dizionario personale verranno eliminati.',
  }),
  /** The diary that is open is replaced by the imported file. */
  replaceOpenWithImport: plural({
    one: 'Il tuo diario con *{count}* voce verrà sostituito dal file importato, e le sue bozze e il dizionario personale verranno eliminati.',
    other: 'Il tuo diario con *{count}* voci verrà sostituito dal file importato, e le sue bozze e il dizionario personale verranno eliminati.',
  }),
  /** The saved diary could not be opened, so only its place is known. */
  replaceSavedDeviceWithEmpty:
    'Il diario salvato su questo dispositivo verrà sostituito con uno vuoto, e le sue bozze e il dizionario personale verranno eliminati.',
  replaceSavedDeviceWithImport:
    'Il diario salvato su questo dispositivo verrà sostituito dal file importato, e le sue bozze e il dizionario personale verranno eliminati.',
  replaceSavedBrowserWithEmpty:
    'Il diario salvato in questo browser verrà sostituito con uno vuoto, e le sue bozze e il dizionario personale verranno eliminati.',
  replaceSavedBrowserWithImport:
    'Il diario salvato in questo browser verrà sostituito dal file importato, e le sue bozze e il dizionario personale verranno eliminati.',
  replaceKeepsCopy: 'Una copia fatta prima oggi viene conservata, ma esporta un backup per non perdere le ultime modifiche.',
  replaceExportFirst: 'Esporta prima un backup se potresti volerlo riavere. Non si può annullare.',

  // Installing as a web app
  installTitle: 'Installa l’app',
  installIosTitle: 'Aggiungi alla schermata Home',
  installIosIntro:
    'Icarus si aprirà a schermo intero dalla schermata Home, come qualsiasi altra app, e funzionerà offline. Safari può anche cancellare i dati di un sito se non lo visiti per un po’; l’app nella schermata Home conserva il tuo diario.',
  /** `{share}` and `{more}` stand for the Share and More icons. */
  installIosStepShare: 'Tocca il pulsante Condividi {share} nel browser. Se non lo vedi, tocca prima {more}.',
  /** `*…*` marks the names of buttons in Safari. */
  installIosStepAdd:
    'Scegli *Aggiungi a Home*. Potrebbe servire scorrere in basso o toccare *Mostra altro* per trovarlo.',
  installIosStepConfirm: 'Tocca *Aggiungi*. Icarus compare nella schermata Home.',
  installIntro: 'Icarus può aprirsi nella sua finestra, come qualsiasi altra app, e funzionare offline.',
  /** `{more}` stands for the browser's three-dot menu icon. */
  installStepMenu: 'Apri il menu del browser, di solito {more} o ☰ accanto alla barra degli indirizzi.',
  /** `*…*` marks the names of menu items in browsers. */
  installStepChoose: 'Scegli *Installa app*, *Installa Icarus* o *Aggiungi a schermata Home*.',
  installNotFound: 'Non lo vedi? Chrome, Edge e Safari possono installare Icarus.',
  installBringEntries: 'Porta con te le tue voci',
  installBringEntriesHint:
    'L’app installata ha un suo diario, separato da quello di questo browser. Esporta ora un backup, poi importalo la prima volta che apri l’app.',
  exportBackup: 'Esporta backup',

  // Updates
  /** `{version}` is a version number, like 0.9.0. */
  updateReady: 'Icarus {version} è disponibile',
  /** `{ago}` reads like "3 weeks ago". */
  updateReleased: 'Rilasciata {ago}',
  updateGet: 'Scarica l’aggiornamento',
  updateLater: 'Più tardi',
  updateInstallHint: 'Installa la nuova versione sopra questa. Il tuo diario resta dov’è.',
  updateDismiss: 'Nascondi fino al prossimo avvio',
  reminderTitle: 'Cercare una versione più recente di Icarus?',
  /** `{version}` is the installed version and `{month}` the month it was built, like "October" or "October 2025". `*…*` marks emphasis. */
  reminderBuilt: 'Stai usando *{version}*, di {month}.',
  /** Used when the build date is unknown. */
  reminderNoDate: 'Stai usando *{version}*.',
  reminderBenefit: 'Le nuove versioni portano correzioni e novità.',
  reminderCheck: 'Cerca aggiornamenti',
  reminderChecking: 'Controllo in corso…',
  reminderNotNow: 'Non ora',
  reminderRemindNextMonth: 'Ricordamelo il mese prossimo',
  /** `{version}` is the installed version. */
  upToDate: 'Hai l’ultima versione, {version}.',
  updateUnreachable: 'Impossibile raggiungere icarus.4oli.com. Riprova più tardi.',

  // File dialogs
  importDialogTitle: 'Importa diario',
  exportDialogTitle: 'Esporta diario',

  // Toasts: opening and importing
  couldNotOpenSavedDiary: 'Impossibile aprire il diario salvato.',
  couldNotOpenDiary: 'Impossibile aprire quel diario.',
  /** `{error}` is the reason, written by the file parser (in English). */
  couldNotReadFile: 'Impossibile leggere questo file — {error}',
  couldNotSaveDiary: 'Impossibile salvare il diario.',
  couldNotSaveDiaryInLocation: 'Impossibile salvare il diario nella posizione selezionata.',
  couldNotCreateDiary: 'Impossibile creare il diario.',
  couldNotReplaceDiary: 'Impossibile sostituire il diario.',
  replacedButDraftsRemain: 'Il diario è stato sostituito, ma le vecchie bozze non si sono potute eliminare.',
  couldNotImportDiary: 'Impossibile importare quel diario.',
  dropDiaryFile: 'Trascina un file .ics o .icarus, per favore.',
  couldNotOpenFile: 'Impossibile aprire quel file.',
  couldNotDeleteDiary: 'Impossibile eliminare il diario.',

  // Toasts: exporting
  backupExported: 'Backup esportato.',
  encryptedBackupExported: 'Backup cifrato esportato.',
  backupExists: 'Esiste già un backup. Scegli un nuovo nome file.',
  exportFailed: 'Esportazione non riuscita.',

  // Toasts: saving
  savedDevice: 'Salvato su questo dispositivo',
  savedBrowser: 'Salvato in questo browser',
  writeFailed: 'Scrittura non riuscita — le modifiche sono ancora in memoria.',

  // Toasts: entries, drafts and the dictionary
  writeSomethingFirst: 'Scrivi prima qualcosa.',
  entryGone: 'La voce originale non è più disponibile.',
  entryUpdated: 'Voce aggiornata',
  entryDeleted: 'Voce eliminata',
  couldNotReadDrafts: 'Impossibile leggere le bozze.',
  draftNotSaved: 'Bozza non salvata — il testo è ancora nell’editor.',
  couldNotUpdateDrafts: 'Impossibile aggiornare le bozze.',
  draftDiscarded: 'Bozza scartata',
  draftDeleted: 'Bozza eliminata',
  /** `{word}` is the word that was added. */
  wordAdded: 'Aggiunto “{word}” al tuo dizionario',
  /** `{word}` is the word that was removed. */
  wordRemoved: 'Rimosso “{word}”',
};
