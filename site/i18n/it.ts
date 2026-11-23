/** The public site in Italian. Mirrors `en.ts`; see the notes there. */
import type { SiteMessages } from '.';

export default {
  /** Open Graph locale of this language. */
  ogLocale: 'it_IT',

  nav: {
    skip: 'Skip to content',
    home: 'Icarus home',
    primary: 'Primary',
    download: 'Download',
    webApp: 'Web app',
    language: 'Language',
  },

  footer: {
    /** Keep the link markup as it is. */
    license:
      'Icarus is free software, licensed under the <a href="https://www.gnu.org/licenses/gpl-3.0.html" rel="noopener license" class="underline underline-offset-4 hover:text-text">GNU GPL v3</a>.',
    source: 'Source code',
  },

  home: {
    title: 'Icarus: private, encrypted diary app. Free and open source',
    description:
      'Icarus is a free, open-source diary app. Lock your entries with a password, keep them on your own device, and browse years of writing instantly. For desktop, Android and the web.',
    ogTitle: 'Icarus: a private diary for all your years',
    ogDescription:
      'A free, open-source diary app. Password-encrypted, stored on your device, and fast across decades of entries.',
    /** The line break is placed for large screens; move it to suit the language. */
    heroTitle: 'A private diary<br />for all your years',
    heroLede:
      'Icarus is a free, open-source diary app. Lock it with a password, keep every entry on your own device, and return to any day in an instant.',
    download: 'Download',
    openWebApp: 'Open the web app',
    platformNote: 'For Windows, macOS, Linux and Android, or right in your browser.',
    stageLabel: 'The Icarus calendar',
    calendarAlt: 'The Icarus calendar for October 2026, with an entry title on most days and today, the 24th, circled.',
    tourTitle: 'Everything a diary needs.<br />Nothing that gets in the way.',
    steps: [
      {
        title: 'Write the day down',
        text: 'A calm editor with Markdown, spell check and autosave. Unfinished entries wait for you in Drafts.',
        alt: 'The editor open on “Walking the old town”, with a bulleted list and a quote.',
      },
      {
        title: 'Come back to any day',
        text: 'Pick a day on the calendar and read it as you wrote it. Days with several entries let you page through them.',
        alt: 'Saturday, October 24, 2026 open beside the calendar, showing the first of two entries.',
      },
      {
        title: 'Find it, whatever the year',
        text: 'Search titles, places and text across every entry as you type, and jump straight to the day.',
        alt: 'Searching for “Ana” lists matching entries from 2019 to 2026 with the word highlighted.',
      },
      {
        title: 'See how far you’ve come',
        text: 'Entries, characters written and your fullest days, for the last month, the last year or all time.',
        alt: 'Statistics for all time: 1,046 entries, a chart of characters per year since 2019, and the top days.',
      },
      {
        title: 'Lock it when you step away',
        text: 'With a password, every entry and draft is encrypted, and the diary locks itself after a few idle minutes.',
        alt: 'The lock screen: “Diary locked” with a password field and an Unlock button.',
      },
    ],
    pocketTitle: 'In your pocket too',
    pocketText:
      'The Android app is the same diary, made for one hand. Swipe between days, write on the bus, and lock it with the same password.',
    phoneCalendarAlt: 'The calendar on an Android phone.',
    phoneReaderAlt: 'An entry open on an Android phone.',
    facts: [
      '<strong>No account.</strong> Nothing to sign up for and no server that ever sees your diary.',
      '<strong>Your own file.</strong> Entries live in a standard .ics calendar file. Import your old diary, export it whenever you like.',
      '<strong>Free and open source.</strong> GNU GPL v3. Anyone can read the code and check how a diary is handled.',
    ],
    faqTitle: 'Questions',
    faq: [
      {
        q: 'Is Icarus free?',
        a: 'Yes. Icarus is free and open source under the GNU GPL v3. There are no accounts, ads or subscriptions.',
      },
      {
        q: 'Where is my diary stored?',
        a: 'Only on your device. The desktop app saves it in a folder you choose, the Android app keeps it in its private storage, and the web app keeps it in your browser’s storage. Icarus has no servers that receive or store diaries.',
      },
      {
        q: 'What happens if I forget my password?',
        a: 'Use the recovery key you saved when you set your password. Without the password or the recovery key, no one can open the diary.',
      },
      {
        q: 'Can I bring the diary I already have?',
        a: 'Yes. Import any .ics file and each entry appears on its day. You can export your diary as .ics at any time.',
      },
      {
        q: 'Which languages does Icarus speak?',
        a: 'English, Spanish, Italian, French and German, with a spell checker for each. Icarus follows your system’s language, and you can change it in Settings.',
      },
    ],
    closingTitle: 'Write today’s chapter',
  },

  download: {
    title: 'Download Icarus for Windows, macOS, Linux and Android',
    description:
      'Download the free Icarus diary app for Windows, macOS, Linux and Android. Your diary stays on your device, encrypted with your password.',
    ogTitle: 'Download Icarus',
    ogDescription: 'A free, private diary app for Windows, macOS, Linux and Android.',
    heading: 'Download Icarus',
    lede: 'Free for Windows, macOS, Linux and Android. Your diary stays on your device, and nowhere else.',
    platforms: 'Platforms',
    yourSystem: 'Your system',
    firstLaunch: 'First launch',
    windowsRequirements: 'Windows 10 and 11, 64-bit',
    windowsInstaller: 'Download installer',
    windowsMsi: 'MSI package',
    windowsFirstLaunch:
      'The installer isn’t signed yet, so Windows may say it <q>protected your PC</q>. Choose <span class="text-text">More info</span>, then <span class="text-text">Run anyway</span>.',
    macRequirements: 'macOS 11 or later, Apple silicon and Intel',
    macDownload: 'Download disk image',
    macSteps: [
      'Open the disk image and drag Icarus to <span class="text-text">Applications</span>.',
      'Open Icarus. macOS stops it because the app isn’t notarized by Apple yet.',
      'Go to <span class="text-text">System Settings → Privacy &amp; Security</span>, scroll down and choose <span class="text-text">Open Anyway</span>.',
    ],
    linuxRequirements: '64-bit x86',
    linuxDownload: 'Download AppImage',
    linuxFirstLaunch:
      'Make the AppImage executable from its file properties, or run <code class="rounded bg-slate px-1 py-0.5 font-mono text-xs text-text">chmod +x Icarus-Diary-*.AppImage</code>. The <span class="text-text">.deb</span> and <span class="text-text">.rpm</span> packages install through your package manager.',
    androidRequirements: 'Android 7 or later',
    androidDownload: 'Download APK',
    androidSteps: [
      'Open the downloaded file. Icarus isn’t on Google Play yet, so Android asks you to allow your browser to install apps.',
      'If Play Protect warns about an unknown app, choose <span class="text-text">More details</span>, then <span class="text-text">Install anyway</span>.',
    ],
    updating: 'Updating',
    androidUpdate:
      'Open the new APK and tap <span class="text-text">Update</span>. Android replaces the app in place and keeps your diary. Don’t uninstall the old version first.',
    androidUninstall:
      'Your diary is stored privately inside the app, so uninstalling it erases the diary. Export a backup from Settings before you do.',
    verify: 'Verify your download (SHA-256)',
    verifyText: 'The builds aren’t signed yet. Compare the checksum of the file you downloaded with this list.',
    noInstall: 'Prefer not to install anything?',
    openWebApp: 'Open the web app',
  },

  notFound: {
    title: 'Page not found: Icarus',
    heading: 'This page doesn’t exist',
    text: 'The address may be mistyped, or the page has moved.',
    home: 'Go to the home page',
    openWebApp: 'Open the web app',
  },

  /** Structured data for search engines. */
  schema: {
    appDescription:
      'A free, open-source diary app. Entries are encrypted with your password, stored only on your device in a standard .ics calendar file, and browsable across many years without delay.',
    features: [
      'Password encryption of diary entries and drafts',
      'Local-first storage with no account or server',
      'Entries stored in the standard iCalendar (.ics) format',
      'Import and export of .ics files',
      'Calendar view and instant search across years of entries',
      'Markdown editor with spell check in five languages',
      'Desktop app, Android app and web app',
    ],
  },

  /** Read by the page scripts. */
  client: {
    /** `{platform}` is Windows, macOS, Linux or Android. */
    downloadFor: 'Download for {platform}',
    iosNote: 'On iPhone and iPad, open the web app and add it to your Home Screen to use it like any other app.',
    /** `{date}` is a full date, like “November 23, 2026”. */
    release: 'Version {version}, released {date}',
    /** `{size}` is a whole number of megabytes. */
    size: '{size} MB',
    noRelease: 'The first release is on its way. Until then, you can write in the web app.',
    updateNewer: 'Icarus {latest} is out. You have {installed}.',
    updateCurrent: 'You’re up to date with {installed}.',
    updateNothing: 'There’s nothing new to install. Icarus will ask again in a month.',
    updatePick: 'Pick your system below and install over your current version.',
    updateSteps: {
      android:
        'Download the APK below, open it and tap Update. Android keeps your diary. Don’t uninstall the old version first: that erases the diary.',
      windows: 'Run the new installer. It replaces this version, and your diary stays where it was.',
      macos: 'Open the disk image and drag Icarus to Applications, replacing the old one. Your diary stays where it was.',
      linux:
        'Install the new package over the old one, or swap in the new AppImage and delete the old file. Your diary stays where it was.',
    },
  },
} satisfies SiteMessages;
