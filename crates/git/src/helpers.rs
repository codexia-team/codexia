use crate::types::GitDiffStatsCounts;
use gix::bstr::{BStr, ByteSlice};
use std::path::{Path, PathBuf};

pub(super) fn open_repo(cwd: &str) -> Result<gix::Repository, String> {
    gix::discover(cwd).map_err(|err| format!("Failed to open git repository: {err}"))
}

fn normalize_repo_path(path: &str) -> String {
    path.replace('\\', "/").trim_start_matches("./").to_string()
}

pub(super) fn to_repo_relative_path(repo: &gix::Repository, file_path: &str) -> Result<String, String> {
    let raw = Path::new(file_path);
    if raw.is_absolute() {
        let root = repo
            .workdir()
            .ok_or_else(|| "This git repository has no worktree".to_string())?;
        let relative = raw
            .strip_prefix(root)
            .map_err(|_| format!("Path is outside repository root: {}", raw.display()))?;
        return Ok(normalize_repo_path(&relative.to_string_lossy()));
    }
    Ok(normalize_repo_path(file_path))
}

pub(super) fn remove_all_entries_for_path(index: &mut gix::index::File, path: &BStr) {
    index.remove_entries(|_, entry_path, _| entry_path == path);
}

pub(super) fn repo_root(repo: &gix::Repository) -> String {
    repo.workdir()
        .unwrap_or_else(|| repo.git_dir())
        .display()
        .to_string()
}

pub(super) fn entry_from_tree(
    repo: &gix::Repository,
    path: &str,
) -> Result<Option<(gix::hash::ObjectId, gix::object::tree::EntryMode)>, String> {
    let tree = match repo.head_tree() {
        Ok(tree) => tree,
        Err(_) => return Ok(None),
    };
    let entry = tree
        .lookup_entry_by_path(Path::new(path))
        .map_err(|err| format!("Failed to resolve HEAD tree entry: {err}"))?;
    Ok(entry.map(|value| (value.object_id(), value.mode())))
}

fn read_blob_as_text(repo: &gix::Repository, id: &gix::hash::oid) -> Result<String, String> {
    let object = repo
        .find_object(id.to_owned())
        .map_err(|err| format!("Failed to read object: {err}"))?;
    if object.kind != gix::object::Kind::Blob {
        return Ok(String::new());
    }
    Ok(String::from_utf8_lossy(&object.data).to_string())
}

/// Git's own heuristic: a NUL byte in the leading chunk means binary.
fn bytes_look_binary(bytes: &[u8]) -> bool {
    let window = bytes.len().min(8000);
    bytes[..window].contains(&0)
}

fn blob_is_binary(repo: &gix::Repository, id: &gix::hash::oid) -> Result<bool, String> {
    let object = repo
        .find_object(id.to_owned())
        .map_err(|err| format!("Failed to read object: {err}"))?;
    if object.kind != gix::object::Kind::Blob {
        return Ok(false);
    }
    Ok(bytes_look_binary(&object.data))
}

pub(super) fn index_blob_is_binary(
    repo: &gix::Repository,
    index: &gix::index::File,
    path: &str,
) -> Result<bool, String> {
    let entry = match index.entry_by_path_and_stage(
        path.as_bytes().as_bstr(),
        gix::index::entry::Stage::Unconflicted,
    ) {
        Some(entry) => entry,
        None => return Ok(false),
    };
    blob_is_binary(repo, &entry.id)
}

pub(super) fn head_blob_is_binary(repo: &gix::Repository, path: &str) -> Result<bool, String> {
    let (id, _) = match entry_from_tree(repo, path)? {
        Some(entry) => entry,
        None => return Ok(false),
    };
    blob_is_binary(repo, &id)
}

pub(super) fn worktree_is_binary(repo: &gix::Repository, path: &str) -> Result<bool, String> {
    use std::io::Read;

    let root = match repo.workdir() {
        Some(path) => path,
        None => return Ok(false),
    };
    let absolute_path = root.join(path);
    let metadata = match std::fs::symlink_metadata(&absolute_path) {
        Ok(metadata) => metadata,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(err) => return Err(format!("Failed to read file metadata: {err}")),
    };
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Ok(false);
    }

    let mut file = std::fs::File::open(&absolute_path)
        .map_err(|err| format!("Failed to read file content: {err}"))?;
    let mut head = [0u8; 8000];
    let read = file
        .read(&mut head)
        .map_err(|err| format!("Failed to read file content: {err}"))?;
    Ok(bytes_look_binary(&head[..read]))
}

