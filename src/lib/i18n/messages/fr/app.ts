import { plural } from '../../format';

/** The app shell, the welcome screen, importing and exporting, updates, installing, and the toasts the store raises. */
export default {
  // App shell
  calendar: 'Calendrier',
  notifications: 'Notifications',
  unsavedChangesTitle: 'Modifications non enregistrées',
  quitAnyway: 'Quitter quand même',
  unsavedChangesBody:
    'Certaines modifications, le brouillon en cours ou le journal lui-même, n’ont pas pu être enregistrées dans le dossier du journal. Quitter maintenant les supprimera.',

  // Welcome
  welcomeTitle: 'Icarus Diary',
  welcomeTagline: 'Un espace calme et local pour vos journées.',
  welcomeIntro: 'Commencez un nouveau journal, ou importez celui que vous tenez déjà.',
  startNewDiary: 'Commencer un nouveau journal',
  importDiary: 'Importer un journal (.ics)',
  releaseToOpen: 'Relâcher pour ouvrir',
  chooseFileTouch: 'Touchez pour choisir un fichier .ics ou .icarus',
  chooseFileDesktop: 'Glissez-déposez un fichier ici, ou cliquez pour parcourir',
  nextProtect: 'Ensuite, vous choisirez s’il faut le protéger par un mot de passe.',

  // Replacing the diary
  replaceTitle: 'Remplacer votre journal ?',
  replaceStartOver: 'Recommencer',
  replaceConfirm: 'Remplacer le journal',
  /** The diary that is open is replaced by a new, empty one. `*…*` marks emphasis. */
  replaceOpenWithEmpty: plural({
    one: 'Votre journal contenant *{count}* entrée sera remplacé par un journal vide, et ses brouillons et son dictionnaire personnel seront effacés.',
    other: 'Votre journal contenant *{count}* entrées sera remplacé par un journal vide, et ses brouillons et son dictionnaire personnel seront effacés.',
  }),
  /** The diary that is open is replaced by the imported file. */
  replaceOpenWithImport: plural({
    one: 'Votre journal contenant *{count}* entrée sera remplacé par le fichier importé, et ses brouillons et son dictionnaire personnel seront effacés.',
    other: 'Votre journal contenant *{count}* entrées sera remplacé par le fichier importé, et ses brouillons et son dictionnaire personnel seront effacés.',
  }),
  /** The saved diary could not be opened, so only its place is known. */
  replaceSavedDeviceWithEmpty:
    'Le journal enregistré sur cet appareil sera remplacé par un journal vide, et ses brouillons et son dictionnaire personnel seront effacés.',
  replaceSavedDeviceWithImport:
    'Le journal enregistré sur cet appareil sera remplacé par le fichier importé, et ses brouillons et son dictionnaire personnel seront effacés.',
  replaceSavedBrowserWithEmpty:
    'Le journal enregistré dans ce navigateur sera remplacé par un journal vide, et ses brouillons et son dictionnaire personnel seront effacés.',
  replaceSavedBrowserWithImport:
    'Le journal enregistré dans ce navigateur sera remplacé par le fichier importé, et ses brouillons et son dictionnaire personnel seront effacés.',
  replaceKeepsCopy:
    'Une copie datant de plus tôt aujourd’hui est conservée, mais exportez d’abord une sauvegarde pour garder vos dernières modifications.',
  replaceExportFirst: 'Exportez d’abord une sauvegarde si vous voulez le récupérer. Cette action est irréversible.',

  // Installing as a web app
  installTitle: 'Installer l’application',
  installIosTitle: 'Ajouter à l’écran d’accueil',
  installIosIntro:
    'Icarus s’ouvrira en plein écran depuis votre écran d’accueil, comme n’importe quelle autre application, et fonctionnera hors ligne. Safari peut aussi effacer les données d’un site web si vous ne le visitez pas pendant un moment ; l’application de l’écran d’accueil conserve votre journal.',
  /** `{share}` and `{more}` stand for the Share and More icons. */
  installIosStepShare: 'Touchez le bouton Partager {share} dans le navigateur. Si vous ne le voyez pas, touchez d’abord {more}.',
  /** `*…*` marks the names of buttons in Safari. */
  installIosStepAdd:
    'Choisissez *Sur l’écran d’accueil*. Vous devrez peut-être faire défiler vers le bas ou toucher *Afficher plus* pour le trouver.',
  installIosStepConfirm: 'Touchez *Ajouter*. Icarus apparaît sur votre écran d’accueil.',
  installIntro: 'Icarus peut s’ouvrir dans sa propre fenêtre, comme n’importe quelle autre application, et fonctionner hors ligne.',
  /** `{more}` stands for the browser's three-dot menu icon. */
  installStepMenu: 'Ouvrez le menu de votre navigateur, généralement {more} ou ☰ à côté de la barre d’adresse.',
  /** `*…*` marks the names of menu items in browsers. */
  installStepChoose: 'Choisissez *Installer l’application*, *Installer Icarus* ou *Ajouter à l’écran d’accueil*.',
  installNotFound: 'Vous ne le trouvez pas ? Chrome, Edge et Safari peuvent tous installer Icarus.',
  installBringEntries: 'Apportez vos entrées avec vous',
  installBringEntriesHint:
    'L’application installée a son propre journal, distinct de celui de ce navigateur. Exportez une sauvegarde maintenant, puis importez-la la première fois que vous ouvrez l’application.',
  exportBackup: 'Exporter une sauvegarde',

  // Updates
  /** `{version}` is a version number, like 0.9.0. */
  updateReady: 'Icarus {version} est disponible',
  /** `{ago}` reads like "3 weeks ago". */
  updateReleased: 'Publiée {ago}',
  updateGet: 'Obtenir la mise à jour',
  updateLater: 'Plus tard',
  updateInstallHint: 'Installez la nouvelle version par-dessus celle-ci. Votre journal reste à sa place.',
  updateDismiss: 'Ignorer jusqu’au prochain lancement',
  reminderTitle: 'Chercher une version plus récente d’Icarus ?',
  /** `{version}` is the installed version and `{month}` the month it was built, like "October" or "October 2025". `*…*` marks emphasis. */
  reminderBuilt: 'Vous utilisez la *{version}*, de {month}.',
  /** Used when the build date is unknown. */
  reminderNoDate: 'Vous utilisez la *{version}*.',
  reminderBenefit: 'Les nouvelles versions apportent des corrections et de nouvelles fonctions.',
  reminderCheck: 'Rechercher des mises à jour',
  reminderChecking: 'Vérification…',
  reminderNotNow: 'Pas maintenant',
  reminderRemindNextMonth: 'Me le rappeler le mois prochain',
  /** `{version}` is the installed version. */
  upToDate: 'Vous avez la dernière version, {version}.',
  updateUnreachable: 'Impossible de joindre icarus.4oli.com. Réessayez plus tard.',

  // File dialogs
  importDialogTitle: 'Importer un journal',
  exportDialogTitle: 'Exporter le journal',

  // Toasts: opening and importing
  couldNotOpenSavedDiary: 'Impossible d’ouvrir le journal enregistré.',
  couldNotOpenDiary: 'Impossible d’ouvrir ce journal.',
  /** `{error}` is the reason, written by the file parser (in English). */
  couldNotReadFile: 'Impossible de lire ce fichier — {error}',
  couldNotSaveDiary: 'Impossible d’enregistrer le journal.',
  couldNotSaveDiaryInLocation: 'Impossible d’enregistrer le journal à l’emplacement choisi.',
  couldNotCreateDiary: 'Impossible de créer le journal.',
  couldNotReplaceDiary: 'Impossible de remplacer le journal.',
  replacedButDraftsRemain: 'Le journal a été remplacé, mais les anciens brouillons n’ont pas pu être effacés.',
  couldNotImportDiary: 'Impossible d’importer ce journal.',
  dropDiaryFile: 'Déposez un fichier .ics ou .icarus.',
  couldNotOpenFile: 'Impossible d’ouvrir ce fichier.',
  couldNotDeleteDiary: 'Impossible de supprimer le journal.',

  // Toasts: exporting
  backupExported: 'Sauvegarde exportée.',
  encryptedBackupExported: 'Sauvegarde chiffrée exportée.',
  backupExists: 'Une sauvegarde existe déjà. Choisissez un nouveau nom de fichier.',
  exportFailed: 'Échec de l’exportation.',

  // Toasts: saving
  savedDevice: 'Enregistré sur cet appareil',
  savedBrowser: 'Enregistré dans ce navigateur',
  writeFailed: 'Échec de l’enregistrement — vos modifications sont toujours en mémoire.',

  // Toasts: entries, drafts and the dictionary
  writeSomethingFirst: 'Écrivez d’abord quelque chose.',
  entryGone: 'L’entrée d’origine n’est plus disponible.',
  entryUpdated: 'Entrée modifiée',
  entryDeleted: 'Entrée supprimée',
  couldNotReadDrafts: 'Impossible de lire vos brouillons.',
  draftNotSaved: 'Brouillon non enregistré — votre texte est toujours dans l’éditeur.',
  couldNotUpdateDrafts: 'Impossible de mettre à jour les brouillons.',
  draftDiscarded: 'Brouillon abandonné',
  draftDeleted: 'Brouillon supprimé',
  /** `{word}` is the word that was added. */
  wordAdded: '« {word} » ajouté à votre dictionnaire',
  /** `{word}` is the word that was removed. */
  wordRemoved: '« {word} » retiré',
};
