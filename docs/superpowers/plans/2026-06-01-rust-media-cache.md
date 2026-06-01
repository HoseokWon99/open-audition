# Rust Media Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Rust-side media asset cache that imports external files into app-managed storage, probes audio metadata, stores derived audio assets, and extracts audio from imported video files.

**Architecture:** External file paths are provenance only. Once imported, media is addressed by an internal `asset_id` and an app-managed `cache_path`. Metadata, derived audio, and future peak data are keyed by asset identity plus revision/resolution data, not by raw filepath alone. Audio analysis and derived audio calculation happen on the Rust side; the frontend requests results and status through Tauri commands.

**Tech Stack:** Rust 2021, Tauri 2, serde, anyhow, ffmpeg-next, std filesystem APIs, Cargo tests.

**API Conventions:** Rust structs use idiomatic snake_case fields internally, but every frontend-facing serialized type must use `#[serde(rename_all = "camelCase")]` so TypeScript DTOs expose camelCase fields. Commands that return byte payloads must return `tauri::ipc::Response::new(bytes)` instead of JSON-serializing bytes, avoiding base64 overhead.

---

## File Structure

- Create `src-tauri/src/media/mod.rs`
  - Owns module exports for media cache code.
- Create `src-tauri/src/media/types.rs`
  - Defines serializable asset, fingerprint, metadata, operation, and error-facing DTO types.
- Create `src-tauri/src/media/fingerprint.rs`
  - Computes file size and modified timestamp. Content hash is deferred until the app has a clear need for stronger identity.
- Create `src-tauri/src/media/detect.rs`
  - Classifies files as audio, video, Open Audition session XML, or unknown from extension.
- Create `src-tauri/src/media/metadata.rs`
  - Probes audio/video metadata through `ffmpeg-next`.
- Create `src-tauri/src/media/ffmpeg_extract.rs`
  - Extracts a video file's audio stream into an app-managed audio file.
- Create `src-tauri/src/media/cache.rs`
  - Implements `MediaCache`, import, derived asset creation, metadata lookup, and peak cache paths.
- Create `src-tauri/src/media/commands.rs`
  - Exposes Tauri commands for frontend calls.
- Modify `src-tauri/src/lib.rs`
  - Registers `media` module, initializes managed state, and registers media commands.
- Keep `src-tauri/src/disk/client.rs` untouched in this plan.
  - It is currently incomplete and should not be expanded into the media cache.

---

### Task 1: Media Types

**Files:**
- Create: `src-tauri/src/media/mod.rs`
- Create: `src-tauri/src/media/types.rs`

- [ ] **Step 1: Add the media module shell**

Create `src-tauri/src/media/mod.rs`:

```rust
pub mod types;
```

- [ ] **Step 2: Add serializable media types**

Create `src-tauri/src/media/types.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum MediaKind {
    Audio,
    Video,
    Xml,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileFingerprint {
    pub size_bytes: u64,
    pub modified_unix_ms: Option<u128>,
    pub content_hash: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioMetadata {
    pub duration_seconds: f64,
    pub sample_rate_hz: u32,
    pub channel_count: u16,
    pub codec: Option<String>,
    pub container: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DerivedFrom {
    pub source_asset_id: String,
    pub operation: String,
    pub params_hash: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaAsset {
    pub id: String,
    pub original_path: Option<PathBuf>,
    pub cache_path: PathBuf,
    pub kind: MediaKind,
    pub fingerprint: FileFingerprint,
    pub metadata: Option<AudioMetadata>,
    pub derived_from: Option<DerivedFrom>,
    pub revision: String,
}
```

- [ ] **Step 3: Register the module in the library**

Modify the top of `src-tauri/src/lib.rs`:

```rust
mod ui;
mod disk;
mod media;
```

- [ ] **Step 4: Run Rust check**

Run:

```bash
cd src-tauri && cargo check
```

