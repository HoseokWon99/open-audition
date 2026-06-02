mod media;
mod session;
mod ui;

use std::sync::Mutex;

use media::cache::MediaCache;
use media::commands::{
    ensure_asset_peaks, import_media_file, import_video_audio, read_asset_bytes, read_asset_peaks,
};
use session::commands::{open_oasx_file, parse_oasx, save_oasx_file};
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn media_cache_dir(app: &tauri::App) -> std::path::PathBuf {
    app.path()
        .app_cache_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("open-audition-cache"))
        .join("media")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            ui::menu::install(app)?;
            let cache = MediaCache::new(media_cache_dir(app))?;
            app.manage(Mutex::new(cache));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            import_media_file,
            import_video_audio,
            read_asset_bytes,
            ensure_asset_peaks,
            read_asset_peaks,
            parse_oasx,
            open_oasx_file,
            save_oasx_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
