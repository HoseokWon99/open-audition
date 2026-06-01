use std::path::Path;
use std::sync::Mutex;

use tauri::ipc::Response;
use tauri::State;

use super::cache::MediaCache;
use super::types::MediaAsset;

pub type MediaCacheState = Mutex<MediaCache>;

#[tauri::command]
pub async fn import_media_file(
    state: State<'_, MediaCacheState>,
    filepath: String,
) -> Result<MediaAsset, String> {
    let mut cache = state.lock().map_err(|error| error.to_string())?;
    cache
        .import_file(Path::new(&filepath))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn import_video_audio(
    state: State<'_, MediaCacheState>,
    filepath: String,
) -> Result<MediaAsset, String> {
    let mut cache = state.lock().map_err(|error| error.to_string())?;
    cache
        .import_video_as_audio(Path::new(&filepath))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn read_asset_bytes(
    state: State<'_, MediaCacheState>,
    asset_id: String,
) -> Result<Response, String> {
    let cache = state.lock().map_err(|error| error.to_string())?;
    let asset = cache
        .get_asset(&asset_id)
        .ok_or_else(|| format!("asset not found: {asset_id}"))?;
    let bytes = std::fs::read(&asset.cache_path).map_err(|error| error.to_string())?;

    Ok(Response::new(bytes))
}

#[tauri::command]
pub async fn ensure_asset_peaks(
    state: State<'_, MediaCacheState>,
    asset_id: String,
    resolution: u32,
) -> Result<String, String> {
    let cache = state.lock().map_err(|error| error.to_string())?;
    cache
        .ensure_peak_cache(&asset_id, resolution)
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn read_asset_peaks(
    state: State<'_, MediaCacheState>,
    asset_id: String,
    revision: String,
    resolution: u32,
) -> Result<Response, String> {
    let cache = state.lock().map_err(|error| error.to_string())?;
    let path = cache.peak_path(&asset_id, &revision, resolution);
    let bytes = std::fs::read(&path).map_err(|error| error.to_string())?;

    Ok(Response::new(bytes))
}
