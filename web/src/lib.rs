pub mod watcher;
pub mod auth;
mod event_sink;
pub mod events;
pub mod tailscale;
mod handlers;
pub mod router;
mod server;
pub mod terminal;
pub mod types;
mod websocket;
mod server_web;

pub use router::create_router;
pub use types::WebServerState;
pub use server_web::{serve_api, start_web_server};

// Start the web server and open browser
pub fn start_server(host: &str, port: u16) {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    let host = host.to_string();

    // Wait for the listener to actually bind before opening the browser, so
    // we don't race codex/cc startup and hit a connection-refused that
    // requires a manual refresh.
    let (ready_tx, ready_rx) = std::sync::mpsc::channel();
    let open_url = format!("http://{}:{}", if host == "0.0.0.0" { "127.0.0.1" } else { &host }, port);
    std::thread::spawn(move || {
        if ready_rx.recv().is_err() {
            return;
        }
        if let Err(e) = open::that(&open_url) {
            log::warn!("Failed to open browser: {}", e);
        } else {
            log::info!("Opened browser at {}", open_url);
        }
    });

    let runtime = tokio::runtime::Runtime::new()
        .expect("Failed to create tokio runtime for web server startup");
    runtime.block_on(async {
        if let Err(err) = start_web_server(&host, port, Some(ready_tx)).await {
            log::error!("Failed to start web server: {}", err);
        }
    });
}