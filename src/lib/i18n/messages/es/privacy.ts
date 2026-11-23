import { plural } from '../../format';

/** Encryption: setup, password management, the lock screen, recovery keys and encrypted exports. */
export default {
  // Passwords
  password: 'Contraseña',
  newPassword: 'Nueva contraseña',
  currentPassword: 'Contraseña actual',
  repeatPassword: 'Repite la contraseña',
  showPassword: 'Mostrar contraseña',
  hidePassword: 'Ocultar contraseña',
  passwordTip: 'Consejo: una frase de 5–6 palabras aleatorias es segura y fácil de recordar.',
  passwordsDontMatch: 'Las contraseñas no coinciden.',
  passwordIncorrect: 'Esa contraseña no es correcta.',
  recoveryKeyIncorrect: 'Esa clave de recuperación no es correcta.',
  passwordTooShort: plural({
    one: 'Usa al menos {count} carácter.',
    other: 'Usa al menos {count} caracteres.',
  }),
  passwordWeak: 'Débil. Una frase de varias palabras aleatorias es más fácil de recordar y mucho más segura.',
  passwordFair: 'Aceptable. Unas palabras más la harían segura.',
  passwordStrong: 'Fuerte.',

  // Recovery key
  recoveryKey: 'Clave de recuperación',
  /** `{key}` is the recovery key, read out letter by letter. */
  recoveryKeyLabel: 'Clave de recuperación {key}',
  recoveryKeyPlaceholder: 'XXXX-XXXX-XXXX-…',
  copy: 'Copiar',
  copied: 'Copiada',
  downloadTxt: 'Descargar .txt',
  recoveryKeyConfirm: 'Para confirmar que la guardaste, escribe sus últimos cuatro caracteres',
  /** The lines of the downloaded recovery key file. */
  recoveryKeyFileTitle: 'Clave de recuperación de Icarus Diary',
  recoveryKeyFileKeepSafe: 'Guárdala en un lugar seguro y separado de tu diario.',
  recoveryKeyFileWarning: 'Cualquiera que tenga esta clave puede abrir tu diario.',

  // Setup: shared
  /** The step counter under the title: "Step 1 of 2". */
  stepOf: 'Paso {step} de {total}',
  noPasswordReset: 'No hay forma de restablecer la contraseña. Si pierdes la contraseña y la clave de recuperación, perderás el diario.',
  needsSecureConnection:
    'Necesita una conexión segura. Abre Icarus por HTTPS (o en localhost), o usa la app de escritorio.',
  encryptedNeedsSecureConnection: 'Los diarios cifrados necesitan HTTPS o la app de escritorio.',

  // Setup: choosing
  protectImportedTitle: '¿Proteger el diario importado?',
  protectNewTitle: '¿Proteger tu diario nuevo?',
  choiceIntroDevice: 'Elige cómo se guarda el diario en este dispositivo. Puedes cambiarlo más tarde en Ajustes.',
  choiceIntroBrowser: 'Elige cómo se guarda el diario en este navegador. Puedes cambiarlo más tarde en Ajustes.',
  protectionLabel: 'Protección del diario',
  encryptOption: 'Cifrar con contraseña',
  recommended: 'Recomendado',
  encryptOptionHint:
    'Las entradas, los borradores y tu diccionario no se pueden leer sin la contraseña. El diario se bloquea cuando te alejas.',
  plainOption: 'No cifrar',
  plainOptionHintDevice: 'Se abre sin contraseña. Cualquiera con acceso a este dispositivo puede leerlo.',
  plainOptionHintBrowser: 'Se abre sin contraseña. Cualquiera con acceso a este navegador puede leerlo.',
  importWithoutPassword: 'Importar sin contraseña',
  createWithoutPassword: 'Crear sin contraseña',
  saving: 'Guardando',

  // Setup: password and recovery key
  chooseAPassword: 'Elige una contraseña',
  protectWithPassword: 'Proteger con contraseña',
  protectWithPasswordIntro: 'Cifra tus entradas, borradores y diccionario.',
  preparing: 'Preparando',
  saveRecoveryKey: 'Guarda tu clave de recuperación',
  recoveryKeyIntro:
    'Es la única forma de entrar si olvidas la contraseña. Guárdala aparte del diario, por ejemplo en un gestor de contraseñas. No se volverá a mostrar.',
  encrypting: 'Cifrando',
  createEncryptedDiary: 'Crear diario cifrado',
  importEncrypted: 'Importar cifrado',
  encryptDiary: 'Cifrar diario',

  // Setup: done
  diaryEncrypted: 'Tu diario está cifrado',
  doneFromSettings: 'Los borradores y tu diccionario también están cifrados.',
  doneNewOrImported: 'Las entradas, los borradores y tu diccionario se guardan cifrados.',
  autoLockAfter: plural({
    one: 'Se bloquea tras {count} minuto de inactividad.',
    other: 'Se bloquea tras {count} minutos de inactividad.',
  }),
  autoLockOff: 'El bloqueo automático está desactivado.',
  importedFileUnchanged: 'El .ics que importaste no ha cambiado y sigue siendo legible. Bórralo si ya no lo necesitas.',
  earlierBackupsReadable: 'Las copias de seguridad que exportaste antes siguen siendo legibles.',
  openDiary: 'Abrir diario',

  // Managing encryption
  changePassword: 'Cambiar contraseña',
  changing: 'Cambiando',
  newRecoveryKey: 'Nueva clave de recuperación',
  generating: 'Generando',
  generateRecoveryKeyHint: 'Genera una nueva clave de recuperación si alguien más pudo ver la actual.',
  newRecoveryKeyIntro: 'Guarda esta nueva clave en un lugar seguro. Cuando la confirmes, la clave de recuperación anterior dejará de funcionar.',
  replaceRecoveryKey: 'Reemplazar clave de recuperación',
  removeEncryption: 'Quitar cifrado',
  decrypting: 'Descifrando',
  removeEncryptionWarningDevice:
    'El diario, los borradores y el diccionario se guardarán sin cifrar. Cualquiera con acceso a este dispositivo podrá leerlos.',
  removeEncryptionWarningBrowser:
    'El diario, los borradores y el diccionario se guardarán sin cifrar. Cualquiera con acceso a este navegador podrá leerlos.',
  passwordChanged: 'Contraseña cambiada.',
  recoveryKeyReplaced: 'Clave de recuperación reemplazada. La anterior ya no funciona.',
  encryptionRemoved: 'Cifrado quitado.',

  // Lock screen
  diaryLocked: 'Diario bloqueado',
  diaryIsEncrypted: 'Este diario está cifrado.',
  unlockNeedsSecureConnection:
    'Desbloquear necesita una conexión segura. Abre Icarus por HTTPS (o en localhost), o usa la app de escritorio.',
  unlock: 'Desbloquear',
  unlockAndSetPassword: 'Desbloquear y definir nueva contraseña',
  unlocking: 'Desbloqueando',
  forgotPassword: '¿Olvidaste tu contraseña? Usa la clave de recuperación',
  usePasswordInstead: 'Usar la contraseña',
  deleteThisDiary: 'Eliminar este diario',
  deleteDiaryTitle: '¿Eliminar este diario?',
  deleteDiaryConfirm: 'Eliminar diario',
  deleteDiaryWarningDevice:
    'El diario cifrado y sus borradores se borrarán para siempre de este dispositivo. Hazlo solo si has perdido la contraseña y la clave de recuperación. Esto no se puede deshacer.',
  deleteDiaryWarningBrowser:
    'El diario cifrado y sus borradores se borrarán para siempre de este navegador. Hazlo solo si has perdido la contraseña y la clave de recuperación. Esto no se puede deshacer.',

  // Encrypted export
  exportBackup: 'Exportar copia de seguridad',
  exportEncrypted: 'Copia de seguridad cifrada (.icarus)',
  exportEncryptedHint: 'Recomendada. Se abre en Icarus con la misma contraseña o clave de recuperación.',
  exportPlain: '.ics sin cifrar',
  exportPlainHint: 'Para apps de calendario u otras herramientas.',
  exportPlainWarning:
    'Quien obtenga este archivo podrá leer todo tu diario. Guárdalo con cuidado y bórralo cuando ya no lo necesites.',
  exportPlainConfirm: 'Exportar sin cifrar',

  // Problems
  corruptDiary: 'Este diario cifrado está dañado o se ha modificado.',
  /** The diary was written by a later version of the app. */
  newerVersionDiary: 'Este diario se cifró con una versión más reciente de Icarus',
  couldNotReadDiary: 'No se ha podido leer el diario.',
  couldNotSaveEncryptedDiary: 'No se ha podido guardar el diario cifrado. No se escribió nada.',
  couldNotEncryptDiary: 'No se ha podido cifrar el diario. No se cambió nada.',
  couldNotRekey: 'No se ha podido guardar el diario. La contraseña anterior sigue vigente.',
  couldNotRemoveEncryption: 'No se ha podido quitar el cifrado. El diario sigue cifrado.',
  copiesRemainDevice:
    'Las copias antiguas del diario en este dispositivo todavía no se han podido borrar y se pueden leer sin la contraseña actual. Icarus lo vuelve a intentar en cada guardado.',
  copiesRemainBrowser:
    'Las copias antiguas del diario en este navegador todavía no se han podido borrar y se pueden leer sin la contraseña actual. Icarus lo vuelve a intentar en cada guardado.',
};