Expected: PASS. The new types compile and are unused without warnings that fail the build.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/media/mod.rs src-tauri/src/media/types.rs
git commit -m "feat: add media asset types"
```

---

### Task 2: File Fingerprints

**Files:**
- Create: `src-tauri/src/media/fingerprint.rs`
- Modify: `src-tauri/src/media/mod.rs`

- [ ] **Step 1: Add failing fingerprint tests**

Create `src-tauri/src/media/fingerprint.rs`:

```rust
use anyhow::Result;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

use super::types::FileFingerprint;

pub fn fingerprint_file(path: &Path) -> Result<FileFingerprint> {
    let metadata = fs::metadata(path)?;
    let modified_unix_ms = metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis());

    Ok(FileFingerprint {
        size_bytes: metadata.len(),
        modified_unix_ms,
        content_hash: None,
    })
}

#[cfg(test)]
mod tests {
    use super::fingerprint_file;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_file_path(name: &str) -> std::path::PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("open-audition-{name}-{stamp}"))
    }

    #[test]
    fn fingerprints_file_size() {
        let path = test_file_path("fingerprint-size");
        fs::write(&path, b"abcdef").expect("test file should be written");

        let fingerprint = fingerprint_file(&path).expect("fingerprint should be created");

        assert_eq!(fingerprint.size_bytes, 6);
        assert!(fingerprint.modified_unix_ms.is_some());
        assert_eq!(fingerprint.content_hash, None);

        fs::remove_file(path).expect("test file should be removed");
    }
}
```

- [ ] **Step 2: Export the module**

Modify `src-tauri/src/media/mod.rs`:

```rust
pub mod fingerprint;
pub mod types;
```

- [ ] **Step 3: Run the test**

Run:

```bash
cd src-tauri && cargo test media::fingerprint::tests::fingerprints_file_size
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/media/mod.rs src-tauri/src/media/fingerprint.rs
git commit -m "feat: fingerprint imported media files"
```

---

### Task 3: Media Kind Detection

**Files:**
- Create: `src-tauri/src/media/detect.rs`
- Modify: `src-tauri/src/media/mod.rs`

- [ ] **Step 1: Add media kind detection**

Create `src-tauri/src/media/detect.rs`:

```rust
use std::path::Path;

use super::types::MediaKind;

pub fn detect_media_kind(path: &Path) -> MediaKind {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    match extension.as_str() {
        "wav" | "wave" | "mp3" | "aiff" | "aif" | "flac" | "ogg" | "m4a" => MediaKind::Audio,
        "mp4" | "mov" | "mkv" | "webm" | "avi" => MediaKind::Video,
        "oasx" | "xml" => MediaKind::Xml,
        _ => MediaKind::Unknown,
    }
}

pub fn extension_suffix(path: &Path) -> String {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|extension| format!(".{}", extension.to_ascii_lowercase()))
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::{detect_media_kind, extension_suffix};
    use crate::media::types::MediaKind;
    use std::path::Path;

    #[test]
    fn detects_common_media_extensions() {
        assert_eq!(detect_media_kind(Path::new("cue.wav")), MediaKind::Audio);
        assert_eq!(detect_media_kind(Path::new("capture.MOV")), MediaKind::Video);
        assert_eq!(detect_media_kind(Path::new("session.oasx")), MediaKind::Xml);
        assert_eq!(detect_media_kind(Path::new("notes.txt")), MediaKind::Unknown);
    }

    #[test]
    fn creates_lowercase_extension_suffix() {
        assert_eq!(extension_suffix(Path::new("capture.MOV")), ".mov");
        assert_eq!(extension_suffix(Path::new("README")), "");
    }
}
```

- [ ] **Step 2: Export the module**

Modify `src-tauri/src/media/mod.rs`:

```rust
pub mod detect;
pub mod fingerprint;
pub mod types;
```

- [ ] **Step 3: Run tests**

Run:

```bash
cd src-tauri && cargo test media::detect
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/media/mod.rs src-tauri/src/media/detect.rs
git commit -m "feat: detect imported media kind"
```

---

### Task 4: Audio Metadata Probe

**Files:**
- Create: `src-tauri/src/media/metadata.rs`
- Modify: `src-tauri/src/media/mod.rs`

- [ ] **Step 1: Add metadata probing**

Create `src-tauri/src/media/metadata.rs`:

```rust
use anyhow::{anyhow, Context, Result};
use ffmpeg_next as ffmpeg;
use std::path::Path;

