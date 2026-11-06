# Data and privacy

## Where your diary lives

- **Desktop:** the app's data directory, readable only by your user:

  | OS      | Directory                                          |
  | ------- | -------------------------------------------------- |
  | Linux   | `~/.local/share/com.icarus.diary` (`$XDG_DATA_HOME`) |
  | macOS   | `~/Library/Application Support/com.icarus.diary`   |
  | Windows | `%APPDATA%\com.icarus.diary`                        |

- **Android:** the app's private storage, laid out the same way. No other app
  can read it, cloud backup is disabled, and release builds have no internet
  permission. Uninstalling the app erases the diary, so export a backup first.
- **Browser:** IndexedDB in your browser profile.

On desktop and Android, `diary.vault` holds the `.ics` text (or the encrypted
diary) beside `drafts.json` and `settings.json`.

## Keeping it safe

- **Atomic saves.** Every save writes a temporary file, flushes it to disk and
  renames it over the old one (`src-tauri/src/diary_dir.rs`), so a crash or
  power cut leaves the old or the new diary, never a torn one.
- **Daily copies.** Before the first save of each day, the previous version is
  kept in `backups/diary-YYYY-MM-DD.vault`, for the last 7 days. To restore
  one, rename it to `.ics` (or `.icarus` if encrypted) and import it.
- **No volatile storage.** On Linux, GTK and WebKit data is redirected into
  `/dev/shm`. The data directory is resolved before that, and the app refuses
  to keep the diary in volatile storage.
- **No silent replacement.** Importing a diary or starting a new one asks
  first when a diary is already saved. Importing never touches the original
  file, and exports never overwrite an existing file.
- **Delete diary** erases the diary, its drafts and its daily copies.

## Password protection

Everything private (diary, drafts, spell-check dictionary) is encrypted with
AES-256-GCM under a random master key. That key is wrapped twice: by your
password (Argon2id, 64 MiB, 3 passes) and by a recovery key shown once at
setup. Lose both and the diary is gone.

The diary locks after a period of inactivity, and optionally when the window
is hidden.

Turning encryption on, or changing the password or recovery key, erases the
daily copies, so none stays readable without the current password. If that
fails, the app says so and retries on every unlock and save until it succeeds.

Encryption protects data at rest: a stolen disk or a copied browser profile. It doesn't protect an unlocked diary from malware on the same
machine, and it doesn't touch old unencrypted backups you made earlier.

In the browser, protection needs HTTPS or `localhost`.

## Updates

The apps never phone home unless you ask. Desktop can check for updates
automatically (off by default). Otherwise, once a build is 30 days old, the
app asks once a month whether you want to check.
