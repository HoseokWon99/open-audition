use anyhow::{Context, Result};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use super::detect::{detect_media_kind, extension_suffix};
use super::ffmpeg_extract::extract_audio_with_ffmpeg;
use super::fingerprint::fingerprint_file;
use super::metadata::probe_audio_metadata;
use super::peaks::{build_peak_from_audio_file, encode_peak};
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
        let cache_path =
            self.root_dir
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

        self.by_original_path
            .insert(path.to_path_buf(), asset_id.clone());
        self.assets.insert(asset_id, asset.clone());

        Ok(asset)
    }

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

    #[allow(dead_code)]
    pub fn create_derived_audio(
        &mut self,
        source_asset_id: &str,
        operation: &str,
        params_hash: &str,
        bytes: &[u8],
    ) -> Result<MediaAsset> {
        let asset_id = new_asset_id();
        let cache_path = self
            .root_dir
            .join("derived")
            .join(format!("{asset_id}.wav"));

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

    #[allow(dead_code)]
    pub fn find_by_original_path(&self, path: &Path) -> Option<&MediaAsset> {
        self.by_original_path
            .get(path)
            .and_then(|asset_id| self.assets.get(asset_id))
    }

    pub fn peak_path(&self, asset_id: &str, revision: &str, resolution: u32) -> PathBuf {
        self.root_dir
            .join("peaks")
            .join(format!("{asset_id}-{revision}-{resolution}.oapk"))
    }

    pub fn ensure_peak_cache(&self, asset_id: &str, resolution: u32) -> Result<PathBuf> {
        let asset = self
            .get_asset(asset_id)
            .ok_or_else(|| anyhow::anyhow!("asset not found: {asset_id}"))?;
        let path = self.peak_path(asset_id, &asset.revision, resolution);

        if path.exists() {
            return Ok(path);
        }

        let peak = build_peak_from_audio_file(&asset.cache_path, resolution)?;
        let bytes = encode_peak(&peak);
        fs::write(&path, bytes)?;

        Ok(path)
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

        assert_eq!(path, root.join("peaks").join("asset-1-3-2048.oapk"));

        fs::remove_dir_all(root).expect("cache should be removed");
    }
}