use super::types::AudioMetadata;

pub fn probe_audio_metadata(path: &Path) -> Result<AudioMetadata> {
    ffmpeg::init().context("failed to initialize ffmpeg")?;

    let input = ffmpeg::format::input(path)
        .with_context(|| format!("failed to open media file {}", path.display()))?;
    let stream = input
        .streams()
        .best(ffmpeg::media::Type::Audio)
        .ok_or_else(|| anyhow!("media file has no audio stream: {}", path.display()))?;
    let codec_parameters = stream.parameters();
    let codec_context = ffmpeg::codec::context::Context::from_parameters(codec_parameters)
        .context("failed to create codec context")?;
    let decoder = codec_context
        .decoder()
        .audio()
        .context("failed to create audio decoder")?;

    let duration_seconds = if stream.duration() > 0 {
        let time_base: f64 = stream.time_base().into();
        stream.duration() as f64 * time_base
    } else if input.duration() > 0 {
        input.duration() as f64 / ffmpeg::ffi::AV_TIME_BASE as f64
    } else {
        0.0
    };

    let codec = ffmpeg::codec::decoder::find(decoder.id()).map(|codec| codec.name().to_string());
    let container = input.format().name().split(',').next().map(str::to_string);

    Ok(AudioMetadata {
        duration_seconds,
        sample_rate_hz: decoder.rate(),
        channel_count: decoder.channels(),
        codec,
        container,
    })
}
```

- [ ] **Step 2: Export the module**

Modify `src-tauri/src/media/mod.rs`:

```rust
pub mod detect;
pub mod fingerprint;
pub mod metadata;
pub mod types;
```

- [ ] **Step 3: Run Rust check**

Run:

```bash
cd src-tauri && cargo check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/media/mod.rs src-tauri/src/media/metadata.rs
git commit -m "feat: probe audio metadata with ffmpeg"
```

---

### Task 5: Media Cache Core

**Files:**
- Create: `src-tauri/src/media/cache.rs`
- Modify: `src-tauri/src/media/mod.rs`

- [ ] **Step 1: Add `MediaCache` implementation and tests**

Create `src-tauri/src/media/cache.rs`:

```rust
use anyhow::{Context, Result};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use super::detect::{detect_media_kind, extension_suffix};
use super::fingerprint::fingerprint_file;
use super::metadata::probe_audio_metadata;
use super::types::{DerivedFrom, MediaAsset, MediaKind};

#[derive(Debug)]
pub struct MediaCache {
    root_dir: PathBuf,
    assets: HashMap<String, MediaAsset>,
    by_original_path: HashMap<PathBuf, String>,
}

impl MediaCache {
    pub fn new(root_dir: PathBuf) -> Result<Self> {
        fs::create_dir_all(root_dir.join("sources"))?;
        fs::create_dir_all(root_dir.join("derived"))?;
        fs::create_dir_all(root_dir.join("peaks"))?;

        Ok(Self {
            root_dir,
            assets: HashMap::new(),
            by_original_path: HashMap::new(),
        })
    }

