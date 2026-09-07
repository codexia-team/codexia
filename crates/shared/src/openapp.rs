use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

#[derive(Deserialize, Debug)]
pub struct OpenWorkspaceOptions {
    pub app: Option<String>,
    pub command: Option<String>,
    pub args: Vec<String>,
}

#[derive(Serialize, Debug)]
pub struct AppStatus {
    pub installed: bool,
    pub path: Option<String>,
}

pub async fn check_app_installed(app_name: String) -> Result<AppStatus, String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(path) = find_app_bundle_macos(&app_name) {
            return Ok(AppStatus {
                installed: true,
                path: Some(path.to_string_lossy().to_string()),
            });
        }
    }
    #[cfg(target_os = "windows")]
    {
        if let Some(path) = find_app_windows(&app_name) {
            return Ok(AppStatus {
                installed: true,
                path: Some(path.to_string_lossy().to_string()),
            });
        }
    }
    #[cfg(target_os = "linux")]
    {
        if let Some(path) = find_app_linux(&app_name) {
            return Ok(AppStatus {
                installed: true,
                path: Some(path.to_string_lossy().to_string()),
            });
        }
    }
    Ok(AppStatus {
        installed: false,
        path: None,
    })
}

#[cfg(target_os = "macos")]
fn find_app_bundle_macos(app_name: &str) -> Option<PathBuf> {
    let roots = vec![
        PathBuf::from("/Applications"),
        PathBuf::from("/System/Applications"),
        PathBuf::from("/Applications/Utilities"),
    ];
    let normalized = if app_name.to_lowercase().ends_with(".app") {
        app_name.to_string()
    } else {
        format!("{}.app", app_name)
    };
    let normalized_lower = normalized.to_lowercase();

    for root in roots {
        if !root.exists() {
            continue;
        }
        if let Ok(entries) = std::fs::read_dir(&root) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let file_name = path.file_name()?.to_string_lossy().to_string();
                    if file_name.to_lowercase() == normalized_lower {
                        return Some(path);
                    }
                }
            }
        }
    }
    if let Ok(home) = std::env::var("HOME") {
        let home_apps = PathBuf::from(home).join("Applications");
        if home_apps.exists() {
            if let Ok(entries) = std::fs::read_dir(&home_apps) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        let file_name = path.file_name()?.to_string_lossy().to_string();
                        if file_name.to_lowercase() == normalized_lower {
                            return Some(path);
                        }
                    }
                }
            }
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn find_app_windows(app_name: &str) -> Option<PathBuf> {
    let program_files = std::env::var("ProgramFiles").ok()?;
    let program_files_x86 = std::env::var("ProgramFiles(x86)").ok();
    let local_app_data = std::env::var("LOCALAPPDATA").ok()?;
    let user_profile = std::env::var("USERPROFILE").ok()?;

    let mut search_paths = vec![
        PathBuf::from(&program_files),
        PathBuf::from(&local_app_data).join("Programs"),
        PathBuf::from(&user_profile).join("AppData/Local/Programs"),
    ];
    if let Some(pf86) = program_files_x86 {
        search_paths.push(PathBuf::from(pf86));
    }

    if let Ok(output) = Command::new("where").arg(app_name).output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = path_str.lines().next() {
                return Some(PathBuf::from(first_line.trim()));
            }
        }
    }

    for root in search_paths {
        if root.exists() {
            if let Ok(entries) = std::fs::read_dir(&root) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        let file_name = path.file_name()?.to_string_lossy().to_string();
                        if file_name.to_lowercase().contains(&app_name.to_lowercase()) {
                            if let Ok(inner) = std::fs::read_dir(&path) {
                                for inner_entry in inner.flatten() {
                                    let inner_path = inner_entry.path();
                                    if inner_path.extension().map_or(false, |ext| ext == "exe") {
                                        return Some(inner_path);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn find_app_linux(app_name: &str) -> Option<PathBuf> {
    if let Ok(output) = Command::new("which").arg(app_name).output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() {
                return Some(PathBuf::from(path_str));
            }
        }
    }
    let paths = vec!["/usr/bin", "/usr/local/bin", "/opt", "/snap/bin"];
    for path in paths {
        let full = PathBuf::from(path).join(app_name);
        if full.exists() {
            return Some(full);
        }
    }
    None
}

pub async fn open_workspace_in(path: String, options: OpenWorkspaceOptions) -> Result<(), String> {
    if let Some(app) = options.app {
        #[cfg(target_os = "macos")]
        {
            let mut cmd = Command::new("open");
            cmd.arg("-a").arg(&app);
            if !options.args.is_empty() {
                for arg in &options.args {
                    cmd.arg("--args").arg(arg);
                }
            }
            cmd.arg(&path);
            cmd.status().map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "windows")]
        {
            let mut cmd = Command::new("cmd");
            cmd.arg("/c").arg("start").arg("").arg(&app);
            for arg in &options.args {
                cmd.arg(arg);
            }
            cmd.arg(&path);
            cmd.status().map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "linux")]
        {
            let mut cmd = Command::new(&app);
            for arg in &options.args {
                cmd.arg(arg);
            }
            cmd.arg(&path);
            cmd.status().map_err(|e| e.to_string())?;
        }
    } else if let Some(command) = options.command {
        let mut cmd = Command::new(&command);
        for arg in &options.args {
            cmd.arg(arg);
        }
        cmd.arg(&path);
        cmd.status().map_err(|e| e.to_string())?;
    }
    Ok(())
}
