use axum::Json;
use serde::Deserialize;

use codexia_db::acp_sessions::AcpSessionRecord;
use codexia_db::bots::{BotPatch, BotRecord};

use crate::types::ErrorResponse;

fn err(e: String) -> ErrorResponse {
    ErrorResponse { error: e }
}

#[derive(Deserialize)]
pub(crate) struct ListBotsParams {
    #[serde(default)]
    pub include_archived: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CreateBotParams {
    pub id: String,
    pub name: String,
    pub avatar: String,
    pub color: String,
    pub cwd: String,
    /// Which ACP preset backs the bot. Defaults to keke, the only one the Bot
    /// tab offers today.
    #[serde(default)]
    pub agent_id: Option<String>,
    #[serde(default)]
    pub trust_level: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UpdateBotParams {
    pub id: String,
    #[serde(flatten)]
    pub patch: BotPatch,
}

#[derive(Deserialize)]
pub(crate) struct BotIdParams {
    pub id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BotSessionsParams {
    pub bot_id: String,
    #[serde(default)]
    pub limit: Option<usize>,
}

pub(crate) async fn api_list_bots(
    Json(params): Json<ListBotsParams>,
) -> Result<Json<Vec<BotRecord>>, ErrorResponse> {
    codexia_db::bots::list_bots(params.include_archived)
        .map(Json)
        .map_err(err)
}

pub(crate) async fn api_create_bot(
    Json(params): Json<CreateBotParams>,
) -> Result<Json<BotRecord>, ErrorResponse> {
    codexia_db::bots::create_bot(
        &params.id,
        &params.name,
        &params.avatar,
        &params.color,
        params.agent_id.as_deref().unwrap_or("keke"),
        &params.cwd,
        params.trust_level.as_deref().unwrap_or("ask"),
    )
    .map(Json)
    .map_err(err)
}

pub(crate) async fn api_update_bot(
    Json(params): Json<UpdateBotParams>,
) -> Result<Json<BotRecord>, ErrorResponse> {
    codexia_db::bots::update_bot(&params.id, &params.patch)
        .map(Json)
        .map_err(err)
}

pub(crate) async fn api_delete_bot(
    Json(params): Json<BotIdParams>,
) -> Result<Json<()>, ErrorResponse> {
    codexia_db::bots::delete_bot(&params.id).map(Json).map_err(err)
}

/// One bot's conversations, newest first. A table read: listing a bot must
/// never wake its agent process.
pub(crate) async fn api_bot_sessions(
    Json(params): Json<BotSessionsParams>,
) -> Result<Json<Vec<AcpSessionRecord>>, ErrorResponse> {
    codexia_db::acp_sessions::list_bot_sessions(&params.bot_id, params.limit.unwrap_or(100))
        .map(Json)
        .map_err(err)
}
