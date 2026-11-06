# Data and privacy

## Where your diary lives

- **Desktop:** a folder you choose, holding `diary.ics` (or `diary.icarus`
  when encrypted), `drafts.json`, and `settings.json`. It can be on removable
  media. The only thing stored on the computer is the folder's path, and you
  can turn that off in Settings.
- **Android:** the app's private storage. No other app can read it, cloud
  backup is disabled, and release builds have no internet permission.
  Uninstalling the app erases the diary, so export a backup first.
- **Browser:** IndexedDB in your browser profile.

Importing an `.ics` copies it into a new folder and never touches the
original. Exports never overwrite an existing file.

## Password protection

Everything private (diary, drafts, spell-check dictionary) is encrypted with
AES-256-GCM under a random master key. That key is wrapped twice: by your
password (Argon2id, 64 MiB, 3 passes) and by a recovery key shown once at
setup. Lose both and the diary is gone.

The diary locks after a period of inactivity, and optionally when the window
is hidden.

Encryption protects data at rest: a stolen disk, a synced folder, a copied
browser profile. It doesn't protect an unlocked diary from malware on the same
machine, and it doesn't touch old unencrypted backups you made earlier.

In the browser, protection needs HTTPS or `localhost`.

## Updates

The apps never phone home unless you ask. Desktop can check for updates
automatically (off by default). Otherwise, once a build is 30 days old, the
app asks once a month whether you want to check.