    pub fn import_file(&mut self, path: &Path) -> Result<MediaAsset> {
        let fingerprint = fingerprint_file(path)?;
        let asset_id = new_asset_id();
        let kind = detect_media_kind(path);
        let cache_path = self
            .root_dir
            .join("sources")
            .join(format!("{}{}", asset_id, extension_suffix(path)));

        fs::copy(path, &cache_path)
            .with_context(|| format!("failed to import {}", path.display()))?;

        let metadata = if kind == MediaKind::Audio {
            Some(probe_audio_metadata(&cache_path)?)
        } else {
            None
        };

        let asset = MediaAsset {
            id: asset_id.clone(),
            original_path: Some(path.to_path_buf()),
            cache_path,
            kind,
            fingerprint,
            metadata,
            derived_from: None,
            revision: "1".to_string(),
        };

        self.by_original_path.insert(path.to_path_buf(), asset_id.clone());
        self.assets.insert(asset_id, asset.clone());

        Ok(asset)
    }

    pub fn create_derived_audio(
        &mut self,
        source_asset_id: &str,
        operation: &str,
        params_hash: &str,
        bytes: &[u8],
    ) -> Result<MediaAsset> {
        let asset_id = new_asset_id();
        let cache_path = self.root_dir.join("derived").join(format!("{asset_id}.wav"));

        fs::write(&cache_path, bytes)?;

        let asset = MediaAsset {
            id: asset_id.clone(),
            original_path: None,
            cache_path: cache_path.clone(),
            kind: MediaKind::Audio,
            fingerprint: fingerprint_file(&cache_path)?,
            metadata: probe_audio_metadata(&cache_path).ok(),
            derived_from: Some(DerivedFrom {
                source_asset_id: source_asset_id.to_string(),
                operation: operation.to_string(),
                params_hash: params_hash.to_string(),
            }),
            revision: "1".to_string(),
        };

        self.assets.insert(asset_id, asset.clone());

        Ok(asset)
    }

    pub fn get_asset(&self, asset_id: &str) -> Option<&MediaAsset> {
        self.assets.get(asset_id)
    }

    pub fn find_by_original_path(&self, path: &Path) -> Option<&MediaAsset> {
        self.by_original_path
            .get(path)
            .and_then(|asset_id| self.assets.get(asset_id))
    }

    pub fn peak_path(&self, asset_id: &str, revision: &str, resolution: u32) -> PathBuf {
        self.root_dir
            .join("peaks")
            .join(format!("{asset_id}-{revision}-{resolution}.peaks"))
    }
}

pub fn new_asset_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should be after unix epoch")
        .as_nanos();
    format!("asset-{nanos}")
}

#[cfg(test)]
mod tests {
    use super::MediaCache;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(name: &str) -> std::path::PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("open-audition-{name}-{stamp}"))
    }

    #[test]
    fn creates_cache_directories() {
        let root = temp_dir("cache-directories");
        let _cache = MediaCache::new(root.clone()).expect("cache should be created");

        assert!(root.join("sources").is_dir());
        assert!(root.join("derived").is_dir());
        assert!(root.join("peaks").is_dir());

        fs::remove_dir_all(root).expect("cache should be removed");
    }

    #[test]
    fn imports_session_xml_into_source_cache() {
        let root = temp_dir("import-oasx-cache");
        let source = temp_dir("import-oasx-source").with_extension("oasx");
        fs::write(&source, b"<session />").expect("source file should be written");

        let mut cache = MediaCache::new(root.clone()).expect("cache should be created");
        let asset = cache.import_file(&source).expect("file should import");

        assert!(asset.cache_path.exists());
        assert_eq!(asset.original_path.as_deref(), Some(source.as_path()));
        assert_eq!(asset.fingerprint.size_bytes, 11);
        assert!(cache.get_asset(&asset.id).is_some());
        assert!(cache.find_by_original_path(&source).is_some());

        fs::remove_file(source).expect("source should be removed");
        fs::remove_dir_all(root).expect("cache should be removed");
    }

    #[test]
    fn builds_peak_cache_path() {
        let root = temp_dir("peak-path");
        let cache = MediaCache::new(root.clone()).expect("cache should be created");

        let path = cache.peak_path("asset-1", "3", 2048);

        assert_eq!(path, root.join("peaks").join("asset-1-3-2048.peaks"));

        fs::remove_dir_all(root).expect("cache should be removed");
    }
}
```

- [ ] **Step 2: Export the module**

Modify `src-tauri/src/media/mod.rs`:

```rust
pub mod cache;
pub mod detect;
pub mod fingerprint;
pub mod metadata;
pub mod types;
```

- [ ] **Step 3: Run cache tests**

Run:

```bash
cd src-tauri && cargo test media::cache
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/media/mod.rs src-tauri/src/media/cache.rs
git commit -m "feat: import media into app cache"
```

---

### Task 6: FFmpeg Audio Extraction Boundary

**Files:**
- Create: `src-tauri/src/media/ffmpeg_extract.rs`
- Modify: `src-tauri/src/media/mod.rs`
- Modify: `src-tauri/src/media/cache.rs`

- [ ] **Step 1: Add extraction function boundary**

Create `src-tauri/src/media/ffmpeg_extract.rs`:

```rust
use anyhow::{bail, Context, Result};
use std::path::Path;
use std::process::Command;

