//! Live smoke test against a locally installed ACP agent.
//! Requires network/auth, so it is ignored by default:
//! `cargo test -p codexia-acp -- --ignored --nocapture`

use std::sync::Arc;

use codexia_acp::AcpState;
use codexia_shared::event_sink::EventSink;
use serde_json::Value;

struct PrintSink;
impl EventSink for PrintSink {
    fn emit(&self, event: &str, payload: Value) {
        println!("[{event}] {payload}");
    }
}

#[tokio::test]
#[ignore]
async fn gemini_prompt_roundtrip() {
    let state = AcpState::new(Arc::new(PrintSink));
    let cwd = std::env::temp_dir().display().to_string();
    let started = state.start("gemini", &cwd, None, None).await.expect("start");
    println!("initialize: {}", started.initialize);
    assert!(
        started.session_id.is_some(),
        "session/new failed: {:?}",
        started.session_error
    );

    let session = started.session.as_ref().expect("session/new result");
    println!("modes: {}", session.get("modes").unwrap_or(&Value::Null));
    println!("models: {}", session.get("models").unwrap_or(&Value::Null));

    // Switching mode goes through the standard `session/set_mode`.
    state
        .set_mode(&started.connection_id, started.session_id.as_deref(), "plan")
        .await
        .expect("set_mode");

    // Gemini refuses privileged modes in an untrusted folder; the reason lives
    // in the JSON-RPC `error.data.details` and must survive to the caller.
    let refused = state
        .set_mode(&started.connection_id, started.session_id.as_deref(), "yolo")
        .await
        .expect_err("yolo should be refused in /tmp");
    println!("refused: {refused}");
    assert!(refused.contains("untrusted folder"), "lost error details: {refused}");

    let stop = state
        .prompt(
            &started.connection_id,
            started.session_id.as_deref(),
            "Reply with exactly: pong",
        )
        .await
        .expect("prompt");
    println!("stopReason: {stop}");
    state.stop(&started.connection_id).await.unwrap();
}

/// Grok speaks ACP through `grok agent stdio` and reports its models via the
/// standard `models` field on `session/new`.
#[tokio::test]
#[ignore]
async fn grok_reports_session_config() {
    let state = AcpState::new(Arc::new(PrintSink));
    let cwd = std::env::temp_dir().display().to_string();
    let started = state.start("grok", &cwd, None, None).await.expect("start");
    let session = started.session.expect("session/new result");
    println!("models: {}", session.get("models").unwrap_or(&Value::Null));
    println!("modes: {}", session.get("modes").unwrap_or(&Value::Null));
    println!("configOptions: {}", session.get("configOptions").unwrap_or(&Value::Null));

    // Grok advertises reasoning efforts per model under `models[]._meta` and
    // reads the chosen one from `_meta.reasoningEffort` on `session/set_model`.
    state
        .set_model(
            &started.connection_id,
            started.session_id.as_deref(),
            "grok-4.5",
            Some("low"),
        )
        .await
        .expect("set_model with effort");
    state.stop(&started.connection_id).await.unwrap();
}