fn blob_size(repo: &gix::Repository, id: &gix::hash::oid) -> Result<usize, String> {
    let object = repo
        .find_object(id.to_owned())
        .map_err(|err| format!("Failed to read object: {err}"))?;
    if object.kind != gix::object::Kind::Blob {
        return Ok(0);
    }
    Ok(object.data.len())
}

pub(super) fn index_blob_content(
    repo: &gix::Repository,
    index: &gix::index::File,
    path: &str,
) -> Result<Option<String>, String> {
    let entry = match index.entry_by_path_and_stage(
        path.as_bytes().as_bstr(),
        gix::index::entry::Stage::Unconflicted,
    ) {
        Some(entry) => entry,
        None => return Ok(None),
    };
    read_blob_as_text(repo, &entry.id).map(Some)
}

pub(super) fn index_blob_size(
    repo: &gix::Repository,
    index: &gix::index::File,
    path: &str,
) -> Result<Option<usize>, String> {
    let entry = match index.entry_by_path_and_stage(
        path.as_bytes().as_bstr(),
        gix::index::entry::Stage::Unconflicted,
    ) {
        Some(entry) => entry,
        None => return Ok(None),
    };
    blob_size(repo, &entry.id).map(Some)
}

pub(super) fn head_blob_content(repo: &gix::Repository, path: &str) -> Result<Option<String>, String> {
    let (id, _) = match entry_from_tree(repo, path)? {
        Some(entry) => entry,
        None => return Ok(None),
    };
    read_blob_as_text(repo, &id).map(Some)
}

pub(super) fn head_blob_size(repo: &gix::Repository, path: &str) -> Result<Option<usize>, String> {
    let (id, _) = match entry_from_tree(repo, path)? {
        Some(entry) => entry,
        None => return Ok(None),
    };
    blob_size(repo, &id).map(Some)
}

pub(super) fn worktree_content(repo: &gix::Repository, path: &str) -> Result<Option<String>, String> {
    let root = match repo.workdir() {
        Some(path) => path,
        None => return Ok(None),
    };
    let absolute_path = root.join(path);
    let metadata = match std::fs::symlink_metadata(&absolute_path) {
        Ok(metadata) => metadata,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(err) => return Err(format!("Failed to read file metadata: {err}")),
    };

    if metadata.file_type().is_symlink() {
        let target = std::fs::read_link(&absolute_path)
            .map_err(|err| format!("Failed to read symlink: {err}"))?;
        return Ok(Some(target.to_string_lossy().to_string()));
    }
    if metadata.is_file() {
        let bytes = std::fs::read(&absolute_path)
            .map_err(|err| format!("Failed to read file content: {err}"))?;
        return Ok(Some(String::from_utf8_lossy(&bytes).to_string()));
    }
    Ok(Some(String::new()))
}

pub(super) fn worktree_size(repo: &gix::Repository, path: &str) -> Result<Option<usize>, String> {
    let root = match repo.workdir() {
        Some(path) => path,
        None => return Ok(None),
    };
    let absolute_path = root.join(path);
    let metadata = match std::fs::symlink_metadata(&absolute_path) {
        Ok(metadata) => metadata,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(err) => return Err(format!("Failed to read file metadata: {err}")),
    };

    if metadata.file_type().is_symlink() {
        let target = std::fs::read_link(&absolute_path)
            .map_err(|err| format!("Failed to read symlink: {err}"))?;
        return Ok(Some(target.as_os_str().as_encoded_bytes().len()));
    }
    if metadata.is_file() {
        return Ok(Some(metadata.len() as usize));
    }
    Ok(Some(0))
}

pub(super) fn stage_code_from_tree_index_change(change: &gix::diff::index::ChangeRef<'_, '_>) -> char {
    match change {
        gix::diff::index::ChangeRef::Addition { .. } => 'A',
        gix::diff::index::ChangeRef::Deletion { .. } => 'D',
        gix::diff::index::ChangeRef::Modification { .. } => 'M',
        gix::diff::index::ChangeRef::Rewrite { copy, .. } => {
            if *copy {
                'C'
            } else {
                'R'
            }
        }
    }
}

