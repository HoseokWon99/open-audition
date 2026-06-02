use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct XmlMultitrack {
    #[serde(rename = "@version")]
    pub version: String,
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@name")]
    pub name: String,
    #[serde(rename = "@sampleRate")]
    pub sample_rate: String,
    #[serde(rename = "@bitDepth")]
    pub bit_depth: String,
    #[serde(rename = "@createdAt")]
    pub created_at: String,
    #[serde(rename = "@updatedAt")]
    pub updated_at: String,
    #[serde(rename = "@duration")]
    pub duration: String,
    pub media: Option<XmlMediaContainer>,
    pub tracks: Option<XmlTracksContainer>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct XmlMediaContainer {
    #[serde(rename = "mediaAsset", default)]
    pub media_assets: Vec<XmlMediaAsset>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct XmlMediaAsset {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@name")]
    pub name: String,
    #[serde(rename = "@path")]
    pub path: String,
    #[serde(rename = "@duration")]
    pub duration: String,
    #[serde(rename = "@sampleRate")]
    pub sample_rate: String,
    #[serde(rename = "@channelCount")]
    pub channel_count: String,
    #[serde(rename = "@hash")]
    pub hash: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct XmlTracksContainer {
    #[serde(rename = "track", default)]
    pub tracks: Vec<XmlTrack>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct XmlTrack {
    #[serde(rename = "@index")]
    pub index: String,
    #[serde(rename = "@name")]
    pub name: String,
    #[serde(rename = "@color")]
    pub color: Option<String>,
    #[serde(rename = "@height")]
    pub height: Option<String>,
    #[serde(rename = "@locked")]
    pub locked: String,
    #[serde(rename = "@muted")]
    pub muted: String,
    #[serde(rename = "@solo")]
    pub solo: String,
    #[serde(rename = "@gainDb")]
    pub gain_db: String,
    #[serde(rename = "@pan")]
    pub pan: String,
    pub clips: Option<XmlClipsContainer>,
    pub effects: Option<XmlEffectsContainer>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct XmlClipsContainer {
    #[serde(rename = "clip", default)]
    pub clips: Vec<XmlClip>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct XmlClip {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@assetId")]
    pub asset_id: String,
    #[serde(rename = "@name")]
    pub name: Option<String>,
    #[serde(rename = "@locked")]
    pub locked: String,
    #[serde(rename = "@muted")]
    pub muted: String,
    #[serde(rename = "@timelineStart")]
    pub timeline_start: String,
    #[serde(rename = "@sourceStart")]
    pub source_start: String,
    #[serde(rename = "@duration")]
    pub duration: String,
    #[serde(rename = "@gainDb")]
    pub gain_db: String,
    #[serde(rename = "@pan")]
    pub pan: String,
    #[serde(rename = "@playbackRate")]
    pub playback_rate: String,
    #[serde(rename = "fadeIn")]
    pub fade_in: Option<XmlFade>,
    #[serde(rename = "fadeOut")]
    pub fade_out: Option<XmlFade>,
    pub keyframes: Option<XmlKeyframesContainer>,
    pub effects: Option<XmlEffectsContainer>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct XmlFade {
    #[serde(rename = "@duration")]
    pub duration: String,
    #[serde(rename = "@curve")]
    pub curve: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct XmlKeyframesContainer {
    #[serde(rename = "keyframe", default)]
    pub keyframes: Vec<XmlKeyframe>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct XmlKeyframe {
    #[serde(rename = "@target")]
    pub target: String,
    #[serde(rename = "point", default)]
    pub points: Vec<XmlKeyframePoint>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct XmlKeyframePoint {
    #[serde(rename = "@time")]
    pub time: String,
    #[serde(rename = "@value")]
    pub value: String,
    #[serde(rename = "@curve")]
    pub curve: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct XmlEffectsContainer {
    #[serde(rename = "effect", default)]
    pub effects: Vec<XmlEffect>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct XmlEffect {
    #[serde(rename = "@index")]
    pub index: String,
    #[serde(rename = "@type")]
    pub kind: String,
    #[serde(rename = "param", default)]
    pub params: Vec<XmlEffectParam>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct XmlEffectParam {
    #[serde(rename = "@name")]
    pub name: String,
    #[serde(rename = "@type")]
    pub kind: String,
    #[serde(rename = "$text")]
    pub value: String,
}
