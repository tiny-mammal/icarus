//! The app's private data directory, which owns the diary, drafts and settings.
//!
//! Every write goes through `write_diary_file`: the new contents are flushed
//! to disk under a temporary name and then renamed over the old file, so a
//! crash or power cut leaves either the old or the new file, never a torn one.
//! Before the first change of each day, the diary's previous version is kept
//! in `backups/` (the last `DAILY_COPIES` days), so a bad save or an
//! accidental import can always be undone by hand.
//!
//! On Linux the XDG directories are redirected into tmpfs at startup (see
//! `lib.rs`), so the real data directory must be resolved before that, or the
//! diary would vanish on exit. `locate` does that; `resolve` refuses any
//! directory in volatile storage as a last line of defence.

use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager, Runtime, State};
use tauri_plugin_fs::FsExt;

const BACKUP_DIR: &str = "backups";
const DAILY_COPIES: usize = 7;

pub struct DiaryDir {
    /// Resolved at startup on desktop; mobile asks Tauri when first needed.
    desktop: Option<PathBuf>,
}

impl DiaryDir {
    /// Must run before `lib.rs` redirects the XDG directories on Linux.
    pub fn locate(identifier: &str) -> Self {
        #[cfg(desktop)]
        let desktop = dirs::data_dir().map(|dir| dir.join(identifier));
        #[cfg(mobile)]
        let desktop = {
            let _ = identifier;
            None
        };
        Self { desktop }
    }

    /// The directory, created if needed and readable by the webview.
    fn resolve<R: Runtime>(&self, app: &AppHandle<R>) -> Result<PathBuf, String> {
        let dir = match &self.desktop {
            Some(dir) => dir.clone(),
            None => app.path().app_data_dir().map_err(|error| error.to_string())?,
        };
        if !dir.is_absolute() || is_volatile(&dir) {
            return Err(format!("Refusing to keep the diary in {}", dir.display()));
        }
        create_private_dir(&dir)?;
        app.fs_scope()
            .allow_directory(&dir, true)
            .map_err(|error| error.to_string())?;
        Ok(dir)
    }
}

/// Storage that is wiped on reboot or exit, where a diary must never live.
fn is_volatile(dir: &Path) -> bool {
    dir.starts_with("/dev/shm") || dir.starts_with("/run") || dir.starts_with(std::env::temp_dir())
}

fn create_private_dir(dir: &Path) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(dir, fs::Permissions::from_mode(0o700))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

/// A bare file name, so the webview cannot reach outside the directory.
fn file_in(dir: &Path, name: &str) -> Result<PathBuf, String> {
    let valid = !name.is_empty()
        && !name.starts_with('.')
        && !name.ends_with(".tmp")
        && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_');
    if !valid {
        return Err(format!("Invalid diary file name: {name}"));
    }
    Ok(dir.join(name))
}

/// Make a rename or removal in `dir` durable.
fn sync_dir(dir: &Path) -> std::io::Result<()> {
    #[cfg(unix)]
    File::open(dir)?.sync_all()?;
    #[cfg(not(unix))]
    let _ = dir;
    Ok(())
}

