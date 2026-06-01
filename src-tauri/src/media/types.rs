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