pub fn extract_audio_with_ffmpeg(input_path: &Path, output_path: &Path) -> Result<()> {
    let status = Command::new("ffmpeg")
        .arg("-y")
        .arg("-i")
        .arg(input_path)
        .arg("-vn")
        .arg("-acodec")
        .arg("pcm_s16le")
        .arg(output_path)
        .status()
        .context("failed to start ffmpeg process")?;

    if !status.success() {
        bail!("ffmpeg audio extraction failed with status {status}");
    }

    Ok(())
}
```

- [ ] **Step 2: Export extraction module**

Modify `src-tauri/src/media/mod.rs`:

```rust
pub mod cache;
pub mod detect;
pub mod ffmpeg_extract;
pub mod fingerprint;
pub mod metadata;
pub mod types;
```

- [ ] **Step 3: Add video import method to `MediaCache`**

Add this import to `src-tauri/src/media/cache.rs`:

```rust
use super::ffmpeg_extract::extract_audio_with_ffmpeg;
```

Add this method inside `impl MediaCache`:

```rust
    pub fn import_video_as_audio(&mut self, video_path: &Path) -> Result<MediaAsset> {
        let video_asset = self.import_file(video_path)?;
        let audio_asset_id = new_asset_id();
        let output_path = self
            .root_dir
            .join("derived")
            .join(format!("{audio_asset_id}.wav"));

        extract_audio_with_ffmpeg(&video_asset.cache_path, &output_path)?;

        let audio_asset = MediaAsset {
            id: audio_asset_id.clone(),
            original_path: Some(video_path.to_path_buf()),
            cache_path: output_path.clone(),
            kind: MediaKind::Audio,
            fingerprint: fingerprint_file(&output_path)?,
            metadata: Some(probe_audio_metadata(&output_path)?),
            derived_from: Some(DerivedFrom {
                source_asset_id: video_asset.id,
                operation: "ExtractAudio".to_string(),
                params_hash: "pcm_s16le".to_string(),
            }),
            revision: "1".to_string(),
        };

        self.assets.insert(audio_asset_id, audio_asset.clone());

        Ok(audio_asset)
    }
```

- [ ] **Step 4: Run Rust check**

Run:

```bash
cd src-tauri && cargo check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/media/mod.rs src-tauri/src/media/cache.rs src-tauri/src/media/ffmpeg_extract.rs
git commit -m "feat: extract audio from imported video"
```

---

### Task 7: Tauri Media Commands

**Files:**
- Create: `src-tauri/src/media/commands.rs`
- Modify: `src-tauri/src/media/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add Tauri commands**

Create `src-tauri/src/media/commands.rs`:

```rust
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
```

- [ ] **Step 2: Export commands module**

Modify `src-tauri/src/media/mod.rs`:

```rust
pub mod cache;
pub mod commands;
pub mod detect;
pub mod ffmpeg_extract;
pub mod fingerprint;
pub mod metadata;
pub mod types;
```

