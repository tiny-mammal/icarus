//! The desktop app's only host-side record: the folder to reopen on launch.
//!
//! Everything else (the diary, drafts and settings) lives in the folder the
//! user chose. The record holds just that folder's path, and the user can turn
//! it off in Settings, which deletes it. Access to the folder is granted again
//! on launch, because filesystem access is otherwise limited to paths picked
//! in a dialog during the current session.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime, State};
use tauri_plugin_fs::FsExt;

const RECORD_FILE: &str = "remembered-folder.json";

/// Where the record lives, if the platform has a config directory.
pub struct RememberedFolder {
    file: Option<PathBuf>,
}

impl RememberedFolder {
    /// Resolve the record's path. On Linux this must run before the GTK data
    /// directories are redirected into tmpfs, or the record would not survive
    /// a restart.
    pub fn locate(identifier: &str) -> Self {
        Self {
            file: dirs::config_dir().map(|dir| dir.join(identifier).join(RECORD_FILE)),
        }
    }
}

#[derive(Serialize, Deserialize)]
struct Record {
    folder: PathBuf,
}

/// The remembered folder, with access to it granted again, or `None` when
/// nothing is remembered or the folder is gone (e.g. an unplugged drive).
#[tauri::command]
pub fn remembered_folder<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, RememberedFolder>,
) -> Result<Option<PathBuf>, String> {
    let Some(file) = &state.file else { return Ok(None) };
    let Ok(text) = std::fs::read_to_string(file) else { return Ok(None) };
    let Ok(record) = serde_json::from_str::<Record>(&text) else { return Ok(None) };
    if !record.folder.is_absolute() || !record.folder.is_dir() {
        return Ok(None);
    }
    app.fs_scope()
        .allow_directory(&record.folder, true)
        .map_err(|error| error.to_string())?;
    Ok(Some(record.folder))
}

/// Remember `folder` for the next launch, or forget it with `None`.
#[tauri::command]
pub fn set_remembered_folder<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, RememberedFolder>,
    folder: Option<PathBuf>,
) -> Result<(), String> {
    let Some(file) = &state.file else { return Ok(()) };
    let Some(folder) = folder else {
        return match std::fs::remove_file(file) {
            Err(error) if error.kind() != std::io::ErrorKind::NotFound => Err(error.to_string()),
            _ => Ok(()),
        };
    };
    // Only a folder the user already opened may be remembered, so the webview
    // cannot use this record to reach any other path on the next launch.
    if !folder.is_absolute() || !app.fs_scope().is_allowed(&folder) {
        return Err("Only the open diary folder can be remembered".into());
    }
    let dir = file.parent().ok_or("The config directory is missing")?;
    std::fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    let text = serde_json::to_string(&Record { folder }).map_err(|error| error.to_string())?;
    let partial = file.with_extension("json.tmp");
    std::fs::write(&partial, text).map_err(|error| error.to_string())?;
    std::fs::rename(&partial, file).map_err(|error| error.to_string())
}
