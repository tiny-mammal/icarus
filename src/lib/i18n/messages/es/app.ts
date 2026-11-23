import { plural } from '../../format';

/** The app shell, the welcome screen, importing and exporting, updates, installing, and the toasts the store raises. */
export default {
  // App shell
  calendar: 'Calendario',
  notifications: 'Notificaciones',
  unsavedChangesTitle: 'Cambios sin guardar',
  quitAnyway: 'Salir igualmente',
  unsavedChangesBody:
    'Algunos cambios, el borrador actual o el propio diario no se pudieron guardar en la carpeta del diario. Si sales ahora, se descartarán.',

  // Welcome
  welcomeTitle: 'Icarus Diary',
  welcomeTagline: 'Un lugar tranquilo y local para tus días.',
  welcomeIntro: 'Empieza un diario nuevo o importa uno que ya lleves.',
  startNewDiary: 'Empezar un diario nuevo',
  importDiary: 'Importar un diario (.ics)',
  releaseToOpen: 'Suelta para abrir',
  chooseFileTouch: 'Toca para elegir un archivo .ics o .icarus',
  chooseFileDesktop: 'Arrastra y suelta un archivo aquí, o haz clic para buscarlo',
  nextProtect: 'Después podrás elegir si lo proteges con una contraseña.',

  // Replacing the diary
  replaceTitle: '¿Reemplazar tu diario?',
  replaceStartOver: 'Empezar de nuevo',
  replaceConfirm: 'Reemplazar diario',
  /** The diary that is open is replaced by a new, empty one. `*…*` marks emphasis. */
  replaceOpenWithEmpty: plural({
    one: 'Tu diario con *{count}* entrada será sustituido por uno vacío, y sus borradores y su diccionario personal se borrarán.',
    other: 'Tu diario con *{count}* entradas será sustituido por uno vacío, y sus borradores y su diccionario personal se borrarán.',
  }),
  /** The diary that is open is replaced by the imported file. */
  replaceOpenWithImport: plural({
    one: 'Tu diario con *{count}* entrada será sustituido por el archivo importado, y sus borradores y su diccionario personal se borrarán.',
    other: 'Tu diario con *{count}* entradas será sustituido por el archivo importado, y sus borradores y su diccionario personal se borrarán.',
  }),
  /** The saved diary could not be opened, so only its place is known. */
  replaceSavedDeviceWithEmpty:
    'El diario guardado en este dispositivo será sustituido por uno vacío, y sus borradores y su diccionario personal se borrarán.',
  replaceSavedDeviceWithImport:
    'El diario guardado en este dispositivo será sustituido por el archivo importado, y sus borradores y su diccionario personal se borrarán.',
  replaceSavedBrowserWithEmpty:
    'El diario guardado en este navegador será sustituido por uno vacío, y sus borradores y su diccionario personal se borrarán.',
  replaceSavedBrowserWithImport:
    'El diario guardado en este navegador será sustituido por el archivo importado, y sus borradores y su diccionario personal se borrarán.',
  replaceKeepsCopy: 'Se conserva una versión de antes de hoy. Exporta antes una copia de seguridad para no perder tus últimos cambios.',
  replaceExportFirst: 'Exporta antes una copia de seguridad si quizá la quieras recuperar. Esto no se puede deshacer.',

  // Installing as a web app
  installTitle: 'Instalar la app',
  installIosTitle: 'Añadir a la pantalla de inicio',
  installIosIntro:
    'Icarus se abrirá a pantalla completa desde tu pantalla de inicio, como cualquier otra app, y funcionará sin conexión. Safari también puede borrar los datos de un sitio web si no lo visitas durante un tiempo; la app de la pantalla de inicio conserva tu diario.',
  /** `{share}` and `{more}` stand for the Share and More icons. */
  installIosStepShare: 'Toca el botón Compartir {share} del navegador. Si no lo ves, toca antes {more}.',
  /** `*…*` marks the names of buttons in Safari. */
  installIosStepAdd: 'Elige *Añadir a pantalla de inicio*. Quizá tengas que bajar o tocar *Ver más* para encontrarlo.',
  installIosStepConfirm: 'Toca *Añadir*. Icarus aparecerá en tu pantalla de inicio.',
  installIntro: 'Icarus puede abrirse en su propia ventana, como cualquier otra app, y funcionar sin conexión.',
  /** `{more}` stands for the browser's three-dot menu icon. */
  installStepMenu: 'Abre el menú de tu navegador, normalmente {more} o ☰ junto a la barra de direcciones.',
  /** `*…*` marks the names of menu items in browsers. */
  installStepChoose: 'Elige *Instalar app*, *Instalar Icarus* o *Añadir a la pantalla de inicio*.',
  installNotFound: '¿No lo ves? Chrome, Edge y Safari pueden instalar Icarus.',
  installBringEntries: 'Trae tus entradas contigo',
  installBringEntriesHint:
    'La app instalada tiene su propio diario, separado del de este navegador. Exporta ahora una copia de seguridad y, la primera vez que abras la app, impórtala.',
  exportBackup: 'Exportar copia de seguridad',

  // Updates
  /** `{version}` is a version number, like 0.9.0. */
  updateReady: 'Icarus {version} ya está disponible',
  /** `{ago}` reads like "3 weeks ago". */
  updateReleased: 'Publicada {ago}',
  updateGet: 'Descargar la actualización',
  updateLater: 'Más tarde',
  updateInstallHint: 'Instala la nueva versión encima de esta. Tu diario se queda donde está.',
  updateDismiss: 'Ocultar hasta el próximo inicio',
  reminderTitle: '¿Buscar una versión más nueva de Icarus?',
  /** `{version}` is the installed version and `{month}` the month it was built, like "October" or "October 2025". `*…*` marks emphasis. */
  reminderBuilt: 'Usas la *{version}*, de {month}.',
  /** Used when the build date is unknown. */
  reminderNoDate: 'Usas la *{version}*.',
  reminderBenefit: 'Las nuevas versiones traen correcciones y funciones nuevas.',
  reminderCheck: 'Buscar actualizaciones',
  reminderChecking: 'Comprobando…',
  reminderNotNow: 'Ahora no',
  reminderRemindNextMonth: 'Recordármelo el próximo mes',
  /** `{version}` is the installed version. */
  upToDate: 'Tienes la última versión, {version}.',
  updateUnreachable: 'No se ha podido conectar con icarus.4oli.com. Inténtalo más tarde.',

  // File dialogs
  importDialogTitle: 'Importar diario',
  exportDialogTitle: 'Exportar diario',

  // Toasts: opening and importing
  couldNotOpenSavedDiary: 'No se ha podido abrir el diario guardado.',
  couldNotOpenDiary: 'No se ha podido abrir ese diario.',
  /** `{error}` is the reason, written by the file parser (in English). */
  couldNotReadFile: 'No se ha podido leer este archivo — {error}',
  couldNotSaveDiary: 'No se ha podido guardar el diario.',
  couldNotSaveDiaryInLocation: 'No se ha podido guardar el diario en la ubicación elegida.',
  couldNotCreateDiary: 'No se ha podido crear el diario.',
  couldNotReplaceDiary: 'No se ha podido reemplazar el diario.',
  replacedButDraftsRemain: 'El diario se ha reemplazado, pero no se pudieron borrar los borradores antiguos.',
  couldNotImportDiary: 'No se ha podido importar ese diario.',
  dropDiaryFile: 'Suelta aquí un archivo .ics o .icarus.',
  couldNotOpenFile: 'No se ha podido abrir ese archivo.',
  couldNotDeleteDiary: 'No se ha podido eliminar el diario.',

  // Toasts: exporting
  backupExported: 'Copia de seguridad exportada.',
  encryptedBackupExported: 'Copia de seguridad cifrada exportada.',
  backupExists: 'Ya existe una copia de seguridad. Elige otro nombre de archivo.',
  exportFailed: 'La exportación ha fallado.',

  // Toasts: saving
  savedDevice: 'Guardado en este dispositivo',
  savedBrowser: 'Guardado en este navegador',
  writeFailed: 'No se ha podido guardar — tus cambios siguen en memoria.',

  // Toasts: entries, drafts and the dictionary
  writeSomethingFirst: 'Escribe algo primero.',
  entryGone: 'La entrada original ya no está disponible.',
  entryUpdated: 'Entrada actualizada',
  entryDeleted: 'Entrada eliminada',
  couldNotReadDrafts: 'No se han podido leer tus borradores.',
  draftNotSaved: 'El borrador no se ha guardado — tu texto sigue en el editor.',
  couldNotUpdateDrafts: 'No se han podido actualizar los borradores.',
  draftDiscarded: 'Borrador descartado',
  draftDeleted: 'Borrador eliminado',
  /** `{word}` is the word that was added. */
  wordAdded: 'Se ha añadido “{word}” a tu diccionario',
  /** `{word}` is the word that was removed. */
  wordRemoved: 'Se ha quitado “{word}”',
};
