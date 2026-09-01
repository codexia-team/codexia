use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;

pub async fn read_text_file(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }

    // Check file size to prevent reading very large files
    if let Ok(metadata) = fs::metadata(&expanded_path) {
        if metadata.len() > 1024 * 1024 {
            // 1MB limit
            return Err("File is too large to display".to_string());
        }
    }

    match fs::read_to_string(&expanded_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

pub async fn write_file(file_path: String, content: String) -> Result<(), String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    // Basic safety check: only allow writing to text files
    let extension = expanded_path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase());

    let is_text_file = match extension.as_deref() {
        Some("txt") | Some("md") | Some("json") | Some("xml") | Some("yaml") | Some("yml")
        | Some("js") | Some("jsx") | Some("ts") | Some("tsx") | Some("rs") | Some("py")
        | Some("java") | Some("cpp") | Some("c") | Some("h") | Some("css") | Some("html")
        | Some("toml") | Some("cfg") | Some("ini") | Some("sh") | Some("log") => true,
        _ => false,
    };

    if !is_text_file {
        return Err("Only text files can be edited".to_string());
    }

    // Create parent directory if it doesn't exist
    if let Some(parent) = expanded_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }

    match fs::write(&expanded_path, content) {
        Ok(()) => Ok(()),
        Err(e) => Err(format!("Failed to write file: {}", e)),
    }
}

pub async fn delete_file(file_path: String) -> Result<(), String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() {
        return Err("File does not exist".to_string());
    }

    if expanded_path.is_dir() {
        return Err("Cannot delete a directory".to_string());
    }

    match fs::remove_file(&expanded_path) {
        Ok(()) => Ok(()),
        Err(e) => Err(format!("Failed to delete file: {}", e)),
    }
}

pub async fn read_text_file_lines(file_path: String) -> Result<Vec<String>, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }

    // Check file size to prevent reading very large files
    if let Ok(metadata) = fs::metadata(&expanded_path) {
        if metadata.len() > 5 * 1024 * 1024 {
            // 1MB limit
            return Err("File is too large to read".to_string());
        }
    }

    match fs::File::open(&expanded_path) {
        Ok(file) => {
            let reader = BufReader::new(file);
            let lines: Result<Vec<String>, _> = reader.lines().collect();
            match lines {
                Ok(lines) => Ok(lines),
                Err(e) => Err(format!("Failed to read lines: {}", e)),
            }
        }
        Err(e) => Err(format!("Failed to open file: {}", e)),
    }
}

/// Read a file as raw bytes and return them base64-encoded, so the frontend can
/// parse binary formats such as PDF/XLSX itself.
pub async fn read_file(file_path: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};

    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }

    if let Ok(metadata) = fs::metadata(&expanded_path) {
        if metadata.len() > 50 * 1024 * 1024 {
            return Err("File is too large to read".to_string());
        }
    }

    match fs::read(&expanded_path) {
        Ok(bytes) => Ok(STANDARD.encode(bytes)),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}
