use std::sync::Arc;
use std::sync::atomic::Ordering;
use std::time::Instant;

use serde_json::Value;
use tokio::sync::broadcast;

use super::{router::create_router, types::WebServerState};
use crate::auth::DeviceToken;
use codexia_cc::CCState;
use codexia_codex::{AppState, CodexInitializationState, connect_codex, initialize_codex};
use codexia_shared::event_sink::EventSink;
use crate::event_sink::WebSocketEventSink;
use codexia_shared::sleep::SleepState;
use crate::watcher::WebWatchState;

pub async fn start_web_server_with_events(
    codex_state: Option<Arc<AppState>>,
    cc_state: Arc<CCState>,
    event_tx: broadcast::Sender<(String, Value)>,
    host: &str,
    port: u16,
    ready: Option<std::sync::mpsc::Sender<()>>,
) -> Result<(), Box<dyn std::error::Error>> {
    if let Ok(cwd) = std::env::current_dir() {
        log::info!("[web] startup cwd: {}", cwd.display());
    } else {
        log::info!("[web] startup cwd: <unavailable>");
    }
    log::info!("[web] requested port: {}", port);

    let automation_sink: Arc<dyn EventSink> = Arc::new(WebSocketEventSink::new(event_tx.clone()));
    let automation = codexia_automation::AutomationHandle::start(
        vec![
            Arc::new(codexia_codex::CodexAgentRunner::new(
                codex_state.as_ref().map(|s| s.codex.clone()),
            )),
            Arc::new(codexia_cc::CcAgentRunner::new(cc_state.as_ref().clone())),
        ],
        automation_sink,
    )
    .await
    .map_err(|err| std::io::Error::new(std::io::ErrorKind::Other, err))?;

    codexia_cc::scan::start_session_scanner();

    let device_token = DeviceToken::load_or_create()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

    let state = WebServerState::new(
        codex_state,
        Some(automation),
        cc_state,
        Arc::new(codexia_acp::AcpState::new(Arc::new(WebSocketEventSink::new(
            event_tx.clone(),
        )))),
        Arc::new(SleepState::default()),
        Arc::new(super::terminal::WebTerminalState::default()),
        Arc::new(WebWatchState::default()),
        event_tx,
        device_token,
        port,
    );

    let app = create_router(state);
    let listener = tokio::net::TcpListener::bind(format!("{}:{}", host, port)).await?;

    log::info!("Web server listening on http://{}:{}", host, port);
    log_remote_access(host, port);

    // Only signal readiness once the listener is actually bound, so callers
    // that open a browser don't race the (potentially slow) codex/cc startup
    // above and hit a connection-refused before the port is listening.
    if let Some(ready) = ready {
        let _ = ready.send(());
    }

    // ConnectInfo carries the peer address the auth layer needs to decide
    // whether a request is local and may skip the device token.
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .await?;

    Ok(())
}

pub async fn start_web_server(
    host: &str,
    port: u16,
    ready: Option<std::sync::mpsc::Sender<()>>,
) -> Result<(), Box<dyn std::error::Error>> {
    let boot_started_at = Instant::now();
    // Sized above the hub's replay buffer so the sequencing task never lags
    // behind the emitters — anything dropped here is lost before it gets a seq.
    let (event_tx, _) = broadcast::channel(4096);
    let event_sink: Arc<dyn EventSink> = Arc::new(WebSocketEventSink::new(event_tx.clone()));
    let init_state = CodexInitializationState::new(Arc::clone(&event_sink));

    let connect_started_at = Instant::now();
    let codex_state = match connect_codex(Arc::clone(&event_sink)).await {
        Ok(codex) => {
            log::info!(
                "[web] startup timing: connect_codex finished in {:?}",
                connect_started_at.elapsed()
            );

            if !init_state.initialized.load(Ordering::SeqCst) {
                let _guard = init_state.init_lock.lock().await;
                if !init_state.initialized.load(Ordering::SeqCst) {
                    let initialize_started_at = Instant::now();
                    if let Err(e) =
                        initialize_codex(&codex, Arc::clone(&init_state.event_sink)).await
                    {
                        log::warn!("[web] codex initialize failed, continuing without codex: {e}");
                    } else {
                        log::info!(
                            "[web] startup timing: initialize_codex finished in {:?}",
                            initialize_started_at.elapsed()
                        );
                        init_state.initialized.store(true, Ordering::SeqCst);
                    }
                }
            }

            Some(Arc::new(AppState { codex }))
        }
        Err(e) => {
            log::warn!(
                "[web] codex binary not found or failed to start ({}), continuing without codex backend",
                e
            );
            None
        }
    };

    let cc_state = Arc::new(CCState::new(Arc::new(WebSocketEventSink::new(event_tx.clone()))));
    log::info!("[web] boot completed in {:?}", boot_started_at.elapsed());
    start_web_server_with_events(codex_state, cc_state, event_tx, host, port, ready).await
}