/// Write `contents` to `path` in full, or leave the old file untouched.
fn write_atomic(path: &Path, contents: &[u8]) -> std::io::Result<()> {
    let dir = path.parent().ok_or_else(|| std::io::Error::other("no parent directory"))?;
    let mut tmp_name = path.file_name().unwrap_or_default().to_os_string();
    tmp_name.push(".tmp");
    let tmp = dir.join(tmp_name);
    let result = (|| {
        let mut file = File::create(&tmp)?;
        file.write_all(contents)?;
        file.sync_all()?;
        drop(file);
        fs::rename(&tmp, path)?;
        sync_dir(dir)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result
}

/// `diary.vault` → (`diary-`, `.vault`): the prefix and suffix of its copies.
fn copy_affixes(name: &str) -> (String, String) {
    match name.rsplit_once('.') {
        Some((stem, ext)) => (format!("{stem}-"), format!(".{ext}")),
        None => (format!("{name}-"), String::new()),
    }
}

/// Keep `path`'s current contents as today's copy, unless today already has
/// one, and drop copies beyond the newest `DAILY_COPIES`.
fn keep_daily_copy(dir: &Path, name: &str, today: &str) -> std::io::Result<()> {
    let current = dir.join(name);
    if !current.exists() {
        return Ok(());
    }
    let backups = dir.join(BACKUP_DIR);
    fs::create_dir_all(&backups)?;
    let (prefix, suffix) = copy_affixes(name);
    let copy = backups.join(format!("{prefix}{today}{suffix}"));
    if !copy.exists() {
        write_atomic(&copy, &fs::read(&current)?)?;
    }
    let mut copies: Vec<PathBuf> = fs::read_dir(&backups)?
        .filter_map(|entry| entry.ok().map(|entry| entry.path()))
        .filter(|path| {
            let file = path.file_name().and_then(|f| f.to_str()).unwrap_or_default();
            file.starts_with(&prefix) && file.ends_with(&suffix) && !file.ends_with(".tmp")
        })
        .collect();
    // ISO dates sort chronologically, newest last.
    copies.sort();
    let excess = copies.len().saturating_sub(DAILY_COPIES);
    for old in &copies[..excess] {
        fs::remove_file(old)?;
    }
    Ok(())
}

fn remove_daily_copies(dir: &Path, name: &str) -> std::io::Result<()> {
    let backups = dir.join(BACKUP_DIR);
    if !backups.is_dir() {
        return Ok(());
    }
    let (prefix, suffix) = copy_affixes(name);
    for entry in fs::read_dir(&backups)? {
        let path = entry?.path();
        let file = path.file_name().and_then(|f| f.to_str()).unwrap_or_default();
        if file.starts_with(&prefix) && file.ends_with(&suffix) {
            fs::remove_file(&path)?;
        }
    }
    sync_dir(&backups)
}

/// Today's UTC date as `YYYY-MM-DD`.
fn utc_today() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    date_from_days((secs / 86_400) as i64)
}

/// Days since 1970-01-01 as `YYYY-MM-DD` (Howard Hinnant's civil-from-days).
fn date_from_days(days: i64) -> String {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    format!("{year:04}-{month:02}-{day:02}")
}

/// The data directory's path, so the webview can read files in it.
#[tauri::command]
pub fn diary_dir<R: Runtime>(app: AppHandle<R>, state: State<'_, DiaryDir>) -> Result<PathBuf, String> {
    state.resolve(&app)
}

/// Replace `name` with `contents` atomically and durably. With `daily_copy`,
/// the previous version is kept first (see the module comment).
#[tauri::command]
pub fn write_diary_file<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, DiaryDir>,
    name: String,
    contents: String,
    daily_copy: bool,
) -> Result<(), String> {
    let dir = state.resolve(&app)?;
    let path = file_in(&dir, &name)?;
    if daily_copy {
        // A missing copy must never stop the diary itself from being saved.
        if let Err(error) = keep_daily_copy(&dir, &name, &utc_today()) {
            eprintln!("Could not keep a daily copy of {name}: {error}");
        }
    }
    write_atomic(&path, contents.as_bytes()).map_err(|error| error.to_string())
}

/// Delete `name` and, with `with_copies`, its daily copies.
#[tauri::command]
pub fn remove_diary_file<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, DiaryDir>,
    name: String,
    with_copies: bool,
) -> Result<(), String> {
    let dir = state.resolve(&app)?;
    let path = file_in(&dir, &name)?;
    if with_copies {
        remove_daily_copies(&dir, &name).map_err(|error| error.to_string())?;
    }
    match fs::remove_file(&path) {
        Err(error) if error.kind() != std::io::ErrorKind::NotFound => Err(error.to_string()),
        _ => sync_dir(&dir).map_err(|error| error.to_string()),
    }
}

