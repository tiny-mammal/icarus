//! The opt-in update check: the app's only network request.
//!
//! It runs here rather than in the webview so the webview's CSP keeps every
//! outside origin blocked: the code that holds the diary never gets a way to
//! reach the network. The request is a plain GET of one fixed URL, with no
//! cookies, identifiers or query string, and the site keeps no logs.

use serde::{Deserialize, Serialize};

/// The release manifest written by `.github/workflows/release.yml`.
#[cfg(desktop)]
const MANIFEST_URL: &str = "https://icarus.4oli.com/download/latest.json";

/// The fields of `latest.json` the app needs (the asset list is ignored).
#[derive(Debug, Serialize, Deserialize)]
pub struct LatestRelease {
    version: String,
    published: String,
}

#[cfg(desktop)]
fn fetch_latest() -> Result<LatestRelease, String> {
    use std::time::Duration;

    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(15)))
        .https_only(true)
        .user_agent("Icarus Diary")
        .build()
        .into();
    agent
        .get(MANIFEST_URL)
        .call()
        .map_err(|error| error.to_string())?
        .body_mut()
        .with_config()
        // The manifest is a few kilobytes; refuse anything far larger.
        .limit(256 * 1024)
        .read_json::<LatestRelease>()
        .map_err(|error| error.to_string())
}

/// The version currently published on the download page.
#[tauri::command]
pub async fn latest_release() -> Result<LatestRelease, String> {
    #[cfg(desktop)]
    {
        tauri::async_runtime::spawn_blocking(fetch_latest)
            .await
            .map_err(|error| error.to_string())?
    }
    #[cfg(mobile)]
    {
        Err("Update checks are only available on desktop.".into())
    }
}
