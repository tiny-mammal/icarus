/** The public site in French. Mirrors `en.ts`; see the notes there. */
import type { SiteMessages } from '.';

export default {
  /** Open Graph locale of this language. */
  ogLocale: 'fr_FR',

  nav: {
    skip: 'Aller au contenu',
    home: 'Accueil d’Icarus',
    primary: 'Principale',
    download: 'Télécharger',
    webApp: 'Appli web',
    language: 'Langue',
  },

  footer: {
    /** Keep the link markup as it is. */
    license:
      'Icarus est un logiciel libre, distribué sous licence <a href="https://www.gnu.org/licenses/gpl-3.0.html" rel="noopener license" class="underline underline-offset-4 hover:text-text">GNU GPL v3</a>.',
    source: 'Code source',
  },

  home: {
    title: 'Icarus : journal intime gratuit, privé et chiffré',
    description:
      'Application de journal intime gratuite et libre. Vos entrées sont chiffrées par mot de passe, restent sur votre appareil et s’ouvrent en un instant.',
    ogTitle: 'Icarus : un journal privé pour toutes vos années',
    ogDescription:
      'Une application de journal intime gratuite et libre. Chiffrée par mot de passe, stockée sur votre appareil et rapide sur des décennies d’entrées.',
    /** The line break is placed for large screens; move it to suit the language. */
    heroTitle: 'Un journal privé<br />pour toutes vos années',
    heroLede:
      'Icarus est une application de journal intime gratuite et libre. Verrouillez-la avec un mot de passe, gardez chaque entrée sur votre appareil et revenez à n’importe quel jour en un instant.',
    download: 'Télécharger',
    openWebApp: 'Ouvrir l’application web',
    platformNote: 'Pour Windows, macOS, Linux et Android, ou directement dans votre navigateur.',
    stageLabel: 'Le calendrier d’Icarus',
    calendarAlt:
      'Le calendrier d’Icarus pour octobre 2026, avec un titre d’entrée sur la plupart des jours, et le 24, aujourd’hui, entouré.',
    tourTitle: 'Tout ce dont un journal a besoin.<br />Rien qui gêne.',
    steps: [
      {
        title: 'Écrire la journée',
        text: 'Un éditeur calme avec Markdown, correcteur orthographique et enregistrement automatique. Les entrées inachevées vous attendent dans les Brouillons.',
        alt: 'L’éditeur ouvert sur « Balade dans la vieille ville », avec une liste à puces et une citation.',
      },
      {
        title: 'Revenir à n’importe quel jour',
        text: 'Choisissez un jour dans le calendrier et relisez-le tel que vous l’avez écrit. Les jours avec plusieurs entrées permettent de passer de l’une à l’autre.',
        alt: 'Samedi 24 octobre 2026 ouvert à côté du calendrier, montrant la première de deux entrées.',
      },
      {
        title: 'La retrouver, quelle que soit l’année',
        text: 'Recherchez titres, lieux et textes dans toutes les entrées pendant que vous tapez, et allez directement au jour voulu.',
        alt: 'La recherche de « Ana » affiche les entrées correspondantes de 2019 à 2026, avec le mot en surbrillance.',
      },
      {
        title: 'Voyez le chemin parcouru',
        text: 'Entrées, caractères rédigés et vos jours les plus longs, pour le dernier mois, la dernière année ou depuis le début.',
        alt: 'Statistiques depuis le début : 1 046 entrées, un graphique des caractères par année depuis 2019 et les jours les plus longs.',
      },
      {
        title: 'Verrouillez-le en vous éloignant',
        text: 'Avec un mot de passe, chaque entrée et chaque brouillon est chiffré, et le journal se verrouille tout seul après quelques minutes d’inactivité.',
        alt: 'L’écran de verrouillage : « Journal verrouillé », avec un champ de mot de passe et un bouton Déverrouiller.',
      },
    ],
    pocketTitle: 'Aussi dans votre poche',
    pocketText:
      'L’application Android est le même journal, conçu pour une seule main. Glissez d’un jour à l’autre, écrivez dans le bus et verrouillez-le avec le même mot de passe.',
    phoneCalendarAlt: 'Le calendrier sur un téléphone Android.',
    phoneReaderAlt: 'Une entrée ouverte sur un téléphone Android.',
    facts: [
      '<strong>Pas de compte.</strong> Rien à créer, et aucun serveur ne voit jamais votre journal.',
      '<strong>Votre propre fichier.</strong> Les entrées sont stockées dans un fichier de calendrier .ics standard. Importez votre ancien journal et exportez-le quand vous voulez.',
      '<strong>Gratuit et libre.</strong> GNU GPL v3. Chacun peut lire le code et vérifier comment un journal est traité.',
    ],
    faqTitle: 'Questions fréquentes',
    faq: [
      {
        q: 'Icarus est-il gratuit ?',
        a: 'Oui. Icarus est gratuit et libre sous licence GNU GPL v3. Il n’y a ni compte, ni publicité, ni abonnement.',
      },
      {
        q: 'Où mon journal est-il stocké ?',
        a: 'Uniquement sur votre appareil. L’application de bureau l’enregistre dans un dossier de votre choix, l’application Android le garde dans son espace de stockage privé, et l’application web le conserve dans le stockage de votre navigateur. Aucun serveur ne reçoit ni ne conserve votre journal.',
      },
      {
        q: 'Que se passe-t-il si j’oublie mon mot de passe ?',
        a: 'Utilisez la clé de récupération que vous avez enregistrée lors du choix de votre mot de passe. Sans le mot de passe ni la clé de récupération, personne ne peut ouvrir le journal.',
      },
      {
        q: 'Puis-je importer le journal que je tiens déjà ?',
        a: 'Oui. Importez n’importe quel fichier .ics et chaque entrée apparaît à son jour. Vous pouvez exporter votre journal en .ics à tout moment.',
      },
      {
        q: 'Quelles langues Icarus prend-il en charge ?',
        a: 'Anglais, espagnol, italien, français et allemand, chacun avec son correcteur orthographique. Icarus suit la langue de votre système, et vous pouvez la changer dans les Réglages.',
      },
    ],
    closingTitle: 'Écrivez le chapitre d’aujourd’hui',
  },

  download: {
    title: 'Télécharger Icarus pour Windows, macOS, Linux et Android',
    description:
      'Téléchargez gratuitement l’application de journal intime Icarus pour Windows, macOS, Linux et Android. Votre journal reste sur votre appareil, chiffré par votre mot de passe.',
    ogTitle: 'Télécharger Icarus',
    ogDescription: 'Une application de journal intime gratuite et privée pour Windows, macOS, Linux et Android.',
    heading: 'Télécharger Icarus',
    lede: 'Gratuit pour Windows, macOS, Linux et Android. Votre journal reste sur votre appareil, et nulle part ailleurs.',
    platforms: 'Plateformes',
    yourSystem: 'Votre système',
    firstLaunch: 'Premier lancement',
    windowsRequirements: 'Windows 10 et 11, 64 bits',
    windowsInstaller: 'Télécharger l’installeur',
    windowsMsi: 'Paquet MSI',
    windowsFirstLaunch:
      'L’installeur n’est pas encore signé, donc Windows peut afficher le message <q>Windows a protégé votre ordinateur</q>. Choisissez <span class="text-text">Informations complémentaires</span>, puis <span class="text-text">Exécuter quand même</span>.',
    macRequirements: 'macOS 11 ou plus récent, Apple silicon et Intel',
    macDownload: 'Télécharger l’image disque',
    macSteps: [
      'Ouvrez l’image disque et glissez Icarus dans <span class="text-text">Applications</span>.',
      'Ouvrez Icarus. macOS l’arrête, car l’application n’est pas encore notarisée par Apple.',
      'Allez dans <span class="text-text">Réglages Système → Confidentialité et sécurité</span>, faites défiler la page et choisissez <span class="text-text">Ouvrir quand même</span>.',
    ],
    linuxRequirements: '64 bits x86',
    linuxDownload: 'Télécharger l’AppImage',
    linuxFirstLaunch:
      'Rendez l’AppImage exécutable depuis ses propriétés, ou lancez <code class="rounded bg-slate px-1 py-0.5 font-mono text-xs text-text">chmod +x Icarus-Diary-*.AppImage</code>. Les paquets <span class="text-text">.deb</span> et <span class="text-text">.rpm</span> s’installent avec votre gestionnaire de paquets.',
    androidRequirements: 'Android 7 ou version ultérieure',
    androidDownload: 'Télécharger l’APK',
    androidSteps: [
      'Ouvrez le fichier téléchargé. Icarus n’est pas encore sur Google Play : Android vous demande d’autoriser votre navigateur à installer des applications.',
      'Si Play Protect signale une application inconnue, choisissez <span class="text-text">Plus de détails</span>, puis <span class="text-text">Installer quand même</span>.',
    ],
    updating: 'Mise à jour',
    androidUpdate:
      'Ouvrez le nouvel APK et touchez <span class="text-text">Mettre à jour</span>. Android remplace l’application sur place et conserve votre journal. Ne désinstallez pas d’abord l’ancienne version.',
    androidUninstall:
      'Votre journal est stocké en privé dans l’application : la désinstaller efface le journal. Exportez une sauvegarde depuis les Réglages avant de le faire.',
    verify: 'Vérifier votre téléchargement (SHA-256)',
    verifyText: 'Les versions ne sont pas encore signées. Comparez la somme de contrôle du fichier téléchargé avec cette liste.',
    noInstall: 'Vous préférez ne rien installer ?',
    openWebApp: 'Ouvrir l’application web',
  },

  notFound: {
    title: 'Page introuvable : Icarus',
    heading: 'Cette page n’existe pas',
    text: 'L’adresse est peut-être mal saisie, ou la page a été déplacée.',
    home: 'Aller à l’accueil',
    openWebApp: 'Ouvrir l’application web',
  },

  /** Structured data for search engines. */
  schema: {
    appDescription:
      'Une application de journal intime gratuite et libre. Les entrées sont chiffrées par votre mot de passe, stockées uniquement sur votre appareil dans un fichier de calendrier .ics standard, et consultables sans délai sur de nombreuses années.',
    features: [
      'Chiffrement par mot de passe des entrées et des brouillons',
      'Stockage local, sans compte ni serveur',
      'Entrées stockées au format standard iCalendar (.ics)',
      'Import et export de fichiers .ics',
      'Vue calendrier et recherche instantanée sur des années d’entrées',
      'Éditeur Markdown avec correcteur orthographique en cinq langues',
      'Application de bureau, application Android et application web',
    ],
  },

  /** Read by the page scripts. */
  client: {
    /** `{platform}` is Windows, macOS, Linux or Android. */
    downloadFor: 'Télécharger pour {platform}',
    iosNote: 'Sur iPhone et iPad, ouvrez l’application web et ajoutez-la à votre écran d’accueil pour l’utiliser comme n’importe quelle autre application.',
    /** `{date}` is a full date, like “November 23, 2026”. */
    release: 'Version {version}, publiée le {date}',
    /** `{size}` is a whole number of megabytes. */
    size: '{size} MB',
    noRelease: 'La première version arrive bientôt. D’ici là, vous pouvez écrire dans l’application web.',
    updateNewer: 'Icarus {latest} est disponible. Vous avez {installed}.',
    updateCurrent: 'Vous êtes à jour avec {installed}.',
    updateNothing: 'Rien de nouveau à installer. Icarus vous le redemandera dans un mois.',
    updatePick: 'Choisissez votre système ci-dessous et installez par-dessus votre version actuelle.',
    updateSteps: {
      android:
        'Téléchargez l’APK ci-dessous, ouvrez-le et touchez Mettre à jour. Android conserve votre journal. Ne désinstallez pas d’abord l’ancienne version : cela efface le journal.',
      windows: 'Lancez le nouvel installeur. Il remplace cette version, et votre journal reste à sa place.',
      macos: 'Ouvrez l’image disque et glissez Icarus dans Applications, en remplaçant l’ancienne version. Votre journal reste à sa place.',
      linux:
        'Installez le nouveau paquet par-dessus l’ancien, ou remplacez l’AppImage par la nouvelle et supprimez l’ancien fichier. Votre journal reste à sa place.',
    },
  },
} satisfies SiteMessages;
