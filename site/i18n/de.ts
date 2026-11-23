/** The public site in German. Mirrors `en.ts`; see the notes there. */
import type { SiteMessages } from '.';

export default {
  /** Open Graph locale of this language. */
  ogLocale: 'de_DE',

  nav: {
    skip: 'Direkt zum Inhalt',
    home: 'Icarus Startseite',
    primary: 'Hauptnavigation',
    download: 'Download',
    webApp: 'Web-App',
    language: 'Sprache',
  },

  footer: {
    /** Keep the link markup as it is. */
    license:
      'Icarus ist freie Software und steht unter der <a href="https://www.gnu.org/licenses/gpl-3.0.html" rel="noopener license" class="underline underline-offset-4 hover:text-text">GNU GPL v3</a>.',
    source: 'Quellcode',
  },

  home: {
    title: 'Icarus: Tagebuch-App, privat und verschlüsselt. Kostenlos',
    description:
      'Kostenlose, quelloffene Tagebuch-App, verschlüsselt mit Passwort. Deine Einträge bleiben privat auf deinem Gerät und sind schnell durchsuchbar.',
    ogTitle: 'Icarus: ein privates Tagebuch für all deine Jahre',
    ogDescription:
      'Eine kostenlose, quelloffene Tagebuch-App. Mit Passwort verschlüsselt, auf deinem Gerät gespeichert und schnell über Jahrzehnte voller Einträge.',
    /** The line break is placed for large screens; move it to suit the language. */
    heroTitle: 'Ein privates Tagebuch<br />für all deine Jahre',
    heroLede:
      'Icarus ist eine kostenlose, quelloffene Tagebuch-App. Sperre sie mit einem Passwort, behalte jeden Eintrag auf deinem eigenen Gerät und kehre im Nu zu jedem Tag zurück.',
    download: 'Download',
    openWebApp: 'Web-App öffnen',
    platformNote: 'Für Windows, macOS, Linux und Android oder direkt in deinem Browser.',
    stageLabel: 'Der Icarus-Kalender',
    calendarAlt:
      'Der Icarus-Kalender für Oktober 2026, an den meisten Tagen mit einem Eintragstitel, und heute, der 24., eingekreist.',
    tourTitle: 'Alles, was ein Tagebuch braucht.<br />Nichts, was im Weg ist.',
    steps: [
      {
        title: 'Halte den Tag fest',
        text: 'Ein ruhiger Editor mit Markdown, Rechtschreibprüfung und automatischem Speichern. Unfertige Einträge warten für dich in den Entwürfen.',
        alt: 'Der Editor mit „Spaziergang durch die Altstadt“, mit einer Aufzählung und einem Zitat.',
      },
      {
        title: 'Kehre zu jedem Tag zurück',
        text: 'Wähle im Kalender einen Tag und lies ihn so, wie du ihn geschrieben hast. Tage mit mehreren Einträgen kannst du durchblättern.',
        alt: 'Samstag, 24. Oktober 2026 geöffnet neben dem Kalender, mit dem ersten von zwei Einträgen.',
      },
      {
        title: 'Finde es, egal aus welchem Jahr',
        text: 'Durchsuche Titel, Orte und Texte aller Einträge, während du tippst, und springe direkt zum Tag.',
        alt: 'Die Suche nach „Ana“ listet passende Einträge von 2019 bis 2026, das Wort ist hervorgehoben.',
      },
      {
        title: 'Sieh, wie weit du gekommen bist',
        text: 'Einträge, geschriebene Zeichen und deine meistgeschriebenen Tage, für den letzten Monat, das letzte Jahr oder die gesamte Zeit.',
        alt: 'Statistik für die gesamte Zeit: 1.046 Einträge, ein Diagramm der Zeichen pro Jahr seit 2019 und die besten Tage.',
      },
      {
        title: 'Sperre es, wenn du weggehst',
        text: 'Mit Passwort wird jeder Eintrag und Entwurf verschlüsselt, und das Tagebuch sperrt sich nach ein paar Minuten ohne Eingabe selbst.',
        alt: 'Der Sperrbildschirm: „Tagebuch gesperrt“ mit einem Passwortfeld und einer Schaltfläche „Entsperren“.',
      },
    ],
    pocketTitle: 'Auch unterwegs',
    pocketText:
      'Die Android-App ist dasselbe Tagebuch, gemacht für eine Hand. Wische zwischen Tagen, schreibe im Bus und sperre es mit demselben Passwort.',
    phoneCalendarAlt: 'Der Kalender auf einem Android-Smartphone.',
    phoneReaderAlt: 'Ein Eintrag, geöffnet auf einem Android-Smartphone.',
    facts: [
      '<strong>Kein Konto.</strong> Du musst dich nirgends anmelden, und kein Server sieht jemals dein Tagebuch.',
      '<strong>Deine eigene Datei.</strong> Einträge liegen in einer standardmäßigen .ics-Kalenderdatei. Importiere dein altes Tagebuch und exportiere es, wann immer du möchtest.',
      '<strong>Kostenlos und quelloffen.</strong> GNU GPL v3. Jeder kann den Code lesen und prüfen, wie ein Tagebuch behandelt wird.',
    ],
    faqTitle: 'Fragen',
    faq: [
      {
        q: 'Ist Icarus kostenlos?',
        a: 'Ja. Icarus ist kostenlos und quelloffen unter der GNU GPL v3. Es gibt keine Konten, keine Werbung und keine Abos.',
      },
      {
        q: 'Wo wird mein Tagebuch gespeichert?',
        a: 'Nur auf deinem Gerät. Die Desktop-App speichert es in einem Ordner deiner Wahl, die Android-App in ihrem privaten Speicher und die Web-App im Speicher deines Browsers. Icarus hat keine Server, die Tagebücher empfangen oder speichern.',
      },
      {
        q: 'Was passiert, wenn ich mein Passwort vergesse?',
        a: 'Nutze den Wiederherstellungsschlüssel, den du beim Festlegen deines Passworts gespeichert hast. Ohne Passwort oder Wiederherstellungsschlüssel kann niemand das Tagebuch öffnen.',
      },
      {
        q: 'Kann ich mein bestehendes Tagebuch übernehmen?',
        a: 'Ja. Importiere eine beliebige .ics-Datei, und jeder Eintrag erscheint an seinem Tag. Du kannst dein Tagebuch jederzeit als .ics exportieren.',
      },
      {
        q: 'Welche Sprachen unterstützt Icarus?',
        a: 'Englisch, Spanisch, Italienisch, Französisch und Deutsch, jeweils mit eigener Rechtschreibprüfung. Icarus folgt der Systemsprache, und du kannst sie in den Einstellungen ändern.',
      },
    ],
    closingTitle: 'Schreibe das heutige Kapitel',
  },

  download: {
    title: 'Icarus herunterladen für Windows, macOS, Linux und Android',
    description:
      'Lade die kostenlose Tagebuch-App Icarus für Windows, macOS, Linux und Android herunter. Dein Tagebuch bleibt auf deinem Gerät, verschlüsselt mit deinem Passwort.',
    ogTitle: 'Icarus herunterladen',
    ogDescription: 'Eine kostenlose, private Tagebuch-App für Windows, macOS, Linux und Android.',
    heading: 'Icarus herunterladen',
    lede: 'Kostenlos für Windows, macOS, Linux und Android. Dein Tagebuch bleibt auf deinem Gerät und nirgendwo sonst.',
    platforms: 'Plattformen',
    yourSystem: 'Dein System',
    firstLaunch: 'Erster Start',
    windowsRequirements: 'Windows 10 und 11, 64 Bit',
    windowsInstaller: 'Installationsprogramm herunterladen',
    windowsMsi: 'MSI-Paket',
    windowsFirstLaunch:
      'Das Installationsprogramm ist noch nicht signiert. Windows meldet deshalb vielleicht <q>Der Computer wurde durch Windows geschützt</q>. Wähle <span class="text-text">Weitere Informationen</span> und dann <span class="text-text">Trotzdem ausführen</span>.',
    macRequirements: 'macOS 11 oder neuer, Apple Silicon und Intel',
    macDownload: 'Disk-Image herunterladen',
    macSteps: [
      'Öffne das Disk-Image und ziehe Icarus in <span class="text-text">Programme</span>.',
      'Öffne Icarus. macOS blockiert es, weil die App noch nicht von Apple notarisiert ist.',
      'Gehe zu <span class="text-text">Systemeinstellungen → Datenschutz &amp; Sicherheit</span>, scrolle nach unten und wähle <span class="text-text">Dennoch öffnen</span>.',
    ],
    linuxRequirements: '64-Bit-x86',
    linuxDownload: 'AppImage herunterladen',
    linuxFirstLaunch:
      'Mache das AppImage über seine Dateieigenschaften ausführbar oder führe <code class="rounded bg-slate px-1 py-0.5 font-mono text-xs text-text">chmod +x Icarus-Diary-*.AppImage</code> aus. Die Pakete <span class="text-text">.deb</span> und <span class="text-text">.rpm</span> werden über deine Paketverwaltung installiert.',
    androidRequirements: 'Android 7 oder neuer',
    androidDownload: 'APK herunterladen',
    androidSteps: [
      'Öffne die heruntergeladene Datei. Icarus ist noch nicht bei Google Play erhältlich, daher fragt Android, ob du deinem Browser das Installieren von Apps erlauben möchtest.',
      'Wenn Play Protect vor einer unbekannten App warnt, wähle <span class="text-text">Mehr Details</span> und dann <span class="text-text">Trotzdem installieren</span>.',
    ],
    updating: 'Aktualisieren',
    androidUpdate:
      'Öffne die neue APK und tippe auf <span class="text-text">Aktualisieren</span>. Android ersetzt die App an Ort und Stelle und behält dein Tagebuch. Deinstalliere die alte Version nicht vorher.',
    androidUninstall:
      'Dein Tagebuch wird privat in der App gespeichert, daher löscht das Deinstallieren das Tagebuch. Exportiere vorher eine Sicherung unter den Einstellungen.',
    verify: 'Download prüfen (SHA-256)',
    verifyText:
      'Die Builds sind noch nicht signiert. Vergleiche die Prüfsumme der heruntergeladenen Datei mit dieser Liste.',
    noInstall: 'Lieber nichts installieren?',
    openWebApp: 'Web-App öffnen',
  },

  notFound: {
    title: 'Seite nicht gefunden: Icarus',
    heading: 'Diese Seite gibt es nicht',
    text: 'Die Adresse ist vielleicht falsch geschrieben, oder die Seite wurde verschoben.',
    home: 'Zur Startseite',
    openWebApp: 'Web-App öffnen',
  },

  /** Structured data for search engines. */
  schema: {
    appDescription:
      'Eine kostenlose, quelloffene Tagebuch-App. Einträge sind mit deinem Passwort verschlüsselt, nur auf deinem Gerät in einer standardmäßigen .ics-Kalenderdatei gespeichert und über viele Jahre ohne Verzögerung durchblätterbar.',
    features: [
      'Passwortverschlüsselung von Tagebucheinträgen und Entwürfen',
      'Lokale Speicherung ohne Konto und ohne Server',
      'Einträge im standardisierten iCalendar-Format (.ics)',
      'Import und Export von .ics-Dateien',
      'Kalenderansicht und sofortige Suche über viele Jahre an Einträgen',
      'Markdown-Editor mit Rechtschreibprüfung in fünf Sprachen',
      'Desktop-App, Android-App und Web-App',
    ],
  },

  /** Read by the page scripts. */
  client: {
    /** `{platform}` is Windows, macOS, Linux or Android. */
    downloadFor: 'Herunterladen für {platform}',
    iosNote:
      'Auf iPhone und iPad öffnest du die Web-App und fügst sie zu deinem Home-Bildschirm hinzu, um sie wie jede andere App zu nutzen.',
    /** `{date}` is a full date, like “November 23, 2026”. */
    release: 'Version {version}, veröffentlicht am {date}',
    /** `{size}` is a whole number of megabytes. */
    size: '{size} MB',
    noRelease: 'Die erste Veröffentlichung ist unterwegs. Bis dahin kannst du in der Web-App schreiben.',
    updateNewer: 'Icarus {latest} ist erschienen. Du hast {installed}.',
    updateCurrent: 'Du bist mit {installed} auf dem neuesten Stand.',
    updateNothing: 'Es gibt nichts Neues zu installieren. Icarus fragt in einem Monat wieder nach.',
    updatePick: 'Wähle unten dein System und installiere die Aktualisierung über deine aktuelle Version.',
    updateSteps: {
      android:
        'Lade die APK unten herunter, öffne sie und tippe auf Aktualisieren. Android behält dein Tagebuch. Deinstalliere die alte Version nicht vorher, denn das löscht das Tagebuch.',
      windows: 'Führe das neue Installationsprogramm aus. Es ersetzt diese Version, und dein Tagebuch bleibt, wo es war.',
      macos:
        'Öffne das Disk-Image und ziehe Icarus in Programme, um die alte Version zu ersetzen. Dein Tagebuch bleibt, wo es war.',
      linux:
        'Installiere das neue Paket über das alte oder ersetze das AppImage durch das neue und lösche die alte Datei. Dein Tagebuch bleibt, wo es war.',
    },
  },
} satisfies SiteMessages;
