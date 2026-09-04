use super::to_error_response;
use super::types::{
    ApprovalDecisionParams, McpElicitationResponseParams, PermissionsApprovalParams,
    UnifiedMcpAddParams, UnifiedMcpReadParams, UnifiedMcpRemoveParams,
    UnifiedMcpToggleParams, UserInputResponseParams,
};
use axum::{Json, extract::State as AxumState, http::StatusCode};
use serde_json::{Value, json};
use crate::types::{ErrorResponse, WebServerState};

use codexia_codex::AppState;
use codexia_codex::accounts;
use codexia_cc::mcp_unified as mcp;

fn require_codex(state: &WebServerState) -> Result<&AppState, ErrorResponse> {
    state.codex_state.as_deref().ok_or_else(|| ErrorResponse {
        error: "codex backend is not available (codex binary not found in PATH)".to_string(),
    })
}

pub(crate) async fn api_start_thread(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("thread/start", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_resume_thread(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("thread/resume", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_fork_thread(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("thread/fork", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_rollback_thread(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("thread/rollback", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_list_threads(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("thread/list", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_archive_thread(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("thread/archive", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_unarchive_thread(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("thread/unarchive", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_turn_start(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("turn/start", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_turn_interrupt(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("turn/interrupt", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_model_list(
    AxumState(state): AxumState<WebServerState>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("model/list", json!({}))
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_model_list_post(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("model/list", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_account_rate_limits(
    AxumState(state): AxumState<WebServerState>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("account/rateLimits/read", Value::Null)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_get_account(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("account/read", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_login_account(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("account/login/start", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_skills_list(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("skills/list", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_skills_config_write(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("skills/config/write", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_respond_command_execution_approval(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<ApprovalDecisionParams>,
) -> Result<StatusCode, ErrorResponse> {
    require_codex(&state)?
        .codex
        .send_response(params.request_id, json!({ "decision": params.decision }))
        .await
        .map_err(to_error_response)?;

    Ok(StatusCode::OK)
}

pub(crate) async fn api_respond_file_change_approval(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<ApprovalDecisionParams>,
) -> Result<StatusCode, ErrorResponse> {
    require_codex(&state)?
        .codex
        .send_response(params.request_id, json!({ "decision": params.decision }))
        .await
        .map_err(to_error_response)?;

    Ok(StatusCode::OK)
}

pub(crate) async fn api_respond_user_input(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<UserInputResponseParams>,
) -> Result<StatusCode, ErrorResponse> {
    require_codex(&state)?
        .codex
        .send_response(params.request_id, params.response)
        .await
        .map_err(to_error_response)?;

    Ok(StatusCode::OK)
}

pub(crate) async fn api_respond_mcp_elicitation(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<McpElicitationResponseParams>,
) -> Result<StatusCode, ErrorResponse> {
    require_codex(&state)?
        .codex
        .send_response(
            params.request_id,
            json!({
                "action": params.action,
                "content": params.content,
                "_meta": params.meta,
            }),
        )
        .await
        .map_err(to_error_response)?;

    Ok(StatusCode::OK)
}

pub(crate) async fn api_respond_permissions_approval(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<PermissionsApprovalParams>,
) -> Result<StatusCode, ErrorResponse> {
    require_codex(&state)?
        .codex
        .send_response(
            params.request_id,
            json!({
                "permissions": params.permissions,
                "scope": params.scope,
                "strictAutoReview": params.strict_auto_review,
            }),
        )
        .await
        .map_err(to_error_response)?;

    Ok(StatusCode::OK)
}

pub(crate) async fn api_start_review(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("review/start", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}
pub(crate) async fn api_unified_add_mcp_server(
    Json(params): Json<UnifiedMcpAddParams>,
) -> Result<StatusCode, ErrorResponse> {
    mcp::unified_add_mcp_server(
        params.client_name,
        params.path,
        params.server_name,
        params.server_config,
        params.scope,
    )
    .await
    .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_unified_remove_mcp_server(
    Json(params): Json<UnifiedMcpRemoveParams>,
) -> Result<StatusCode, ErrorResponse> {
    mcp::unified_remove_mcp_server(
        params.client_name,
        params.path,
        params.server_name,
        params.scope,
    )
    .await
    .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_unified_enable_mcp_server(
    Json(params): Json<UnifiedMcpToggleParams>,
) -> Result<StatusCode, ErrorResponse> {
    mcp::unified_enable_mcp_server(params.client_name, params.path, params.server_name)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_unified_disable_mcp_server(
    Json(params): Json<UnifiedMcpToggleParams>,
) -> Result<StatusCode, ErrorResponse> {
    mcp::unified_disable_mcp_server(params.client_name, params.path, params.server_name)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_unified_read_mcp_config(
    Json(params): Json<UnifiedMcpReadParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = mcp::unified_read_mcp_config(params.client_name, params.path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_mcp_server_oauth_login(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("mcpServer/oauth/login", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_list_mcp_server_status(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<Value>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = require_codex(&state)?
        .codex
        .send_request("mcpServerStatus/list", params)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

/// Declares handlers that forward their JSON body straight to one codex
/// app-server method.
///
/// These endpoints carry no logic of their own — the desktop app used to reach
/// the same methods through one `#[tauri::command]` each, and spelling every
/// one out as a full function here would just move that duplication.
macro_rules! codex_passthrough {
    ($($name:ident => $method:literal,)*) => {$(
        pub(crate) async fn $name(
            AxumState(state): AxumState<WebServerState>,
            Json(params): Json<Value>,
        ) -> Result<Json<Value>, ErrorResponse> {
            let result = require_codex(&state)?
                .codex
                .send_request($method, params)
                .await
                .map_err(to_error_response)?;
            Ok(Json(result))
        }
    )*};
}

codex_passthrough! {
    api_delete_thread => "thread/delete",
    api_rename_thread => "thread/name/set",
    api_turn_steer => "turn/steer",
    api_thread_goal_set => "thread/goal/set",
    api_thread_goal_get => "thread/goal/get",
    api_thread_goal_clear => "thread/goal/clear",
    api_thread_compact_start => "thread/compact/start",
    api_thread_memory_mode_set => "thread/memoryMode/set",
    api_memory_reset => "memory/reset",
    api_hooks_list => "hooks/list",
    api_plugin_list => "plugin/list",
    api_plugin_read => "plugin/read",
    api_plugin_install => "plugin/install",
    api_plugin_uninstall => "plugin/uninstall",
    api_plugin_installed => "plugin/installed",
    api_external_agent_config_detect => "externalAgentConfig/detect",
    api_external_agent_config_import => "externalAgentConfig/import",
    api_external_agent_config_import_record_history => "externalAgentConfig/import/recordHistory",
    api_external_agent_config_import_read_histories => "externalAgentConfig/import/readHistories",
}

/// A named snapshot of `CODEX_HOME/auth.json`, so an account can be switched
/// back to later without logging out again.
#[derive(serde::Deserialize)]
pub(crate) struct AccountSnapshotParams {
    label: String,
    #[serde(default)]
    email: Option<String>,
    #[serde(default, rename = "planType", alias = "plan_type")]
    plan_type: Option<String>,
}

#[derive(serde::Deserialize)]
pub(crate) struct AccountLabelParams {
    label: String,
}

pub(crate) async fn api_save_account_snapshot(
    Json(params): Json<AccountSnapshotParams>,
) -> Result<StatusCode, ErrorResponse> {
    accounts::save_current_account(&params.label, params.email, params.plan_type)
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_list_account_snapshots()
-> Result<Json<Vec<accounts::AccountSummary>>, ErrorResponse> {
    Ok(Json(accounts::list_accounts().map_err(to_error_response)?))
}

pub(crate) async fn api_remove_account_snapshot(
    Json(params): Json<AccountLabelParams>,
) -> Result<StatusCode, ErrorResponse> {
    accounts::remove_account(&params.label).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_switch_account_snapshot(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<AccountLabelParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = accounts::switch_account(&params.label, &require_codex(&state)?.codex)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}
