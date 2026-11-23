import { plural } from '../../format';

/** Words used all over the app. */
export default {
  appName: 'Icarus',
  cancel: 'Annuler',
  close: 'Fermer',
  back: 'Retour',
  add: 'Ajouter',
  remove: 'Retirer',
  restore: 'Restaurer',
  delete: 'Supprimer',
  undo: 'Annuler',
  done: 'Terminé',
  continue: 'Continuer',
  untitled: 'Sans titre',
  loading: 'Chargement d’Icarus',
  entries: plural({ one: '{count} entrée', other: '{count} entrées' }),
  words: plural({ one: '{count} mot', other: '{count} mots' }),
  days: plural({ one: '{count} jour', other: '{count} jours' }),
  /** What holds the diary, as a row label. */
  place: { device: 'Cet appareil', browser: 'Ce navigateur' },
  couldNotSaveSettings: 'Impossible d’enregistrer les réglages.',
};