pub(super) fn stage_entry_path(change: &gix::diff::index::ChangeRef<'_, '_>) -> (String, Option<String>) {
    match change {
        gix::diff::index::ChangeRef::Rewrite {
            source_location,
            location,
            copy,
            ..
        } => {
            let source = source_location.to_str_lossy().into_owned();
            let target = location.to_str_lossy().into_owned();
            if *copy {
                (target, None)
            } else {
                (target, Some(source))
            }
        }
        _ => (change.location().to_str_lossy().into_owned(), None),
    }
}

pub(super) fn worktree_code_from_summary(summary: gix::status::index_worktree::iter::Summary) -> char {
    match summary {
        gix::status::index_worktree::iter::Summary::Added => '?',
        gix::status::index_worktree::iter::Summary::Removed => 'D',
        gix::status::index_worktree::iter::Summary::Modified => 'M',
        gix::status::index_worktree::iter::Summary::TypeChange => 'T',
        gix::status::index_worktree::iter::Summary::Renamed => 'R',
        gix::status::index_worktree::iter::Summary::Copied => 'C',
        gix::status::index_worktree::iter::Summary::Conflict => 'U',
        gix::status::index_worktree::iter::Summary::IntentToAdd => 'A',
    }
}

pub(super) fn stat_for_worktree_path(repo: &gix::Repository, relative_path: &str) -> gix::index::entry::Stat {
    let Some(workdir) = repo.workdir() else {
        return gix::index::entry::Stat::default();
    };
    let absolute = workdir.join(relative_path);
    let metadata = match gix::index::fs::Metadata::from_path_no_follow(&absolute) {
        Ok(metadata) => metadata,
        Err(_) => return gix::index::entry::Stat::default(),
    };
    gix::index::entry::Stat::from_fs(&metadata).unwrap_or_default()
}

pub(super) fn add_counts(total: &mut GitDiffStatsCounts, counts: GitDiffStatsCounts) {
    total.additions = total.additions.saturating_add(counts.additions);
    total.deletions = total.deletions.saturating_add(counts.deletions);
}

pub(super) fn read_blob_bytes(repo: &gix::Repository, id: &gix::hash::oid) -> Result<Vec<u8>, String> {
    let object = repo
        .find_object(id.to_owned())
        .map_err(|err| format!("Failed to read object: {err}"))?;
    if object.kind != gix::object::Kind::Blob {
        return Ok(Vec::new());
    }
    Ok(object.data.clone())
}

pub(super) fn index_blob_bytes(
    repo: &gix::Repository,
    index: &gix::index::File,
    path: &str,
) -> Result<Option<Vec<u8>>, String> {
    let entry = match index.entry_by_path_and_stage(
        path.as_bytes().as_bstr(),
        gix::index::entry::Stage::Unconflicted,
    ) {
        Some(entry) => entry,
        None => return Ok(None),
    };
    read_blob_bytes(repo, &entry.id).map(Some)
}

pub(super) fn worktree_bytes(repo: &gix::Repository, path: &str) -> Result<Option<Vec<u8>>, String> {
    let root = match repo.workdir() {
        Some(path) => path,
        None => return Ok(None),
    };
    let absolute_path = root.join(path);
    let metadata = match std::fs::symlink_metadata(&absolute_path) {
        Ok(metadata) => metadata,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(err) => return Err(format!("Failed to read file metadata: {err}")),
    };

    if metadata.file_type().is_symlink() {
        let target = std::fs::read_link(&absolute_path)
            .map_err(|err| format!("Failed to read symlink: {err}"))?;
        return Ok(Some(target.as_os_str().as_encoded_bytes().to_vec()));
    }
    if metadata.is_file() {
        let bytes = std::fs::read(&absolute_path)
            .map_err(|err| format!("Failed to read file content: {err}"))?;
        return Ok(Some(bytes));
    }
    Ok(Some(Vec::new()))
}

pub(super) fn repo_root_path(repo: &gix::Repository) -> Result<PathBuf, String> {
    repo.workdir()
        .map(|path| path.to_path_buf())
        .ok_or_else(|| "This git repository has no worktree".to_string())
}
