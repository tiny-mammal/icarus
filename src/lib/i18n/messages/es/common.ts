import { plural } from '../../format';

/** Words used all over the app. */
export default {
  appName: 'Icarus',
  cancel: 'Cancelar',
  close: 'Cerrar',
  back: 'Atrás',
  add: 'Añadir',
  remove: 'Quitar',
  restore: 'Restaurar',
  delete: 'Eliminar',
  undo: 'Deshacer',
  done: 'Listo',
  continue: 'Continuar',
  untitled: 'Sin título',
  loading: 'Cargando Icarus',
  entries: plural({ one: '{count} entrada', other: '{count} entradas' }),
  words: plural({ one: '{count} palabra', other: '{count} palabras' }),
  days: plural({ one: '{count} día', other: '{count} días' }),
  /** What holds the diary, as a row label. */
  place: { device: 'Este dispositivo', browser: 'Este navegador' },
  couldNotSaveSettings: 'No se han podido guardar los ajustes.',
};
