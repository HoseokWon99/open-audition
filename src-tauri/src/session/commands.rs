use std::path::Path;

use super::parse::parse_oasx_str;
use super::types::Multitrack;

#[tauri::command]
pub async fn parse_oasx(raw: String) -> Result<Multitrack, String> {
    parse_oasx_str(&raw).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn open_oasx_file(filepath: String) -> Result<Multitrack, String> {
    let raw = std::fs::read_to_string(Path::new(&filepath)).map_err(|error| error.to_string())?;
    parse_oasx_str(&raw).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn save_oasx_file(filepath: String, raw: String) -> Result<(), String> {
    let parsed = parse_oasx_str(&raw).map_err(|error| error.to_string())?;

    if parsed.version != "1.0" {
        return Err(format!(
            "unsupported multitrack version: {}",
            parsed.version
        ));
    }

    std::fs::write(Path::new(&filepath), raw).map_err(|error| error.to_string())
}
