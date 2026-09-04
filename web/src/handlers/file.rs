use super::to_error_response;
use axum::{
    Json,
    body::Body,
    extract::{Query, State as AxumState},
    http::{StatusCode, header},
    response::Response,
};
use serde::Deserialize;

use codexia_codex::utils::codex_home;
use codexia_shared::fs::{
    directory_ops::{canonicalize_path, get_home_directory, read_directory, search_files, search_files_by_name},
    file_io::{delete_file, read_file, read_text_file, read_text_file_lines, write_file},
    file_types::FileEntry,
};
use crate::types::{ErrorResponse, WebServerState};
use crate::watcher;

#[derive(Deserialize)]
pub(crate) struct FilesystemPathParams {
    path: String,
}

#[derive(Deserialize)]
pub(crate) struct FilesystemFilePathParams {
    #[serde(rename = "filePath")]
    file_path: String,
}

#[derive(Deserialize)]
pub(crate) struct FilesystemWriteFileParams {
    #[serde(rename = "filePath")]
    file_path: String,
    content: String,
}

#[derive(Deserialize)]
pub(crate) struct FilesystemSearchFilesParams {
    root: String,
    query: String,
    #[serde(default, rename = "exclude_folders", alias = "excludeFolders")]
    exclude_folders: Vec<String>,
    #[serde(default, rename = "max_results", alias = "maxResults")]
    max_results: Option<usize>,
}
/// Content type for the handful of asset kinds the UI renders inline.
fn content_type_for(path: &std::path::Path) -> &'static str {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "avif" => "image/avif",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "pdf" => "application/pdf",
        _ => "application/octet-stream",
    }
}

/// Serves a local file's raw bytes so the web build can use a plain URL where
/// the desktop build uses Tauri's `convertFileSrc` (see `fileSrc` in
/// `src/hooks/runtime.ts`).
pub(crate) async fn api_asset(
    Query(params): Query<FilesystemPathParams>,
) -> Result<Response, ErrorResponse> {
    let expanded = expand_home(&params.path);

    if !expanded.is_file() {
        return Err(to_error_response("File does not exist".to_string()));
    }

    let bytes = tokio::fs::read(&expanded)
        .await
        .map_err(|e| to_error_response(format!("Failed to read file: {e}")))?;

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, content_type_for(&expanded))
        .header(header::CACHE_CONTROL, "private, max-age=60")
        .body(Body::from(bytes))
        .map_err(|e| to_error_response(e.to_string()))
}

fn expand_home(path: &str) -> std::path::PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest);
        }
    }
    std::path::PathBuf::from(path)
}

pub(crate) async fn api_read_directory(
    Json(params): Json<FilesystemPathParams>,
) -> Result<Json<Vec<FileEntry>>, ErrorResponse> {
    let entries = read_directory(params.path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(entries))
}

pub(crate) async fn api_get_home_directory() -> Result<Json<String>, ErrorResponse> {
    let home = get_home_directory().await.map_err(to_error_response)?;
    Ok(Json(home))
}

pub(crate) async fn api_canonicalize_path(
    Json(params): Json<FilesystemPathParams>,
) -> Result<Json<String>, ErrorResponse> {
    let path = canonicalize_path(params.path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(path))
}

pub(crate) async fn api_search_files(
    Json(params): Json<FilesystemSearchFilesParams>,
) -> Result<Json<Vec<FileEntry>>, ErrorResponse> {
    let entries = search_files(
        params.root,
        params.query,
        params.exclude_folders,
        params.max_results,
    )
    .await
    .map_err(to_error_response)?;
    Ok(Json(entries))
}

pub(crate) async fn api_search_files_by_name(
    Json(params): Json<FilesystemSearchFilesParams>,
) -> Result<Json<Vec<FileEntry>>, ErrorResponse> {
    let entries = search_files_by_name(
        params.root,
        params.query,
        params.exclude_folders,
        params.max_results,
    )
    .await
    .map_err(to_error_response)?;
    Ok(Json(entries))
}

pub(crate) async fn api_read_text_file(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<Json<String>, ErrorResponse> {
    let content = read_text_file(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(content))
}

pub(crate) async fn api_read_text_file_lines(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<Json<Vec<String>>, ErrorResponse> {
    let lines = read_text_file_lines(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(lines))
}

pub(crate) async fn api_read_file(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<Json<String>, ErrorResponse> {
    let content = read_file(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(content))
}

pub(crate) async fn api_codex_home() -> Result<Json<String>, ErrorResponse> {
    let home = codex_home();
    Ok(Json(home.to_string_lossy().into_owned()))
}

pub(crate) async fn api_write_file(
    Json(params): Json<FilesystemWriteFileParams>,
) -> Result<StatusCode, ErrorResponse> {
    write_file(params.file_path, params.content)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_delete_file(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<StatusCode, ErrorResponse> {
    delete_file(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_watch_directory(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<FilesystemPathParams>,
) -> Result<StatusCode, ErrorResponse> {
    watcher::start_watch_path(
        state.fs_watch_state.as_ref(),
        state.event_tx.clone(),
        params.path,
    )
    .await
    .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_unwatch_directory(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<FilesystemPathParams>,
) -> Result<StatusCode, ErrorResponse> {
    watcher::unwatch_path(state.fs_watch_state.as_ref(), params.path)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}