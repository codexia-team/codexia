use std::sync::Arc;

use serde_json::Value;
use tauri::{AppHandle, Manager};
use tokio::sync::broadcast;

use codexia_cc::CCState;
use codexia_codex::AppState;

/// Loopback port the desktop app's own webview talks to.
///
/// Distinct from `remote::REMOTE_PORT`: that one binds the tailnet address and
/// only when the user turns remote access on, this one is always up on
/// `127.0.0.1` so the frontend can call the same HTTP handlers the web build
/// uses instead of a parallel `#[tauri::command]` per endpoint.
pub const LOCAL_PORT: u16 = 7419;

/// Starts the loopback API server for the app's own lifetime.
///
/// Shares the same codex/cc/acp/automation state the desktop already manages
/// — this is not a second set of sessions, just another way to reach the same
/// ones. Runs until the process exits, so a never-resolving shutdown future is
/// correct here (unlike `remote::start_server`, nothing ever stops it).
pub fn start_local_server(app: &AppHandle, event_tx: broadcast::Sender<(String, Value)>) {
    let codex = app
        .try_state::<AppState>()
        .map(|s| Arc::new(AppState { codex: s.codex.clone() }));
    let cc = match app.try_state::<CCState>() {
        Some(s) => Arc::new(s.inner().clone()),
        None => {
            log::warn!("[local-server] CCState not initialized; skipping local server startup");
            return;
        }
    };
    let acp = match app.try_state::<codexia_acp::AcpState>() {
        Some(s) => Arc::new(s.inner().clone()),
        None => {
            log::warn!("[local-server] ACP state not initialized; skipping local server startup");
            return;
        }
    };
    let automation = app
        .try_state::<codexia_automation::AutomationHandle>()
        .map(|s| s.inner().clone());

    tauri::async_runtime::spawn(async move {
        let result = codexia_web::serve_api(
            codex,
            automation,
            cc,
            acp,
            event_tx,
            "127.0.0.1",
            LOCAL_PORT,
            std::future::pending(),
        )
        .await;

        if let Err(err) = result {
            log::error!("[local-server] {err}");
        }
    });
}
