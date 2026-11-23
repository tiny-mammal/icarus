/** The public site in Spanish. Mirrors `en.ts`; see the notes there. */
import type { SiteMessages } from '.';

export default {
  /** Open Graph locale of this language. */
  ogLocale: 'es_ES',

  nav: {
    skip: 'Ir al contenido',
    home: 'Inicio de Icarus',
    primary: 'Principal',
    download: 'Descargar',
    webApp: 'App web',
    language: 'Idioma',
  },

  footer: {
    /** Keep the link markup as it is. */
    license:
      'Icarus es software libre, con licencia <a href="https://www.gnu.org/licenses/gpl-3.0.html" rel="noopener license" class="underline underline-offset-4 hover:text-text">GNU GPL v3</a>.',
    source: 'Código fuente',
  },

  home: {
    title: 'Icarus: app de diario personal privado y cifrado. Gratis',
    description:
      'Icarus, app de diario gratis, privada y de código abierto. Cifra tus entradas con contraseña, guárdalas en tu dispositivo y busca años al instante.',
    ogTitle: 'Icarus: un diario privado para todos tus años',
    ogDescription:
      'Diario gratis y de código abierto. Cifrado con contraseña, guardado en tu dispositivo y rápido con décadas de entradas.',
    /** The line break is placed for large screens; move it to suit the language. */
    heroTitle: 'Un diario privado<br />para todos tus años',
    heroLede:
      'Icarus es una app de diario gratis y de código abierto. Bloquéala con una contraseña, guarda cada entrada en tu dispositivo y vuelve a cualquier día al instante.',
    download: 'Descargar',
    openWebApp: 'Abrir la app web',
    platformNote: 'Para Windows, macOS, Linux y Android, o directamente en tu navegador.',
    stageLabel: 'El calendario de Icarus',
    calendarAlt:
      'El calendario de Icarus de octubre de 2026, con el título de una entrada en la mayoría de los días y hoy, el 24, marcado con un círculo.',
    tourTitle: 'Todo lo que necesita un diario.<br />Nada que estorbe.',
    steps: [
      {
        title: 'Escribe tu día',
        text: 'Un editor tranquilo con Markdown, corrector ortográfico y guardado automático. Las entradas sin terminar te esperan en Borradores.',
        alt: 'El editor abierto en “Paseando por el casco antiguo”, con una lista con viñetas y una cita.',
      },
      {
        title: 'Vuelve a cualquier día',
        text: 'Elige un día en el calendario y léelo tal como lo escribiste. Los días con varias entradas te permiten pasar de una a otra.',
        alt: 'El sábado 24 de octubre de 2026 abierto junto al calendario, mostrando la primera de dos entradas.',
      },
      {
        title: 'Encuéntralo, sea del año que sea',
        text: 'Busca en títulos, lugares y textos de todas las entradas mientras escribes, y ve directo al día.',
        alt: 'Buscar “Ana” muestra las entradas de 2019 a 2026 que coinciden, con la palabra resaltada.',
      },
      {
        title: 'Mira hasta dónde has llegado',
        text: 'Entradas, caracteres escritos y tus días más llenos, del último mes, del último año o desde siempre.',
        alt: 'Estadísticas desde siempre: 1.046 entradas, un gráfico de caracteres por año desde 2019 y los días con más texto.',
      },
      {
        title: 'Bloquéalo al alejarte',
        text: 'Con una contraseña, cada entrada y borrador queda cifrado, y el diario se bloquea solo tras unos minutos de inactividad.',
        alt: 'La pantalla de bloqueo: “Diario bloqueado” con un campo de contraseña y un botón Desbloquear.',
      },
    ],
    pocketTitle: 'También en tu bolsillo',
    pocketText:
      'La app de Android es el mismo diario, pensado para una sola mano. Desliza entre días, escribe en el autobús y bloquéalo con la misma contraseña.',
    phoneCalendarAlt: 'El calendario en un teléfono Android.',
    phoneReaderAlt: 'Una entrada abierta en un teléfono Android.',
    facts: [
      '<strong>Sin cuenta.</strong> No hay nada en lo que registrarse ni ningún servidor que vea tu diario.',
      '<strong>Tu propio archivo.</strong> Las entradas están en un archivo de calendario .ics estándar. Importa tu diario antiguo y expórtalo cuando quieras.',
      '<strong>Gratis y de código abierto.</strong> GNU GPL v3. Cualquiera puede leer el código y comprobar cómo se trata un diario.',
    ],
    faqTitle: 'Preguntas',
    faq: [
      {
        q: '¿Es Icarus gratis?',
        a: 'Sí. Icarus es gratuito y de código abierto bajo la GNU GPL v3. No hay cuentas, anuncios ni suscripciones.',
      },
      {
        q: '¿Dónde se guarda mi diario?',
        a: 'Solo en tu dispositivo. La app de escritorio lo guarda en una carpeta que tú eliges, la app de Android lo guarda en su almacenamiento privado, y la app web lo guarda en el almacenamiento de tu navegador. Icarus no tiene servidores que reciban ni guarden diarios.',
      },
      {
        q: '¿Qué pasa si olvido mi contraseña?',
        a: 'Usa la clave de recuperación que guardaste al crear la contraseña. Sin la contraseña ni la clave de recuperación, nadie puede abrir el diario.',
      },
      {
        q: '¿Puedo traer el diario que ya tengo?',
        a: 'Sí. Importa cualquier archivo .ics y cada entrada aparecerá en su día. Puedes exportar tu diario como .ics en cualquier momento.',
      },
      {
        q: '¿En qué idiomas funciona Icarus?',
        a: 'Icarus está en inglés, español, italiano, francés y alemán, con un corrector ortográfico para cada idioma. Sigue el idioma de tu sistema, y puedes cambiarlo en Ajustes.',
      },
    ],
    closingTitle: 'Escribe el capítulo de hoy',
  },

  download: {
    title: 'Descarga Icarus para Windows, macOS, Linux y Android',
    description:
      'Descarga gratis la app de diario Icarus para Windows, macOS, Linux y Android. Tu diario se queda en tu dispositivo, cifrado con tu contraseña.',
    ogTitle: 'Descargar Icarus',
    ogDescription: 'App de diario gratis y privada para Windows, macOS, Linux y Android.',
    heading: 'Descargar Icarus',
    lede: 'Gratis para Windows, macOS, Linux y Android. Tu diario se queda en tu dispositivo, y en ningún otro sitio.',
    platforms: 'Plataformas',
    yourSystem: 'Tu sistema',
    firstLaunch: 'Primer inicio',
    windowsRequirements: 'Windows 10 y 11, de 64 bits',
    windowsInstaller: 'Descargar instalador',
    windowsMsi: 'Paquete MSI',
    windowsFirstLaunch:
      'El instalador todavía no está firmado, así que Windows puede mostrar el mensaje <q>Windows protegió su PC</q>. Elige <span class="text-text">Más información</span> y luego <span class="text-text">Ejecutar de todas formas</span>.',
    macRequirements: 'macOS 11 o posterior, chips Apple silicon e Intel',
    macDownload: 'Descargar imagen de disco',
    macSteps: [
      'Abre la imagen de disco y arrastra Icarus a <span class="text-text">Aplicaciones</span>.',
      'Abre Icarus. macOS lo detiene porque Apple todavía no ha notarizado la app.',
      'Ve a <span class="text-text">Ajustes del Sistema → Privacidad y seguridad</span>, baja y elige <span class="text-text">Abrir igualmente</span>.',
    ],
    linuxRequirements: 'x86 de 64 bits',
    linuxDownload: 'Descargar AppImage',
    linuxFirstLaunch:
      'Haz ejecutable el AppImage desde las propiedades del archivo, o ejecuta <code class="rounded bg-slate px-1 py-0.5 font-mono text-xs text-text">chmod +x Icarus-Diary-*.AppImage</code>. Los paquetes <span class="text-text">.deb</span> y <span class="text-text">.rpm</span> se instalan con tu gestor de paquetes.',
    androidRequirements: 'Android 7 o posterior',
    androidDownload: 'Descargar APK',
    androidSteps: [
      'Abre el archivo descargado. Icarus todavía no está en Google Play, así que Android te pide permiso para que tu navegador instale apps.',
      'Si Play Protect avisa de una app desconocida, elige <span class="text-text">Más detalles</span> y luego <span class="text-text">Instalar de todas formas</span>.',
    ],
    updating: 'Actualizar',
    androidUpdate:
      'Abre el nuevo APK y toca <span class="text-text">Actualizar</span>. Android reemplaza la app en su sitio y conserva tu diario. No desinstales antes la versión anterior.',
    androidUninstall:
      'Tu diario se guarda de forma privada dentro de la app, así que al desinstalarla se borra el diario. Exporta antes una copia de seguridad desde Ajustes.',
    verify: 'Verifica tu descarga (SHA-256)',
    verifyText: 'Las versiones todavía no están firmadas. Compara la suma de comprobación del archivo que descargaste con esta lista.',
    noInstall: '¿Prefieres no instalar nada?',
    openWebApp: 'Abrir la app web',
  },

  notFound: {
    title: 'Página no encontrada: Icarus',
    heading: 'Esta página no existe',
    text: 'Puede que la dirección esté mal escrita o que la página se haya movido.',
    home: 'Ir a la página de inicio',
    openWebApp: 'Abrir la app web',
  },

  /** Structured data for search engines. */
  schema: {
    appDescription:
      'App de diario gratis y de código abierto. Las entradas se cifran con tu contraseña, se guardan solo en tu dispositivo en un archivo de calendario .ics estándar y se pueden consultar durante muchos años sin demora.',
    features: [
      'Cifrado con contraseña de las entradas y borradores del diario',
      'Almacenamiento local, sin cuenta ni servidor',
      'Entradas guardadas en el formato estándar iCalendar (.ics)',
      'Importación y exportación de archivos .ics',
      'Vista de calendario y búsqueda instantánea en años de entradas',
      'Editor Markdown con corrector ortográfico en cinco idiomas',
      'App de escritorio, app de Android y app web',
    ],
  },

  /** Read by the page scripts. */
  client: {
    /** `{platform}` is Windows, macOS, Linux or Android. */
    downloadFor: 'Descargar para {platform}',
    iosNote: 'En iPhone y iPad, abre la app web y añádela a tu pantalla de inicio para usarla como cualquier otra app.',
    /** `{date}` is a full date, like “November 23, 2026”. */
    release: 'Versión {version}, publicada el {date}',
    /** `{size}` is a whole number of megabytes. */
    size: '{size} MB',
    noRelease: 'La primera versión está en camino. Mientras tanto, puedes escribir en la app web.',
    updateNewer: 'Icarus {latest} ya está disponible. Tienes la versión {installed}.',
    updateCurrent: 'Estás al día con la versión {installed}.',
    updateNothing: 'No hay nada nuevo que instalar. Icarus volverá a preguntar dentro de un mes.',
    updatePick: 'Elige tu sistema abajo e instala encima de tu versión actual.',
    updateSteps: {
      android:
        'Descarga el APK de abajo, ábrelo y toca Actualizar. Android conserva tu diario. No desinstales antes la versión anterior: eso borra el diario.',
      windows: 'Ejecuta el nuevo instalador. Sustituye esta versión y tu diario se queda donde estaba.',
      macos: 'Abre la imagen de disco y arrastra Icarus a Aplicaciones, reemplazando la anterior. Tu diario se queda donde estaba.',
      linux:
        'Instala el nuevo paquete encima del anterior, o sustituye el AppImage por el nuevo y borra el archivo antiguo. Tu diario se queda donde estaba.',
    },
  },
} satisfies SiteMessages;
