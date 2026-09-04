use super::to_error_response;
use axum::{Json, http::StatusCode};
use serde::Deserialize;

use codexia_git::{
    GitApplyWorktreeResult, GitBranchInfoResult, GitBranchListResult,
    GitCreateWorktreeResult, GitDiffStatsResult, GitFileDiffMetaResult,
    GitFileDiffResult, GitHasWorktreeChangesResult, GitStatusResult, git_apply_worktree_changes,
    git_branch_info,
    git_checkout_branch, git_create_branch, git_create_worktree, git_diff_stats, git_file_diff,
    git_file_diff_meta, git_has_worktree_changes, git_list_branches, git_remove_worktree,
    git_reverse_files,
    git_stage_files, git_status, git_unstage_files,
};
use crate::types::ErrorResponse;

#[derive(Deserialize)]
pub(crate) struct GitCwdParams {
    cwd: String,
}

#[derive(Deserialize)]
pub(crate) struct GitFileDiffParams {
    cwd: String,
    #[serde(rename = "filePath", alias = "file_path")]
    file_path: String,
    staged: bool,
}

#[derive(Deserialize)]
pub(crate) struct GitStageFilesParams {
    cwd: String,
    #[serde(rename = "filePaths", alias = "file_paths")]
    file_paths: Vec<String>,
}

#[derive(Deserialize)]
pub(crate) struct GitReverseFilesParams {
    cwd: String,
    #[serde(rename = "filePaths", alias = "file_paths")]
    file_paths: Vec<String>,
    staged: bool,
}

#[derive(Deserialize)]
pub(crate) struct GitCreateWorktreeParams {
    cwd: String,
    #[serde(rename = "worktreeKey", alias = "worktree_key")]
    worktree_key: String,
}

pub(crate) async fn api_git_create_worktree(
    Json(params): Json<GitCreateWorktreeParams>,
) -> Result<Json<GitCreateWorktreeResult>, ErrorResponse> {
    let result = git_create_worktree(params.cwd, params.worktree_key)
        .map_err(to_error_response)?;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub(crate) struct GitRemoveWorktreeParams {
    cwd: String,
    #[serde(rename = "worktreeKey", alias = "worktree_key")]
    worktree_key: String,
}

pub(crate) async fn api_git_remove_worktree(
    Json(params): Json<GitRemoveWorktreeParams>,
) -> Result<StatusCode, ErrorResponse> {
    git_remove_worktree(params.cwd, params.worktree_key).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_git_apply_worktree_changes(
    Json(params): Json<GitRemoveWorktreeParams>,
) -> Result<Json<GitApplyWorktreeResult>, ErrorResponse> {
    let result = git_apply_worktree_changes(params.cwd, params.worktree_key)
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_branch_info(
    Json(params): Json<GitCwdParams>,
) -> Result<Json<GitBranchInfoResult>, ErrorResponse> {
    let result = git_branch_info(params.cwd).map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_list_branches(
    Json(params): Json<GitCwdParams>,
) -> Result<Json<GitBranchListResult>, ErrorResponse> {
    let result = git_list_branches(params.cwd).map_err(to_error_response)?;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub(crate) struct GitCheckoutBranchParams {
    cwd: String,
    branch: String,
}

pub(crate) async fn api_git_create_branch(
    Json(params): Json<GitCheckoutBranchParams>,
) -> Result<StatusCode, ErrorResponse> {
    git_create_branch(params.cwd, params.branch).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_git_checkout_branch(
    Json(params): Json<GitCheckoutBranchParams>,
) -> Result<StatusCode, ErrorResponse> {
    git_checkout_branch(params.cwd, params.branch).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_git_status(
    Json(params): Json<GitCwdParams>,
) -> Result<Json<GitStatusResult>, ErrorResponse> {
    let result = git_status(params.cwd).map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_file_diff(
    Json(params): Json<GitFileDiffParams>,
) -> Result<Json<GitFileDiffResult>, ErrorResponse> {
    let result = git_file_diff(params.cwd, params.file_path, params.staged)
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_file_diff_meta(
    Json(params): Json<GitFileDiffParams>,
) -> Result<Json<GitFileDiffMetaResult>, ErrorResponse> {
    let result = git_file_diff_meta(params.cwd, params.file_path, params.staged)
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_diff_stats(
    Json(params): Json<GitCwdParams>,
) -> Result<Json<GitDiffStatsResult>, ErrorResponse> {
    let result = git_diff_stats(params.cwd).map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_stage_files(
    Json(params): Json<GitStageFilesParams>,
) -> Result<StatusCode, ErrorResponse> {
    git_stage_files(params.cwd, params.file_paths).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_git_unstage_files(
    Json(params): Json<GitStageFilesParams>,
) -> Result<StatusCode, ErrorResponse> {
    git_unstage_files(params.cwd, params.file_paths).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_git_reverse_files(
    Json(params): Json<GitReverseFilesParams>,
) -> Result<StatusCode, ErrorResponse> {
    git_reverse_files(params.cwd, params.file_paths, params.staged).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

#[derive(Deserialize)]
pub(crate) struct GitCommitParams {
    cwd: String,
    message: String,
}

#[derive(Deserialize)]
pub(crate) struct GitPushParams {
    cwd: String,
    remote: Option<String>,
    branch: Option<String>,
}

pub(crate) async fn api_git_commit(
    Json(params): Json<GitCommitParams>,
) -> Result<Json<String>, ErrorResponse> {
    let result = codexia_git::git_commit(params.cwd, params.message)
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_push(
    Json(params): Json<GitPushParams>,
) -> Result<Json<String>, ErrorResponse> {
    let result = codexia_git::git_push(params.cwd, params.remote, params.branch)
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_has_worktree_changes(
    Json(params): Json<GitRemoveWorktreeParams>,
) -> Result<Json<GitHasWorktreeChangesResult>, ErrorResponse> {
    let result =
        git_has_worktree_changes(params.cwd, params.worktree_key).map_err(to_error_response)?;
    Ok(Json(result))
}
