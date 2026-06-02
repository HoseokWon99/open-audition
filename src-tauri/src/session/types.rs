use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Multitrack {
    pub version: String,
    pub id: String,
    pub name: String,
    pub sample_rate: u32,
    pub bit_depth: u16,
    pub created_at: String,
    pub updated_at: String,
    pub duration: f64,
    pub media_assets: Vec<MediaAsset>,
    pub tracks: Vec<Track>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaAsset {
    pub id: String,
    pub name: String,
    pub path: String,
    pub duration: f64,
    pub sample_rate: u32,
    pub channel_count: u16,
    pub hash: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub index: u32,
    pub name: String,
    pub color: Option<String>,
    pub height: Option<f64>,
    pub locked: bool,
    pub muted: bool,
    pub solo: bool,
    pub gain_db: f64,
    pub pan: f64,
    pub clips: Vec<Clip>,
    pub effects: Vec<Effect>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Clip {
    pub id: String,
    pub asset_id: String,
    pub name: Option<String>,
    pub locked: bool,
    pub muted: bool,
    pub timeline_start: f64,
    pub source_start: f64,
    pub duration: f64,
    pub gain_db: f64,
    pub pan: f64,
    pub playback_rate: f64,
    pub fade_in: Option<Fade>,
    pub fade_out: Option<Fade>,
    pub keyframes: Vec<Keyframe>,
    pub effects: Vec<Effect>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fade {
    pub duration: f64,
    pub curve: FadeCurve,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Keyframe {
    pub target: KeyframeTarget,
    pub points: Vec<KeyframePoint>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyframePoint {
    pub time: f64,
    pub value: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Effect {
    pub index: u32,
    pub kind: EffectType,
    pub params: Vec<EffectParam>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectParam {
    pub name: String,
    pub kind: EffectParamType,
    pub value: EffectParamValue,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum FadeCurve {
    Linear,
    EqualPower,
    Exponential,
    Logarithmic,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum KeyframeTarget {
    GainDb,
    Pan,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum EffectType {
    Gain,
    Eq,
    Filter,
    Reverb,
    Delay,
    PitchShift,
    TimeStretch,
    NoiseReduction,
    Normalize,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum EffectParamType {
    Number,
    String,
    Boolean,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EffectParamValue {
    Number(f64),
    String(String),
    Boolean(bool),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MultitrackSemanticIssue {
    pub path: String,
    pub message: String,
}