/// Delete the daily copies of `name`, e.g. plain-text copies once the diary
/// is encrypted, so no older readable version stays behind.
#[tauri::command]
pub fn remove_diary_copies<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, DiaryDir>,
    name: String,
) -> Result<(), String> {
    let dir = state.resolve(&app)?;
    file_in(&dir, &name)?;
    remove_daily_copies(&dir, &name).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(label: &str) -> PathBuf {
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let dir = std::env::temp_dir().join(format!("icarus-test-{label}-{}-{nanos}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn copies(dir: &Path) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(dir.join(BACKUP_DIR))
            .map(|entries| {
                entries
                    .map(|e| e.unwrap().file_name().into_string().unwrap())
                    .collect()
            })
            .unwrap_or_default();
        names.sort();
        names
    }

    #[test]
    fn atomic_write_replaces_and_leaves_no_temp_file() {
        let dir = temp_dir("atomic");
        let path = dir.join("diary.vault");
        write_atomic(&path, b"one").unwrap();
        write_atomic(&path, b"two").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "two");
        assert!(!dir.join("diary.vault.tmp").exists());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn keeps_the_first_version_of_each_day() {
        let dir = temp_dir("daily");
        let path = dir.join("diary.vault");
        keep_daily_copy(&dir, "diary.vault", "2026-01-01").unwrap();
        assert!(copies(&dir).is_empty(), "nothing to copy before the first save");

        write_atomic(&path, b"morning").unwrap();
        keep_daily_copy(&dir, "diary.vault", "2026-01-01").unwrap();
        write_atomic(&path, b"noon").unwrap();
        keep_daily_copy(&dir, "diary.vault", "2026-01-01").unwrap();
        write_atomic(&path, b"evening").unwrap();

        let copy = dir.join(BACKUP_DIR).join("diary-2026-01-01.vault");
        assert_eq!(fs::read_to_string(copy).unwrap(), "morning");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn prunes_to_the_newest_copies() {
        let dir = temp_dir("prune");
        fs::write(dir.join("diary.vault"), "x").unwrap();
        fs::create_dir_all(dir.join(BACKUP_DIR)).unwrap();
        fs::write(dir.join(BACKUP_DIR).join("other-2020-01-01.json"), "keep").unwrap();
        for day in 1..=10 {
            keep_daily_copy(&dir, "diary.vault", &format!("2026-01-{day:02}")).unwrap();
        }
        let kept = copies(&dir);
        assert_eq!(kept.len(), DAILY_COPIES + 1);
        assert_eq!(kept[0], "diary-2026-01-04.vault");
        assert!(kept.contains(&"other-2020-01-01.json".to_string()));

        remove_daily_copies(&dir, "diary.vault").unwrap();
        assert_eq!(copies(&dir), vec!["other-2020-01-01.json".to_string()]);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn rejects_names_outside_the_directory() {
        let dir = PathBuf::from("/data");
        for name in ["", "../x", "a/b", "a\\b", ".hidden", "diary.vault.tmp", ".."] {
            assert!(file_in(&dir, name).is_err(), "{name}");
        }
        assert_eq!(file_in(&dir, "drafts.json").unwrap(), dir.join("drafts.json"));
    }

    #[test]
    fn never_uses_volatile_storage() {
        assert!(is_volatile(Path::new("/dev/shm/icarus-diary-1/data/com.icarus.diary")));
        assert!(is_volatile(&std::env::temp_dir().join("x")));
        assert!(!is_volatile(Path::new("/home/oli/.local/share/com.icarus.diary")));
    }

    #[test]
    fn formats_dates() {
        assert_eq!(date_from_days(0), "1970-01-01");
        assert_eq!(date_from_days(11_016), "2000-02-29");
        assert_eq!(date_from_days(20_763), "2026-11-06");
        assert_eq!(utc_today().len(), 10);
    }
}