- [ ] **Step 3: Register managed media state and commands**

Modify `src-tauri/src/lib.rs`:

```rust
mod ui;
mod disk;
mod media;

use std::sync::Mutex;

use media::cache::MediaCache;
use media::commands::{import_media_file, import_video_audio, read_asset_bytes};

fn media_cache_dir(app: &tauri::App) -> std::path::PathBuf {
    app.path()
        .app_cache_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("open-audition-cache"))
        .join("media")
}
```

Modify the builder setup:

```rust
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Run Rust check**

Run:

```bash
cd src-tauri && cargo check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/media/mod.rs src-tauri/src/media/commands.rs
git commit -m "feat: expose media cache tauri commands"
```

---

### Task 8: Frontend Command Types

**Files:**
- Create: `src/api/media.ts`
- Modify: no existing UI files in this task.

- [ ] **Step 1: Add frontend API wrapper**

Create `src/api/media.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";

export type MediaKind =
  | "Audio"
  | "Video"
  | "Xml"
  | "Unknown";

export interface FileFingerprint {
  sizeBytes: number;
  modifiedUnixMs: number | null;
  contentHash: string | null;
}

export interface AudioMetadata {
  durationSeconds: number;
  sampleRateHz: number;
  channelCount: number;
  codec: string | null;
  container: string | null;
}

export interface DerivedFrom {
  sourceAssetId: string;
  operation: string;
  paramsHash: string;
}

export interface MediaAsset {
  id: string;
  originalPath: string | null;
  cachePath: string;
  kind: MediaKind;
  fingerprint: FileFingerprint;
  metadata: AudioMetadata | null;
  derivedFrom: DerivedFrom | null;
  revision: string;
}

export function importMediaFile(filepath: string): Promise<MediaAsset> {
  return invoke<MediaAsset>("import_media_file", { filepath });
}

export function importVideoAudio(filepath: string): Promise<MediaAsset> {
  return invoke<MediaAsset>("import_video_audio", { filepath });
}

export function readAssetBytes(assetId: string): Promise<ArrayBuffer> {
  return invoke<ArrayBuffer>("read_asset_bytes", { assetId });
}
```

- [ ] **Step 2: Run frontend typecheck/build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/api/media.ts
git commit -m "feat: add media cache frontend api"
```

---

### Task 9: Verification

**Files:**
- No new files.

- [ ] **Step 1: Run Rust tests**

Run:

```bash
cd src-tauri && cargo test
```

Expected: PASS.

- [ ] **Step 2: Run Rust check**

Run:

```bash
cd src-tauri && cargo check
```

Expected: PASS.

- [ ] **Step 3: Run frontend build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Commit any verification fixes**

If verification required fixes:

```bash
git add src-tauri/src src/api/media.ts
git commit -m "fix: stabilize media cache implementation"
```

If no fixes were required, do not create an empty commit.

---

## Follow-Up Plan Boundaries

These are intentionally not part of this plan:

- Persistent cache manifest on disk.
- Peak generation and peak cache format.
- AudioBuffer or waveform data transport to the frontend.
- Zustand integration for asset state.
- Project save/load integration with imported media assets.
- Replacing mock media files in `src/data/mockData.ts`.

Those should be planned separately after this Rust-side asset foundation exists.

## Self-Review

- Spec coverage: The plan covers app-managed cache storage for file bytes, audio metadata keyed by asset identity, runtime derived audio assets, video-to-audio extraction, camelCase TypeScript DTO fields, and raw byte IPC responses without base64 overhead.
- Placeholder scan: No task depends on unspecified functions. Content hashing is explicitly deferred and represented as `None`.
- Type consistency: `MediaAsset`, `MediaKind`, `FileFingerprint`, `AudioMetadata`, and `DerivedFrom` are defined once and reused consistently across cache and command layers. Rust keeps snake_case internally and serde exposes camelCase to TypeScript.
