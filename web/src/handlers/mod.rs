use axum::{Json, extract::State as AxumState, http::StatusCode, response::IntoResponse};
use serde::{Deserialize};
use serde_json::{json, Value};
use codexia_codex::env::set_env;
use codexia_codex::providers::{load_env_keys, load_and_fetch_models};

use super::types::{ErrorResponse, WebServerState};

mod acp;
mod cc;
mod codex;
mod file;
mod git;
mod openapp;
mod automation;
mod bots;
mod insights;
mod skills;
mod settings;
mod skillssh;
mod terminal;
mod types;

pub(super) use acp::*;
pub(super) use bots::*;
pub(super) use cc::*;
pub(super) use codex::*;
pub(super) use file::*;
pub(super) use git::*;
pub(super) use openapp::*;
pub(super) use automation::*;
pub(super) use insights::*;
pub(super) use skills::*;
pub(super) use settings::*;
pub(super) use skillssh::*;
pub(super) use terminal::*;
pub(super) use types::*;

pub(super) async fn api_prevent_sleep(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<SleepParams>,
) -> Result<StatusCode, ErrorResponse> {
    state
        .sleep_state
        .prevent_sleep(params.conversation_id)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_allow_sleep(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<SleepParams>,
) -> Result<StatusCode, ErrorResponse> {
    state
        .sleep_state
        .allow_sleep(params.conversation_id)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "ok"
    }))
}

fn to_error_response(err: impl ToString) -> ErrorResponse {
    ErrorResponse {
        error: err.to_string(),
    }
}

#[derive(Deserialize)]
pub struct SetEnvPayload {
    key: String,
    value: String,
}

pub(super) async fn api_model_list_other() -> Result<Json<Value>, ErrorResponse> {
    match load_and_fetch_models().await {
        Ok(models) => Ok(Json(json!(models))),
        Err(e) => Err(ErrorResponse { error: e }),
    }
}

#[derive(Deserialize)]
pub struct AddProviderPayload {
    provider: String,
    base_url: String,
    env_key: String,
}

pub(super) async fn api_list_provider_presets() -> Result<Json<Value>, ErrorResponse> {
    match codexia_codex::providers::list_provider_presets() {
        Ok(presets) => Ok(Json(json!(presets))),
        Err(e) => Err(ErrorResponse { error: e }),
    }
}

pub(super) async fn api_add_model_provider(
    AxumState(state): AxumState<WebServerState>,
    Json(payload): Json<AddProviderPayload>,
) -> Result<StatusCode, ErrorResponse> {
    let codex = state.codex_state.as_deref().ok_or_else(|| ErrorResponse {
        error: "codex backend is not available (codex binary not found in PATH)".to_string(),
    })?;
    codexia_codex::config::provider::write_model_provider(
        &codex.codex,
        &payload.provider,
        &payload.base_url,
        &payload.env_key,
    )
    .await
    .map_err(|e| ErrorResponse { error: e })?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_list_config_providers(
    AxumState(state): AxumState<WebServerState>,
) -> Result<Json<Value>, ErrorResponse> {
    let codex = state.codex_state.as_deref().ok_or_else(|| ErrorResponse {
        error: "codex backend is not available (codex binary not found in PATH)".to_string(),
    })?;
    match codexia_codex::config::provider::read_model_providers(&codex.codex).await {
        Ok(providers) => Ok(Json(json!(providers))),
        Err(e) => Err(ErrorResponse { error: e }),
    }
}

#[derive(Deserialize)]
pub struct RemoveProviderPayload {
    provider: String,
}

pub(super) async fn api_remove_model_provider(
    Json(payload): Json<RemoveProviderPayload>,
) -> Result<StatusCode, ErrorResponse> {
    codexia_codex::config::provider::remove_model_provider(&payload.provider)
        .map_err(|e| ErrorResponse { error: e })?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_load_env_keys() -> Result<Json<Value>, ErrorResponse> {
    match load_env_keys().await {
        Ok(items) => Ok(Json(json!(items))),
        Err(e) => Err(ErrorResponse { error: e }),
    }
}

pub(super) async fn api_set_env(
    AxumState(_state): AxumState<WebServerState>,
    Json(payload): Json<SetEnvPayload>,
) -> Result<StatusCode, ErrorResponse> {
    // Delegate to the same implementation used by the Tauri command
    set_env(payload.key, payload.value)
        .map_err(|e| ErrorResponse { error: e })?;
    Ok(StatusCode::OK)
}

/// Everything a mobile client needs to pair with this desktop: the device
/// token plus how to reach the machine over the tailnet.
///
/// Sits behind the auth layer, so it is readable from the local settings UI
/// (loopback is exempt) but not by an unauthenticated remote caller.
pub(super) async fn api_pairing_info(
    AxumState(state): AxumState<WebServerState>,
) -> Json<Value> {
    Json(json!({
        "token": state.device_token.value(),
        "port": state.port,
        "tailscale": crate::tailscale::detect(),
    }))
}