/// Logs how to reach this server from another device, so the tailnet hostname
/// and pairing hint are visible without opening the UI.
fn log_remote_access(host: &str, port: u16) {
    match crate::tailscale::detect() {
        Some(info) if host != "127.0.0.1" => {
            log::info!(
                "[remote] reachable on the tailnet at http://{}:{} ({})",
                info.dns_name,
                port,
                info.ipv4
            );
            log::info!("[remote] pair a device with the token from GET /api/pairing");
        }
        Some(info) => {
            log::info!(
                "[remote] Tailscale detected ({}) but bound to loopback; pass --remote to accept tailnet clients",
                info.dns_name
            );
        }
        None => {
            log::info!("[remote] Tailscale not detected; remote clients unavailable");
        }
    }
}

/// Serves the HTTP API against state the caller already owns.
///
/// Used by the desktop app to expose its live codex/cc session to remote
/// devices. Unlike `start_web_server_with_events` this starts no runtimes of
/// its own — the caller passes in the automation runtime it already owns, and the
/// session scanner is already running in the host process; starting either twice
/// would double-fire their work.
///
/// Returns once `shutdown` resolves, releasing the port.
pub async fn serve_api<F>(
    codex_state: Option<Arc<AppState>>,
    automation: Option<codexia_automation::AutomationHandle>,
    cc_state: Arc<CCState>,
    acp_state: Arc<codexia_acp::AcpState>,
    event_tx: broadcast::Sender<(String, serde_json::Value)>,
    host: &str,
    port: u16,
    shutdown: F,
) -> Result<(), String>
where
    F: std::future::Future<Output = ()> + Send + 'static,
{
    let device_token = DeviceToken::load_or_create()?;

    let state = WebServerState::new(
        codex_state,
        automation,
        cc_state,
        acp_state,
        Arc::new(SleepState::default()),
        Arc::new(super::terminal::WebTerminalState::default()),
        Arc::new(WebWatchState::default()),
        event_tx,
        device_token,
        port,
    );

    let app = create_router(state);
    // A just-exited previous process can hold this port for a moment after
    // its own process has already disappeared (the OS hasn't released the
    // socket yet), so a bind failure right after launch isn't necessarily
    // another instance still running — give it a few seconds to clear before
    // giving up for good.
    let addr = format!("{host}:{port}");
    let mut attempt = 0;
    let listener = loop {
        match tokio::net::TcpListener::bind(&addr).await {
            Ok(listener) => break listener,
            Err(e) if attempt < 9 => {
                attempt += 1;
                log::warn!(
                    "[remote] bind {addr} failed ({e}), retrying ({attempt}/9)"
                );
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            }
            Err(e) => return Err(format!("Failed to bind {addr}: {e}")),
        }
    };

    // The bound address is what actually matters: binding to a tailnet IP that
    // Tailscale later tears down leaves a socket nothing can connect to.
    match listener.local_addr() {
        Ok(addr) => log::info!("[remote] serving on http://{addr} (requested {host}:{port})"),
        Err(e) => log::warn!("[remote] serving on {host}:{port}, local_addr unavailable: {e}"),
    }

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown)
    .await
    .map_err(|e| format!("Remote server stopped with an error: {e}"))?;

    log::info!("[remote] stopped");
    Ok(())
}
