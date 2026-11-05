//! Icarus Diary — Tauri shell.
//!
//! All diarying logic lives in the TypeScript frontend; the Rust side only
//! registers the official plugins the app relies on (filesystem, native
//! dialogs and the system-opener used to launch
//! external links from diary entries in the user's default browser). The app
//! is fully local-first: the only network request is the opt-in update check
//! in `updates.rs`, which is off unless the user turns it on. The only file it
//! keeps outside the diary folder is that folder's path (`remembered.rs`).

mod remembered;
mod updates;

#[cfg(target_os = "linux")]
fn private_runtime_dirs() -> std::io::Result<std::path::PathBuf> {
    use std::os::unix::fs::DirBuilderExt;
    use std::time::{SystemTime, UNIX_EPOCH};

    // WebKitGTK and GTK can create cache files and recent-file history even
    // with an incognito webview. Keep their process-local XDG data in tmpfs.
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(std::io::Error::other)?
        .as_nanos();
    let root = std::path::PathBuf::from("/dev/shm")
        .join(format!("icarus-diary-{}-{nonce}", std::process::id()));
    std::fs::DirBuilder::new().mode(0o700).create(&root)?;
    for (name, env_var) in [
        ("data", "XDG_DATA_HOME"),
        ("cache", "XDG_CACHE_HOME"),
        ("config", "XDG_CONFIG_HOME"),
        ("state", "XDG_STATE_HOME"),
    ] {
        let path = root.join(name);
        std::fs::create_dir(&path)?;
        std::env::set_var(env_var, path);
    }
    Ok(root)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let context = tauri::generate_context!();
    // Resolved before Linux moves the XDG directories into tmpfs below.
    let remembered = remembered::RememberedFolder::locate(&context.config().identifier);

    #[cfg(target_os = "linux")]
    let runtime_dir = private_runtime_dirs().expect("Icarus needs /dev/shm for private GTK data");

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(remembered)
        .invoke_handler(tauri::generate_handler![
            updates::latest_release,
            remembered::remembered_folder,
            remembered::set_remembered_folder,
        ])
        .setup(|_app| {
            #[cfg(target_os = "linux")]
            if let Some(settings) = gtk::Settings::default() {
                use gtk::prelude::*;
                // GTK's native file picker otherwise records the chosen diary
                // path in the host's recently-used.xbel history.
                settings.set_property("gtk-recent-files-enabled", false);
            }
            Ok(())
        })
        .build(context)
        .expect("error while running Icarus Diary");
    app.run(move |_, event| {
        #[cfg(target_os = "linux")]
        if let tauri::RunEvent::Exit = event {
            if let Err(error) = std::fs::remove_dir_all(&runtime_dir) {
                eprintln!("Could not remove private runtime data: {error}");
            }
        }
        #[cfg(not(target_os = "linux"))]
        let _ = event;
    });
}
