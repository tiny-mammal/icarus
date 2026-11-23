import { plural } from '../../format';

/** Encryption: setup, password management, the lock screen, recovery keys and encrypted exports. */
export default {
  // Passwords
  password: 'Mot de passe',
  newPassword: 'Nouveau mot de passe',
  currentPassword: 'Mot de passe actuel',
  repeatPassword: 'Confirmer le mot de passe',
  showPassword: 'Afficher le mot de passe',
  hidePassword: 'Masquer le mot de passe',
  passwordTip: 'Astuce : une phrase de 5 à 6 mots au hasard est solide et facile à retenir.',
  passwordsDontMatch: 'Les mots de passe ne correspondent pas.',
  passwordIncorrect: 'Ce mot de passe n’est pas correct.',
  recoveryKeyIncorrect: 'Cette clé de récupération n’est pas correcte.',
  passwordTooShort: plural({
    one: 'Utilisez au moins {count} caractère.',
    other: 'Utilisez au moins {count} caractères.',
  }),
  passwordWeak: 'Faible. Une phrase de plusieurs mots aléatoires est plus facile à retenir et bien plus solide.',
  passwordFair: 'Correct. Quelques mots de plus le rendraient solide.',
  passwordStrong: 'Solide.',

  // Recovery key
  recoveryKey: 'Clé de récupération',
  /** `{key}` is the recovery key, read out letter by letter. */
  recoveryKeyLabel: 'Clé de récupération {key}',
  recoveryKeyPlaceholder: 'XXXX-XXXX-XXXX-…',
  copy: 'Copier',
  copied: 'Copié',
  downloadTxt: 'Télécharger le .txt',
  recoveryKeyConfirm: 'Pour confirmer que vous l’avez enregistrée, saisissez ses quatre derniers caractères',
  /** The lines of the downloaded recovery key file. */
  recoveryKeyFileTitle: 'Clé de récupération d’Icarus Diary',
  recoveryKeyFileKeepSafe: 'Gardez-la en lieu sûr, séparément de votre journal.',
  recoveryKeyFileWarning: 'Toute personne possédant cette clé peut ouvrir votre journal.',

  // Setup: shared
  /** The step counter under the title: "Step 1 of 2". */
  stepOf: 'Étape {step} sur {total}',
  noPasswordReset: 'Aucune réinitialisation du mot de passe. Si vous perdez le mot de passe et la clé de récupération, vous perdez le journal.',
  needsSecureConnection:
    'Nécessite une connexion sécurisée. Ouvrez Icarus en HTTPS (ou sur localhost), ou utilisez l’application de bureau.',
  encryptedNeedsSecureConnection: 'Un journal chiffré nécessite HTTPS ou l’application de bureau.',

  // Setup: choosing
  protectImportedTitle: 'Protéger le journal importé ?',
  protectNewTitle: 'Protéger votre nouveau journal ?',
  choiceIntroDevice: 'Choisissez comment le journal est stocké sur cet appareil. Vous pourrez le modifier plus tard dans les réglages.',
  choiceIntroBrowser: 'Choisissez comment le journal est stocké dans ce navigateur. Vous pourrez le modifier plus tard dans les réglages.',
  protectionLabel: 'Protection du journal',
  encryptOption: 'Chiffrer avec un mot de passe',
  recommended: 'Recommandé',
  encryptOptionHint:
    'Les entrées, les brouillons et votre dictionnaire sont illisibles sans le mot de passe. Le journal se verrouille dès que vous vous éloignez.',
  plainOption: 'Ne pas chiffrer',
  plainOptionHintDevice: 'S’ouvre sans mot de passe. Toute personne ayant accès à cet appareil peut le lire.',
  plainOptionHintBrowser: 'S’ouvre sans mot de passe. Toute personne ayant accès à ce navigateur peut le lire.',
  importWithoutPassword: 'Importer sans mot de passe',
  createWithoutPassword: 'Créer sans mot de passe',
  saving: 'Enregistrement',

  // Setup: password and recovery key
  chooseAPassword: 'Choisir un mot de passe',
  protectWithPassword: 'Protéger par un mot de passe',
  protectWithPasswordIntro: 'Chiffre vos entrées, vos brouillons et votre dictionnaire.',
  preparing: 'Préparation',
  saveRecoveryKey: 'Enregistrez votre clé de récupération',
  recoveryKeyIntro:
    'C’est le seul moyen d’entrer si vous oubliez le mot de passe. Conservez-la à l’écart du journal, par exemple dans un gestionnaire de mots de passe. Elle ne sera plus affichée.',
  encrypting: 'Chiffrement',
  createEncryptedDiary: 'Créer un journal chiffré',
  importEncrypted: 'Importer et chiffrer',
  encryptDiary: 'Chiffrer le journal',

  // Setup: done
  diaryEncrypted: 'Votre journal est chiffré',
  doneFromSettings: 'Les brouillons et votre dictionnaire sont chiffrés aussi.',
  doneNewOrImported: 'Les entrées, les brouillons et votre dictionnaire sont stockés chiffrés.',
  autoLockAfter: plural({
    one: 'Il se verrouille après {count} minute d’inactivité.',
    other: 'Il se verrouille après {count} minutes d’inactivité.',
  }),
  autoLockOff: 'Le verrouillage automatique est désactivé.',
  importedFileUnchanged: 'Le .ics importé n’a pas été modifié et reste lisible. Supprimez-le si vous n’en avez plus besoin.',
  earlierBackupsReadable: 'Les sauvegardes exportées précédemment restent lisibles.',
  openDiary: 'Ouvrir le journal',

  // Managing encryption
  changePassword: 'Changer le mot de passe',
  changing: 'Modification',
  newRecoveryKey: 'Nouvelle clé de récupération',
  generating: 'Génération',
  generateRecoveryKeyHint: 'Générez une nouvelle clé de récupération si la clé actuelle a pu être vue par quelqu’un d’autre.',
  newRecoveryKeyIntro: 'Enregistrez cette nouvelle clé en lieu sûr. Une fois confirmée, l’ancienne clé de récupération cesse de fonctionner.',
  replaceRecoveryKey: 'Remplacer la clé de récupération',
  removeEncryption: 'Retirer le chiffrement',
  decrypting: 'Déchiffrement',
  removeEncryptionWarningDevice:
    'Le journal, les brouillons et le dictionnaire seront stockés sans chiffrement. Toute personne ayant accès à cet appareil pourra les lire.',
  removeEncryptionWarningBrowser:
    'Le journal, les brouillons et le dictionnaire seront stockés sans chiffrement. Toute personne ayant accès à ce navigateur pourra les lire.',
  passwordChanged: 'Mot de passe modifié.',
  recoveryKeyReplaced: 'Clé de récupération remplacée. L’ancienne ne fonctionne plus.',
  encryptionRemoved: 'Chiffrement retiré.',

  // Lock screen
  diaryLocked: 'Journal verrouillé',
  diaryIsEncrypted: 'Ce journal est chiffré.',
  unlockNeedsSecureConnection:
    'Le déverrouillage nécessite une connexion sécurisée. Ouvrez Icarus en HTTPS (ou sur localhost), ou utilisez l’application de bureau.',
  unlock: 'Déverrouiller',
  unlockAndSetPassword: 'Déverrouiller et définir un nouveau mot de passe',
  unlocking: 'Déverrouillage',
  forgotPassword: 'Mot de passe oublié ? Utilisez la clé de récupération',
  usePasswordInstead: 'Utiliser le mot de passe à la place',
  deleteThisDiary: 'Supprimer ce journal',
  deleteDiaryTitle: 'Supprimer ce journal ?',
  deleteDiaryConfirm: 'Supprimer le journal',
  deleteDiaryWarningDevice:
    'Le journal chiffré et ses brouillons seront effacés définitivement de cet appareil. Ne le faites que si le mot de passe et la clé de récupération sont perdus. Cette action est irréversible.',
  deleteDiaryWarningBrowser:
    'Le journal chiffré et ses brouillons seront effacés définitivement de ce navigateur. Ne le faites que si le mot de passe et la clé de récupération sont perdus. Cette action est irréversible.',

  // Encrypted export
  exportBackup: 'Exporter une sauvegarde',
  exportEncrypted: 'Sauvegarde chiffrée (.icarus)',
  exportEncryptedHint: 'Recommandée. S’ouvre dans Icarus avec le même mot de passe ou la même clé de récupération.',
  exportPlain: '.ics non chiffré',
  exportPlainHint: 'Pour les applications d’agenda ou d’autres outils.',
  exportPlainWarning:
    'Toute personne qui obtient ce fichier peut lire tout votre journal. Conservez-le avec soin et supprimez-le quand vous n’en avez plus besoin.',
  exportPlainConfirm: 'Exporter sans chiffrement',

  // Problems
  corruptDiary: 'Ce journal chiffré est endommagé ou a été modifié.',
  /** The diary was written by a later version of the app. */
  newerVersionDiary: 'Ce journal a été chiffré par une version plus récente d’Icarus',
  couldNotReadDiary: 'Impossible de lire le journal.',
  couldNotSaveEncryptedDiary: 'Impossible d’enregistrer le journal chiffré. Rien n’a été écrit.',
  couldNotEncryptDiary: 'Impossible de chiffrer le journal. Rien n’a été modifié.',
  couldNotRekey: 'Impossible d’enregistrer le journal. L’ancien mot de passe reste valable.',
  couldNotRemoveEncryption: 'Impossible de retirer le chiffrement. Le journal est toujours chiffré.',
  copiesRemainDevice:
    'Les anciennes copies du journal sur cet appareil n’ont pas encore pu être effacées et peuvent encore être lues sans le mot de passe actuel. Icarus réessaie à chaque enregistrement.',
  copiesRemainBrowser:
    'Les anciennes copies du journal dans ce navigateur n’ont pas encore pu être effacées et peuvent encore être lues sans le mot de passe actuel. Icarus réessaie à chaque enregistrement.',
};
