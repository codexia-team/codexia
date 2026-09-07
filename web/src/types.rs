use std::sync::Arc;

use axum::{
    extract::FromRef,
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use serde_json::Value;
use tokio::sync::broadcast;

use codexia_acp::AcpState;
use codexia_automation::AutomationHandle;
use codexia_cc::CCState;
use codexia_codex::AppState;
use codexia_shared::sleep::SleepState;
use crate::auth::DeviceToken;
use crate::events::EventHub;
use crate::watcher::WebWatchState;
use crate::terminal::WebTerminalState;

#[derive(Clone)]
pub struct WebServerState {
    pub codex_state: Option<Arc<AppState>>,
    /// Absent when the automation scheduler failed to start.
    pub automation: Option<AutomationHandle>,
    pub cc_state: Arc<CCState>,
    pub acp_state: Arc<AcpState>,
    pub(crate) sleep_state: Arc<SleepState>,
    pub(crate) terminal_state: Arc<WebTerminalState>,
    pub(crate) fs_watch_state: Arc<WebWatchState>,
    pub event_tx: broadcast::Sender<(String, Value)>,
    /// Sequenced view of `event_tx`, used by the WebSocket/SSE endpoints so
    /// clients can resume after a dropped connection.
    pub event_hub: EventHub,
    /// Secret remote clients must present. Local requests are exempt.
    pub device_token: DeviceToken,
    /// Port the server is listening on, surfaced to clients for pairing.
    pub port: u16,
}

impl WebServerState {
    pub fn new(
        codex_state: Option<Arc<AppState>>,
        automation: Option<AutomationHandle>,
        cc_state: Arc<CCState>,
        acp_state: Arc<AcpState>,
        sleep_state: Arc<SleepState>,
        terminal_state: Arc<WebTerminalState>,
        fs_watch_state: Arc<WebWatchState>,
        event_tx: broadcast::Sender<(String, Value)>,
        device_token: DeviceToken,
        port: u16,
    ) -> Self {
        let event_hub = EventHub::spawn_from(&event_tx);
        Self {
            codex_state,
            automation,
            cc_state,
            acp_state,
            sleep_state,
            terminal_state,
            fs_watch_state,
            event_tx,
            event_hub,
            device_token,
            port,
        }
    }
}

impl FromRef<WebServerState> for DeviceToken {
    fn from_ref(state: &WebServerState) -> Self {
        state.device_token.clone()
    }
}

impl FromRef<WebServerState> for broadcast::Sender<(String, Value)> {
    fn from_ref(state: &WebServerState) -> Self {
        state.event_tx.clone()
    }
}

impl FromRef<WebServerState> for EventHub {
    fn from_ref(state: &WebServerState) -> Self {
        state.event_hub.clone()
    }
}

#[derive(Serialize)]
pub(super) struct ErrorResponse {
    pub(super) error: String,
}

impl IntoResponse for ErrorResponse {
    fn into_response(self) -> Response {
        // Every API 500 goes through here, so this is the one place that can
        // log the reason — without it, a failing handler is invisible in the
        // log file, only visible as a bare "Internal Server Error" in the
        // browser console.
        log::error!("[api] 500: {}", self.error);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(self)).into_response()
    }
}
