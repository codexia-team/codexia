use crate::helpers::{
    head_blob_content, head_blob_is_binary, head_blob_size, index_blob_content, index_blob_is_binary,
    index_blob_size, open_repo, to_repo_relative_path, worktree_content, worktree_is_binary,
    worktree_size,
};
use crate::stats::{staged_diff_stats, unstaged_diff_stats};
use crate::types::{
    GitDiffStatsResult, GitFileDiffMetaResult, GitFileDiffResult,
};

pub fn git_file_diff(
    cwd: String,
    file_path: String,
    staged: bool,
) -> Result<GitFileDiffResult, String> {
    let repo = open_repo(&cwd)?;
    let relative_path = to_repo_relative_path(&repo, &file_path)?;
    let index = repo
        .index_or_empty()
        .map_err(|err| format!("Failed to load git index: {err}"))?;

    let is_binary = if staged {
        head_blob_is_binary(&repo, &relative_path)?
            || index_blob_is_binary(&repo, &index, &relative_path)?
    } else {
        index_blob_is_binary(&repo, &index, &relative_path)?
            || worktree_is_binary(&repo, &relative_path)?
    };

    // Binary blobs would be lossily stringified and then diffed line by line,
    // which is both meaningless and very slow — report the flag instead.
    if is_binary {
        return Ok(GitFileDiffResult {
            has_changes: true,
            old_content: String::new(),
            new_content: String::new(),
            is_binary: true,
        });
    }

    let (old_content, new_content) = if staged {
        (
            head_blob_content(&repo, &relative_path)?.unwrap_or_default(),
            index_blob_content(&repo, &index, &relative_path)?.unwrap_or_default(),
        )
    } else {
        (
            index_blob_content(&repo, &index, &relative_path)?.unwrap_or_default(),
            worktree_content(&repo, &relative_path)?.unwrap_or_default(),
        )
    };

    Ok(GitFileDiffResult {
        has_changes: old_content != new_content,
        old_content,
        new_content,
        is_binary: false,
    })
}

pub fn git_file_diff_meta(
    cwd: String,
    file_path: String,
    staged: bool,
) -> Result<GitFileDiffMetaResult, String> {
    let repo = open_repo(&cwd)?;
    let relative_path = to_repo_relative_path(&repo, &file_path)?;
    let index = repo
        .index_or_empty()
        .map_err(|err| format!("Failed to load git index: {err}"))?;

    let is_binary = if staged {
        head_blob_is_binary(&repo, &relative_path)?
            || index_blob_is_binary(&repo, &index, &relative_path)?
    } else {
        index_blob_is_binary(&repo, &index, &relative_path)?
            || worktree_is_binary(&repo, &relative_path)?
    };

    let (old_bytes, new_bytes) = if staged {
        (
            head_blob_size(&repo, &relative_path)?.unwrap_or(0),
            index_blob_size(&repo, &index, &relative_path)?.unwrap_or(0),
        )
    } else {
        (
            index_blob_size(&repo, &index, &relative_path)?.unwrap_or(0),
            worktree_size(&repo, &relative_path)?.unwrap_or(0),
        )
    };

    Ok(GitFileDiffMetaResult {
        old_bytes,
        new_bytes,
        total_bytes: old_bytes.saturating_add(new_bytes),
        is_binary,
    })
}

pub fn git_diff_stats(cwd: String) -> Result<GitDiffStatsResult, String> {
    let repo = open_repo(&cwd)?;
    let staged = staged_diff_stats(&repo)?;
    let unstaged = unstaged_diff_stats(&repo)?;
    Ok(GitDiffStatsResult { staged, unstaged })
}
