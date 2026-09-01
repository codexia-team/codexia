use codexia_shared::fs::{
    directory_ops, file_io,
    file_types::FileEntry,
    watcher,
};
use codexia_shared::state::WatchState;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    directory_ops::read_directory(path).await
}

#[tauri::command]
pub async fn get_home_directory() -> Result<String, String> {
    directory_ops::get_home_directory().await
}

#[tauri::command]
pub async fn search_files(
    root: String,
    query: String,
    exclude_folders: Vec<String>,
    max_results: Option<usize>,
) -> Result<Vec<FileEntry>, String> {
    directory_ops::search_files(root, query, exclude_folders, max_results).await
}

#[tauri::command]
pub async fn search_files_by_name(
    root: String,
    query: String,
    exclude_folders: Vec<String>,
    max_results: Option<usize>,
) -> Result<Vec<FileEntry>, String> {
    directory_ops::search_files_by_name(root, query, exclude_folders, max_results).await
}

#[tauri::command]
pub async fn canonicalize_path(path: String) -> Result<String, String> {
    directory_ops::canonicalize_path(path).await
}

#[tauri::command]
pub async fn read_text_file(file_path: String) -> Result<String, String> {
    file_io::read_text_file(file_path).await
}

#[tauri::command]
pub async fn read_text_file_lines(file_path: String) -> Result<Vec<String>, String> {
    file_io::read_text_file_lines(file_path).await
}

#[tauri::command]
pub async fn write_file(file_path: String, content: String) -> Result<(), String> {
    file_io::write_file(file_path, content).await
}

#[tauri::command]
pub async fn delete_file(file_path: String) -> Result<(), String> {
    file_io::delete_file(file_path).await
}

#[tauri::command]
pub async fn read_file(file_path: String) -> Result<String, String> {
    file_io::read_file(file_path).await
}

fn tauri_watch_emitter(app: AppHandle) -> Arc<dyn Fn(watcher::FsChange) + Send + Sync> {
    Arc::new(move |payload: watcher::FsChange| {
        let _ = app.emit("fs_change", &payload);
    })
}

#[tauri::command]
pub async fn watch_directory(
    app: AppHandle,
    state: State<'_, WatchState>,
    folder_path: String,
) -> Result<(), String> {
    watcher::watch(state.inner(), folder_path, tauri_watch_emitter(app)).await
}

#[tauri::command]
pub async fn unwatch_directory(
    state: State<'_, WatchState>,
    folder_path: String,
) -> Result<(), String> {
    watcher::unwatch(state.inner(), folder_path).await
}