/** The public site in Italian. Mirrors `en.ts`; see the notes there. */
import type { SiteMessages } from '.';

export default {
  /** Open Graph locale of this language. */
  ogLocale: 'it_IT',

  nav: {
    skip: 'Vai al contenuto',
    home: 'Home di Icarus',
    primary: 'Principale',
    download: 'Scarica',
    webApp: 'App web',
    language: 'Lingua',
  },

  footer: {
    /** Keep the link markup as it is. */
    license:
      'Icarus è software libero, rilasciato con licenza <a href="https://www.gnu.org/licenses/gpl-3.0.html" rel="noopener license" class="underline underline-offset-4 hover:text-text">GNU GPL v3</a>.',
    source: 'Codice sorgente',
  },

  home: {
    title: 'Icarus: app diario privato e cifrato, gratis e open source',
    description:
      'App diario gratis e open source. Proteggi le voci con una password, tienile sul tuo dispositivo e sfogliale in un attimo, anche dopo anni.',
    ogTitle: 'Icarus: un diario privato per tutti i tuoi anni',
    ogDescription:
      'Un’app diario gratuita e open source. Cifrata con password, salvata sul tuo dispositivo e veloce anche tra decenni di voci.',
    /** The line break is placed for large screens; move it to suit the language. */
    heroTitle: 'Un diario privato<br />per tutti i tuoi anni',
    heroLede:
      'Icarus è un’app diario gratuita e open source. Proteggila con una password, tieni ogni voce sul tuo dispositivo e torna a qualsiasi giorno in un istante.',
    download: 'Scarica',
    openWebApp: 'Apri l’app web',
    platformNote: 'Per Windows, macOS, Linux e Android, oppure direttamente nel browser.',
    stageLabel: 'Il calendario di Icarus',
    calendarAlt: 'Il calendario di Icarus di ottobre 2026, con il titolo di una voce in quasi tutti i giorni e oggi, il 24, cerchiato.',
    tourTitle: 'Tutto ciò che serve a un diario.<br />Niente che si metta in mezzo.',
    steps: [
      {
        title: 'Scrivi la giornata',
        text: 'Un editor essenziale con Markdown, controllo ortografico e salvataggio automatico. Le voci non finite ti aspettano nelle Bozze.',
        alt: 'L’editor aperto su “Passeggiata nel centro storico”, con un elenco puntato e una citazione.',
      },
      {
        title: 'Torna a qualsiasi giorno',
        text: 'Scegli un giorno nel calendario e rileggilo come l’hai scritto. I giorni con più voci ti permettono di scorrerle.',
        alt: 'Sabato 24 ottobre 2026 aperto accanto al calendario, con la prima di due voci.',
      },
      {
        title: 'Trovala, qualunque sia l’anno',
        text: 'Cerca titoli, luoghi e testo in tutte le voci mentre scrivi, e vai dritto al giorno.',
        alt: 'Cercando “Ana” compaiono le voci corrispondenti dal 2019 al 2026, con la parola evidenziata.',
      },
      {
        title: 'Guarda quanta strada hai fatto',
        text: 'Voci, caratteri scritti e giorni di punta, per l’ultimo mese, l’ultimo anno o di sempre.',
        alt: 'Statistiche per tutto il periodo: 1.046 voci, un grafico dei caratteri per anno dal 2019 e i giorni di punta.',
      },
      {
        title: 'Bloccala quando ti allontani',
        text: 'Con una password, ogni voce e bozza è cifrata, e il diario si blocca da solo dopo qualche minuto di inattività.',
        alt: 'La schermata di blocco: “Diario bloccato” con un campo password e il pulsante Sblocca.',
      },
    ],
    pocketTitle: 'Anche in tasca',
    pocketText:
      'L’app Android è lo stesso diario, pensato per una mano sola. Scorri tra i giorni, scrivi sull’autobus e bloccalo con la stessa password.',
    phoneCalendarAlt: 'Il calendario su un telefono Android.',
    phoneReaderAlt: 'Una voce aperta su un telefono Android.',
    facts: [
      '<strong>Nessun account.</strong> Nulla a cui iscriversi e nessun server che veda mai il tuo diario.',
      '<strong>Un tuo file.</strong> Le voci sono in un normale file calendario .ics. Importa il tuo vecchio diario ed esportalo quando vuoi.',
      '<strong>Gratuito e open source.</strong> GNU GPL v3. Chiunque può leggere il codice e verificare come viene gestito un diario.',
    ],
    faqTitle: 'Domande',
    faq: [
      {
        q: 'Icarus è gratis?',
        a: 'Sì. Icarus è gratuito e open source con licenza GNU GPL v3. Non ci sono account, pubblicità né abbonamenti.',
      },
      {
        q: 'Dove viene salvato il mio diario?',
        a: 'Solo sul tuo dispositivo. L’app desktop lo salva in una cartella che scegli tu, l’app Android lo conserva nel suo spazio privato e l’app web lo tiene nella memoria del browser. Icarus non ha server che ricevano o conservino diari.',
      },
      {
        q: 'Cosa succede se dimentico la password?',
        a: 'Usa la chiave di recupero salvata quando hai impostato la password. Senza password né chiave di recupero, nessuno può aprire il diario.',
      },
      {
        q: 'Posso portare il diario che ho già?',
        a: 'Sì. Importa un file .ics qualsiasi e ogni voce compare nel suo giorno. Puoi esportare il tuo diario in .ics in qualsiasi momento.',
      },
      {
        q: 'Quali lingue supporta Icarus?',
        a: 'Inglese, spagnolo, italiano, francese e tedesco, con un controllo ortografico per ciascuna. Icarus segue la lingua del sistema, e puoi cambiarla nelle Impostazioni.',
      },
    ],
    closingTitle: 'Scrivi il capitolo di oggi',
  },

  download: {
    title: 'Scarica Icarus per Windows, macOS, Linux e Android',
    description:
      'Scarica gratis l’app diario Icarus per Windows, macOS, Linux e Android. Il tuo diario resta sul dispositivo, cifrato con la tua password.',
    ogTitle: 'Scarica Icarus',
    ogDescription: 'Un’app diario gratuita e privata per Windows, macOS, Linux e Android.',
    heading: 'Scarica Icarus',
    lede: 'Gratis per Windows, macOS, Linux e Android. Il tuo diario resta sul tuo dispositivo, e in nessun altro posto.',
    platforms: 'Piattaforme',
    yourSystem: 'Il tuo sistema',
    firstLaunch: 'Primo avvio',
    windowsRequirements: 'Windows 10 e 11, 64 bit',
    windowsInstaller: 'Scarica il programma di installazione',
    windowsMsi: 'Pacchetto MSI',
    windowsFirstLaunch:
      'Il programma di installazione non è ancora firmato, quindi Windows potrebbe mostrare il messaggio <q>Windows ha protetto il PC</q>. Scegli <span class="text-text">Ulteriori informazioni</span>, poi <span class="text-text">Esegui comunque</span>.',
    macRequirements: 'macOS 11 o successivo, Apple silicon e Intel',
    macDownload: 'Scarica l’immagine disco',
    macSteps: [
      'Apri l’immagine disco e trascina Icarus in <span class="text-text">Applicazioni</span>.',
      'Apri Icarus. macOS lo blocca perché l’app non è ancora notarizzata da Apple.',
      'Vai in <span class="text-text">Impostazioni di Sistema → Privacy e sicurezza</span>, scorri in basso e scegli <span class="text-text">Apri comunque</span>.',
    ],
    linuxRequirements: '64 bit, x86',
    linuxDownload: 'Scarica AppImage',
    linuxFirstLaunch:
      'Rendi eseguibile l’AppImage dalle sue proprietà, oppure esegui <code class="rounded bg-slate px-1 py-0.5 font-mono text-xs text-text">chmod +x Icarus-Diary-*.AppImage</code>. I pacchetti <span class="text-text">.deb</span> e <span class="text-text">.rpm</span> si installano tramite il gestore dei pacchetti.',
    androidRequirements: 'Android 7 o successivo',
    androidDownload: 'Scarica APK',
    androidSteps: [
      'Apri il file scaricato. Icarus non è ancora su Google Play, quindi Android ti chiede di consentire al browser di installare app.',
      'Se Play Protect segnala un’app sconosciuta, scegli <span class="text-text">Altri dettagli</span>, poi <span class="text-text">Installa comunque</span>.',
    ],
    updating: 'Aggiornamento',
    androidUpdate:
      'Apri il nuovo APK e tocca <span class="text-text">Aggiorna</span>. Android sostituisce l’app sul posto e conserva il tuo diario. Non disinstallare prima la versione vecchia.',
    androidUninstall:
      'Il tuo diario è salvato in modo privato all’interno dell’app, quindi disinstallarla cancella il diario. Esporta un backup dalle Impostazioni prima di farlo.',
    verify: 'Verifica il download (SHA-256)',
    verifyText: 'I pacchetti non sono ancora firmati. Confronta il checksum del file scaricato con questo elenco.',
    noInstall: 'Preferisci non installare nulla?',
    openWebApp: 'Apri l’app web',
  },

  notFound: {
    title: 'Pagina non trovata: Icarus',
    heading: 'Questa pagina non esiste',
    text: 'L’indirizzo potrebbe contenere un errore, oppure la pagina è stata spostata.',
    home: 'Vai alla home page',
    openWebApp: 'Apri l’app web',
  },

  /** Structured data for search engines. */
  schema: {
    appDescription:
      'App diario gratuita e open source. Le voci sono cifrate con la tua password, salvate solo sul tuo dispositivo in un normale file calendario .ics e consultabili per molti anni senza attese.',
    features: [
      'Cifratura con password di voci e bozze',
      'Archiviazione locale, senza account né server',
      'Voci salvate nel formato standard iCalendar (.ics)',
      'Importazione ed esportazione di file .ics',
      'Vista calendario e ricerca istantanea su anni di voci',
      'Editor Markdown con controllo ortografico in cinque lingue',
      'App desktop, app Android e app web',
    ],
  },

  /** Read by the page scripts. */
  client: {
    /** `{platform}` is Windows, macOS, Linux or Android. */
    downloadFor: 'Scarica per {platform}',
    iosNote: 'Su iPhone e iPad, apri l’app web e aggiungila alla schermata Home per usarla come qualsiasi altra app.',
    /** `{date}` is a full date, like “November 23, 2026”. */
    release: 'Versione {version}, rilasciata il {date}',
    /** `{size}` is a whole number of megabytes. */
    size: '{size} MB',
    noRelease: 'La prima versione è in arrivo. Nel frattempo puoi scrivere nell’app web.',
    updateNewer: 'È uscita Icarus {latest}. Tu hai la versione {installed}.',
    updateCurrent: 'Sei aggiornato alla versione {installed}.',
    updateNothing: 'Non c’è nulla di nuovo da installare. Icarus ti chiederà di nuovo tra un mese.',
    updatePick: 'Scegli il tuo sistema qui sotto e installa sopra la versione attuale.',
    updateSteps: {
      android:
        'Scarica l’APK qui sotto, aprilo e tocca Aggiorna. Android conserva il tuo diario. Non disinstallare prima la versione vecchia: così cancelleresti il diario.',
      windows: 'Esegui il nuovo programma di installazione. Sostituisce questa versione e il tuo diario resta dov’era.',
      macos: 'Apri l’immagine disco e trascina Icarus in Applicazioni, sostituendo quella vecchia. Il tuo diario resta dov’era.',
      linux:
        'Installa il nuovo pacchetto sopra il vecchio, oppure sostituisci con la nuova AppImage ed elimina il file vecchio. Il tuo diario resta dov’era.',
    },
  },
} satisfies SiteMessages;
