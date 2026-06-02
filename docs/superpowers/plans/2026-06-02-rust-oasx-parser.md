# Rust OASX Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Move `.oasx` multitrack session XML parsing and validation from React/TypeScript to Rust/Tauri.

**Architecture:** Rust owns reading, parsing, schema validation, semantic validation, and writing `.oasx` session files. The frontend receives a camelCase `Multitrack` DTO through Tauri commands and keeps TypeScript XML parsing only as a temporary compatibility layer until UI call sites move to Rust commands. Rust uses `quick-xml` serde structs for XML shape, then transforms into clean frontend-facing DTOs.

**Tech Stack:** Rust 2021, Tauri 2, serde, quick-xml, anyhow, TypeScript API wrappers, existing `src/types/audio.ts` model.

---

## File Structure

- Modify `src-tauri/Cargo.toml`
  - Add direct `quick-xml` dependency with serde support.
- Create `src-tauri/src/session/mod.rs`
  - Session module exports.
- Create `src-tauri/src/session/types.rs`
  - Frontend-facing Rust DTOs with `#[serde(rename_all = "camelCase")]`.
- Create `src-tauri/src/session/xml_model.rs`
  - XML-facing serde structs with `@_attribute` and element names matching `.oasx`.
- Create `src-tauri/src/session/parse.rs`
  - `parse_oasx_str`, XML normalization, XML-to-DTO transforms, and parser tests.
- Create `src-tauri/src/session/validate.rs`
  - Semantic validation matching existing TypeScript behavior.
- Create `src-tauri/src/session/commands.rs`
  - Tauri commands: `parse_oasx`, `open_oasx_file`, and `save_oasx_file`.
- Modify `src-tauri/src/lib.rs`
  - Register `session` module and commands.
- Create `src/types/multitrack.ts`
  - Shared TypeScript DTOs using camelCase fields.
- Create `src/api/session.ts`
  - Tauri command wrappers that import shared DTOs.
- Keep `src/libs/xml/multitrack/*` initially
  - Do not delete the existing TypeScript parser in this plan. Deprecate after UI call sites are migrated and parity tests pass.

---

### Task 1: Add Rust Multitrack DTO Types

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/session/mod.rs`
- Create: `src-tauri/src/session/types.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Add direct XML dependency**

Modify `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
anyhow = "1.0.102"
ffmpeg-next = "8.1.0"
quick-xml = { version = "0.38", features = ["serialize"] }
```

- [x] **Step 2: Add session module export**

Create `src-tauri/src/session/mod.rs`:

```rust
pub mod commands;
pub mod parse;
pub mod types;
pub mod validate;
pub mod xml_model;
```

- [x] **Step 3: Add frontend-facing DTOs**

Create `src-tauri/src/session/types.rs`:

```rust
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
```

- [x] **Step 4: Register module in Rust lib**

Modify `src-tauri/src/lib.rs`:

```rust
mod media;
mod session;
mod ui;
```

- [x] **Step 5: Run check**

Run:

```bash
cd src-tauri && cargo check
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/src/session/mod.rs src-tauri/src/session/types.rs
git commit -m "feat: add rust oasx session types"
```

---

### Task 2: Add XML-Facing Serde Model

**Files:**
- Create: `src-tauri/src/session/xml_model.rs`

- [x] **Step 1: Add XML model structs**

Create `src-tauri/src/session/xml_model.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct XmlMultitrackDocument {
    pub multitrack: XmlMultitrack,
}

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
```

- [x] **Step 2: Run check**

Run:

```bash
cd src-tauri && cargo check
```

Expected: PASS.

- [x] **Step 3: Commit**

```bash
git add src-tauri/src/session/xml_model.rs
git commit -m "feat: add oasx xml serde model"
```

---

### Task 3: Add Rust OASX Parser

**Files:**
- Create: `src-tauri/src/session/parse.rs`

- [x] **Step 1: Add parser and transform code**

Create `src-tauri/src/session/parse.rs`:

```rust
use anyhow::{anyhow, bail, Context, Result};
use quick_xml::de::from_str;

use super::types::*;
use super::xml_model::*;

pub fn parse_oasx_str(raw: &str) -> Result<Multitrack> {
    let normalized = normalize_oasx_xml(raw);
    let document: XmlMultitrackDocument =
        from_str(&normalized).context("failed to parse .oasx XML")?;
    let session = transform_multitrack(document.multitrack)?;
    Ok(session)
}

fn normalize_oasx_xml(raw: &str) -> String {
    raw.lines()
        .filter(|line| !line.trim_start().starts_with("<!DOCTYPE"))
        .collect::<Vec<_>>()
        .join("\n")
}

fn transform_multitrack(xml: XmlMultitrack) -> Result<Multitrack> {
    if xml.version != "1.0" {
        bail!("unsupported multitrack version: {}", xml.version);
    }

    Ok(Multitrack {
        version: xml.version,
        id: required_string(xml.id, "multitrack.id")?,
        name: required_string(xml.name, "multitrack.name")?,
        sample_rate: parse_positive_u32(&xml.sample_rate, "multitrack.sampleRate")?,
        bit_depth: parse_positive_u16(&xml.bit_depth, "multitrack.bitDepth")?,
        created_at: required_string(xml.created_at, "multitrack.createdAt")?,
        updated_at: required_string(xml.updated_at, "multitrack.updatedAt")?,
        duration: parse_non_negative_f64(&xml.duration, "multitrack.duration")?,
        media_assets: xml
            .media
            .unwrap_or_default()
            .media_assets
            .into_iter()
            .map(transform_media_asset)
            .collect::<Result<Vec<_>>>()?,
        tracks: xml
            .tracks
            .unwrap_or_default()
            .tracks
            .into_iter()
            .map(transform_track)
            .collect::<Result<Vec<_>>>()?,
    })
}

fn transform_media_asset(xml: XmlMediaAsset) -> Result<MediaAsset> {
    Ok(MediaAsset {
        id: required_string(xml.id, "mediaAsset.id")?,
        name: required_string(xml.name, "mediaAsset.name")?,
        path: required_string(xml.path, "mediaAsset.path")?,
        duration: parse_non_negative_f64(&xml.duration, "mediaAsset.duration")?,
        sample_rate: parse_positive_u32(&xml.sample_rate, "mediaAsset.sampleRate")?,
        channel_count: parse_positive_u16(&xml.channel_count, "mediaAsset.channelCount")?,
        hash: empty_to_none(xml.hash),
    })
}

fn transform_track(xml: XmlTrack) -> Result<Track> {
    Ok(Track {
        index: parse_u32(&xml.index, "track.index")?,
        name: required_string(xml.name, "track.name")?,
        color: empty_to_none(xml.color),
        height: xml.height.map(|height| parse_positive_f64(&height, "track.height")).transpose()?,
        locked: parse_bool(&xml.locked, "track.locked")?,
        muted: parse_bool(&xml.muted, "track.muted")?,
        solo: parse_bool(&xml.solo, "track.solo")?,
        gain_db: parse_f64(&xml.gain_db, "track.gainDb")?,
        pan: parse_pan(&xml.pan, "track.pan")?,
        clips: xml
            .clips
            .unwrap_or_default()
            .clips
            .into_iter()
            .map(transform_clip)
            .collect::<Result<Vec<_>>>()?,
        effects: xml
            .effects
            .unwrap_or_default()
            .effects
            .into_iter()
            .map(transform_effect)
            .collect::<Result<Vec<_>>>()?,
    })
}

fn transform_clip(xml: XmlClip) -> Result<Clip> {
    Ok(Clip {
        id: required_string(xml.id, "clip.id")?,
        asset_id: required_string(xml.asset_id, "clip.assetId")?,
        name: empty_to_none(xml.name),
        locked: parse_bool(&xml.locked, "clip.locked")?,
        muted: parse_bool(&xml.muted, "clip.muted")?,
        timeline_start: parse_non_negative_f64(&xml.timeline_start, "clip.timelineStart")?,
        source_start: parse_non_negative_f64(&xml.source_start, "clip.sourceStart")?,
        duration: parse_positive_f64(&xml.duration, "clip.duration")?,
        gain_db: parse_f64(&xml.gain_db, "clip.gainDb")?,
        pan: parse_pan(&xml.pan, "clip.pan")?,
        playback_rate: parse_positive_f64(&xml.playback_rate, "clip.playbackRate")?,
        fade_in: xml.fade_in.map(transform_fade).transpose()?,
        fade_out: xml.fade_out.map(transform_fade).transpose()?,
        keyframes: xml
            .keyframes
            .unwrap_or_default()
            .keyframes
            .into_iter()
            .map(transform_keyframe)
            .collect::<Result<Vec<_>>>()?,
        effects: xml
            .effects
            .unwrap_or_default()
            .effects
            .into_iter()
            .map(transform_effect)
            .collect::<Result<Vec<_>>>()?,
    })
}

fn transform_fade(xml: XmlFade) -> Result<Fade> {
    Ok(Fade {
        duration: parse_non_negative_f64(&xml.duration, "fade.duration")?,
        curve: parse_fade_curve(&xml.curve)?,
    })
}

fn transform_keyframe(xml: XmlKeyframe) -> Result<Keyframe> {
    Ok(Keyframe {
        target: parse_keyframe_target(&xml.target)?,
        points: xml
            .points
            .into_iter()
            .map(transform_keyframe_point)
            .collect::<Result<Vec<_>>>()?,
    })
}

fn transform_keyframe_point(xml: XmlKeyframePoint) -> Result<KeyframePoint> {
    validate_linear_keyframe_curve(&xml.curve)?;

    Ok(KeyframePoint {
        time: parse_non_negative_f64(&xml.time, "keyframe.point.time")?,
        value: parse_f64(&xml.value, "keyframe.point.value")?,
    })
}

fn transform_effect(xml: XmlEffect) -> Result<Effect> {
    Ok(Effect {
        index: parse_u32(&xml.index, "effect.index")?,
        kind: parse_effect_type(&xml.kind)?,
        params: xml
            .params
            .into_iter()
            .map(transform_effect_param)
            .collect::<Result<Vec<_>>>()?,
    })
}

fn transform_effect_param(xml: XmlEffectParam) -> Result<EffectParam> {
    let kind = parse_effect_param_type(&xml.kind)?;
    let value = match kind {
        EffectParamType::Number => EffectParamValue::Number(parse_f64(&xml.value, "effect.param")?),
        EffectParamType::String => EffectParamValue::String(xml.value),
        EffectParamType::Boolean => EffectParamValue::Boolean(parse_bool(&xml.value, "effect.param")?),
    };

    Ok(EffectParam {
        name: required_string(xml.name, "effect.param.name")?,
        kind,
        value,
    })
}

fn required_string(value: String, path: &str) -> Result<String> {
    if value.trim().is_empty() {
        bail!("{path} must not be empty");
    }
    Ok(value)
}

fn empty_to_none(value: Option<String>) -> Option<String> {
    value.and_then(|value| if value.trim().is_empty() { None } else { Some(value) })
}

fn parse_bool(value: &str, path: &str) -> Result<bool> {
    match value {
        "true" => Ok(true),
        "false" => Ok(false),
        _ => Err(anyhow!("{path} must be true or false")),
    }
}

fn parse_u32(value: &str, path: &str) -> Result<u32> {
    value.parse::<u32>().map_err(|_| anyhow!("{path} must be an integer"))
}

fn parse_positive_u32(value: &str, path: &str) -> Result<u32> {
    let parsed = parse_u32(value, path)?;
    if parsed == 0 {
        bail!("{path} must be positive");
    }
    Ok(parsed)
}

fn parse_positive_u16(value: &str, path: &str) -> Result<u16> {
    let parsed = value.parse::<u16>().map_err(|_| anyhow!("{path} must be an integer"))?;
    if parsed == 0 {
        bail!("{path} must be positive");
    }
    Ok(parsed)
}

fn parse_f64(value: &str, path: &str) -> Result<f64> {
    value.parse::<f64>().map_err(|_| anyhow!("{path} must be a number"))
}

fn parse_non_negative_f64(value: &str, path: &str) -> Result<f64> {
    let parsed = parse_f64(value, path)?;
    if parsed < 0.0 {
        bail!("{path} must be non-negative");
    }
    Ok(parsed)
}

fn parse_positive_f64(value: &str, path: &str) -> Result<f64> {
    let parsed = parse_f64(value, path)?;
    if parsed <= 0.0 {
        bail!("{path} must be positive");
    }
    Ok(parsed)
}

fn parse_pan(value: &str, path: &str) -> Result<f64> {
    let parsed = parse_f64(value, path)?;
    if !(-1.0..=1.0).contains(&parsed) {
        bail!("{path} must be between -1 and 1");
    }
    Ok(parsed)
}

fn parse_fade_curve(value: &str) -> Result<FadeCurve> {
    match value {
        "linear" => Ok(FadeCurve::Linear),
        "equalPower" => Ok(FadeCurve::EqualPower),
        "exponential" => Ok(FadeCurve::Exponential),
        "logarithmic" => Ok(FadeCurve::Logarithmic),
        _ => Err(anyhow!("unknown fade curve: {value}")),
    }
}

fn parse_keyframe_target(value: &str) -> Result<KeyframeTarget> {
    match value {
        "gainDb" => Ok(KeyframeTarget::GainDb),
        "pan" => Ok(KeyframeTarget::Pan),
        _ => Err(anyhow!("unknown keyframe target: {value}")),
    }
}

fn validate_linear_keyframe_curve(value: &str) -> Result<()> {
    if value != "linear" {
        bail!("keyframe curve must be linear");
    }

    Ok(())
}

fn parse_effect_type(value: &str) -> Result<EffectType> {
    match value {
        "gain" => Ok(EffectType::Gain),
        "eq" => Ok(EffectType::Eq),
        "filter" => Ok(EffectType::Filter),
        "reverb" => Ok(EffectType::Reverb),
        "delay" => Ok(EffectType::Delay),
        "pitchShift" => Ok(EffectType::PitchShift),
        "timeStretch" => Ok(EffectType::TimeStretch),
        "noiseReduction" => Ok(EffectType::NoiseReduction),
        "normalize" => Ok(EffectType::Normalize),
        _ => Err(anyhow!("unknown effect type: {value}")),
    }
}

fn parse_effect_param_type(value: &str) -> Result<EffectParamType> {
    match value {
        "number" => Ok(EffectParamType::Number),
        "string" => Ok(EffectParamType::String),
        "boolean" => Ok(EffectParamType::Boolean),
        _ => Err(anyhow!("unknown effect param type: {value}")),
    }
}

#[cfg(test)]
mod tests {
    use super::parse_oasx_str;
    use crate::session::types::{EffectParamType, EffectType, FadeCurve, EffectParamValue};

    const VALID_OASX: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE multitrack>
<multitrack version="1.0" id="session-main-sfx" name="Main SFX" sampleRate="48000" bitDepth="24" createdAt="2026-05-18T10:15:00+09:00" updatedAt="2026-05-18T11:20:00+09:00" duration="92.5">
  <media>
    <mediaAsset id="asset-thunder" name="Thunder Roll" path="../media/thunder.wav" duration="31.25" sampleRate="48000" channelCount="2" hash="sha256:abc123" />
  </media>
  <tracks>
    <track index="0" name="SFX" color="#5B8DEF" height="1" locked="false" muted="false" solo="false" gainDb="-3" pan="0">
      <clips>
        <clip id="clip-thunder-1" assetId="asset-thunder" name="Thunder Hit" locked="false" muted="false" timelineStart="12.5" sourceStart="2" duration="8.25" gainDb="-1.5" pan="0" playbackRate="1">
          <fadeIn duration="0.75" curve="equalPower" />
          <keyframes>
            <keyframe target="gainDb">
              <point time="0" value="-8" curve="linear" />
            </keyframe>
          </keyframes>
          <effects>
            <effect index="0" type="filter">
              <param name="frequencyHz" type="number">8000</param>
            </effect>
          </effects>
        </clip>
      </clips>
    </track>
  </tracks>
</multitrack>"#;

    #[test]
    fn parses_valid_oasx() {
        let session = parse_oasx_str(VALID_OASX).expect("session should parse");

        assert_eq!(session.version, "1.0");
        assert_eq!(session.id, "session-main-sfx");
        assert_eq!(session.media_assets.len(), 1);
        assert_eq!(session.tracks.len(), 1);
        assert_eq!(session.tracks[0].clips.len(), 1);
        assert_eq!(session.tracks[0].clips[0].fade_in.as_ref().unwrap().curve, FadeCurve::EqualPower);
        assert_eq!(session.tracks[0].clips[0].effects[0].kind, EffectType::Filter);
        assert_eq!(session.tracks[0].clips[0].effects[0].params[0].kind, EffectParamType::Number);
        assert_eq!(session.tracks[0].clips[0].effects[0].params[0].value, EffectParamValue::Number(8000.0));
    }

    #[test]
    fn rejects_invalid_version() {
        let xml = VALID_OASX.replace("version=\"1.0\"", "version=\"2.0\"");

        let error = parse_oasx_str(&xml).expect_err("unsupported version should fail");

        assert!(error.to_string().contains("unsupported multitrack version"));
    }
}
```

- [x] **Step 2: Run parser tests**

Run:

```bash
cd src-tauri && cargo test session::parse
```

Expected: PASS.

- [x] **Step 3: Commit**

```bash
git add src-tauri/src/session/parse.rs
git commit -m "feat: parse oasx sessions in rust"
```

---

### Task 4: Add Semantic Validation

**Files:**
- Create: `src-tauri/src/session/validate.rs`
- Modify: `src-tauri/src/session/parse.rs`

- [x] **Step 1: Add semantic validator**

Create `src-tauri/src/session/validate.rs`:

```rust
use std::collections::HashSet;

use super::types::{Effect, Multitrack, MultitrackSemanticIssue};

pub fn validate_multitrack_semantic(multitrack: &Multitrack) -> Vec<MultitrackSemanticIssue> {
    let mut issues = Vec::new();
    let media_asset_ids = multitrack
        .media_assets
        .iter()
        .map(|asset| asset.id.as_str())
        .collect::<HashSet<_>>();

    issues.extend(validate_contiguous_indexes(
        multitrack.tracks.iter().map(|track| track.index).collect(),
        "tracks",
        "track",
    ));

    for (track_position, track) in multitrack.tracks.iter().enumerate() {
        let track_path = format!("tracks[{track_position}]");
        issues.extend(validate_effect_indexes(&track.effects, &format!("{track_path}.effects")));

        for (clip_position, clip) in track.clips.iter().enumerate() {
            let clip_path = format!("{track_path}.clips[{clip_position}]");

            if !media_asset_ids.contains(clip.asset_id.as_str()) {
                issues.push(MultitrackSemanticIssue {
                    path: format!("{clip_path}.assetId"),
                    message: format!("Unknown media asset id: {}", clip.asset_id),
                });
            }

            issues.extend(validate_effect_indexes(&clip.effects, &format!("{clip_path}.effects")));

            let fade_in_duration = clip.fade_in.as_ref().map(|fade| fade.duration).unwrap_or(0.0);
            let fade_out_duration = clip.fade_out.as_ref().map(|fade| fade.duration).unwrap_or(0.0);

            if fade_in_duration + fade_out_duration > clip.duration {
                issues.push(MultitrackSemanticIssue {
                    path: clip_path,
                    message: "Fade-in and fade-out durations must not exceed clip duration".to_string(),
                });
            }
        }
    }

    issues
}

fn validate_effect_indexes(effects: &[Effect], path: &str) -> Vec<MultitrackSemanticIssue> {
    validate_contiguous_indexes(
        effects.iter().map(|effect| effect.index).collect(),
        path,
        "effect",
    )
}

fn validate_contiguous_indexes(
    indexes: Vec<u32>,
    path: &str,
    label: &str,
) -> Vec<MultitrackSemanticIssue> {
    let mut issues = Vec::new();
    let mut seen_indexes = HashSet::new();

    for index in indexes {
        if seen_indexes.contains(&index) {
            issues.push(MultitrackSemanticIssue {
                path: path.to_string(),
                message: format!("Duplicate {label} index: {index}"),
            });
        }

        seen_indexes.insert(index);
    }

    let mut sorted_indexes = seen_indexes.into_iter().collect::<Vec<_>>();
    sorted_indexes.sort_unstable();

    for (expected_index, actual_index) in sorted_indexes.into_iter().enumerate() {
        if actual_index != expected_index as u32 {
            issues.push(MultitrackSemanticIssue {
                path: path.to_string(),
                message: format!("{label} indexes must be contiguous from 0"),
            });
            break;
        }
    }

    issues
}
```

- [x] **Step 2: Wire semantic validation into parser**

Modify `src-tauri/src/session/parse.rs`:

```rust
use super::validate::validate_multitrack_semantic;
```

Modify `parse_oasx_str`:

```rust
pub fn parse_oasx_str(raw: &str) -> Result<Multitrack> {
    let normalized = normalize_oasx_xml(raw);
    let document: XmlMultitrackDocument =
        from_str(&normalized).context("failed to parse .oasx XML")?;
    let session = transform_multitrack(document.multitrack)?;
    let issues = validate_multitrack_semantic(&session);

    if !issues.is_empty() {
        bail!("invalid .oasx semantic: {}", serde_json::to_string(&issues)?);
    }

    Ok(session)
}
```

- [x] **Step 3: Add semantic tests**

Append to `src-tauri/src/session/parse.rs` tests:

```rust
    #[test]
    fn rejects_unknown_clip_asset_id() {
        let xml = VALID_OASX.replace("assetId=\"asset-thunder\"", "assetId=\"asset-missing\"");

        let error = parse_oasx_str(&xml).expect_err("unknown asset should fail");

        assert!(error.to_string().contains("Unknown media asset id"));
    }

    #[test]
    fn rejects_fades_longer_than_clip() {
        let xml = VALID_OASX.replace(
            "<fadeIn duration=\"0.75\" curve=\"equalPower\" />",
            "<fadeIn duration=\"9\" curve=\"equalPower\" /><fadeOut duration=\"1\" curve=\"linear\" />",
        );

        let error = parse_oasx_str(&xml).expect_err("invalid fade duration should fail");

        assert!(error.to_string().contains("Fade-in and fade-out durations"));
    }
```

- [x] **Step 4: Run semantic tests**

Run:

```bash
cd src-tauri && cargo test session::parse
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src-tauri/src/session/parse.rs src-tauri/src/session/validate.rs
git commit -m "feat: validate oasx session semantics"
```

---

### Task 5: Add Tauri Session Commands

**Files:**
- Create: `src-tauri/src/session/commands.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Add commands**

Create `src-tauri/src/session/commands.rs`:

```rust
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
        return Err(format!("unsupported multitrack version: {}", parsed.version));
    }

    std::fs::write(Path::new(&filepath), raw).map_err(|error| error.to_string())
}
```

- [x] **Step 2: Register commands**

Modify `src-tauri/src/lib.rs` imports:

```rust
use session::commands::{open_oasx_file, parse_oasx, save_oasx_file};
```

Add to `tauri::generate_handler!`:

```rust
            parse_oasx,
            open_oasx_file,
            save_oasx_file,
```

- [x] **Step 3: Run check**

Run:

```bash
cd src-tauri && cargo check
```

Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/session/commands.rs
git commit -m "feat: expose oasx tauri commands"
```

---

### Task 6: Add Shared Frontend Types And Session API

**Files:**
- Create: `src/types/multitrack.ts`
- Create: `src/api/session.ts`
- Create: `src/types/multitrack.test.ts`

- [x] **Step 1: Add shared TypeScript DTOs**

Create `src/types/multitrack.ts`:

```ts
export type FadeCurve = "Linear" | "EqualPower" | "Exponential" | "Logarithmic";
export type KeyframeTarget = "GainDb" | "Pan";
export type EffectType =
  | "Gain"
  | "Eq"
  | "Filter"
  | "Reverb"
  | "Delay"
  | "PitchShift"
  | "TimeStretch"
  | "NoiseReduction"
  | "Normalize";
export type EffectParamType = "Number" | "String" | "Boolean";

export interface Multitrack {
  version: string;
  id: string;
  name: string;
  sampleRate: number;
  bitDepth: number;
  createdAt: string;
  updatedAt: string;
  duration: number;
  mediaAssets: MediaAsset[];
  tracks: Track[];
}

export interface MediaAsset {
  id: string;
  name: string;
  path: string;
  duration: number;
  sampleRate: number;
  channelCount: number;
  hash: string | null;
}

export interface Track {
  index: number;
  name: string;
  color: string | null;
  height: number | null;
  locked: boolean;
  muted: boolean;
  solo: boolean;
  gainDb: number;
  pan: number;
  clips: Clip[];
  effects: Effect[];
}

export interface Clip {
  id: string;
  assetId: string;
  name: string | null;
  locked: boolean;
  muted: boolean;
  timelineStart: number;
  sourceStart: number;
  duration: number;
  gainDb: number;
  pan: number;
  playbackRate: number;
  fadeIn: Fade | null;
  fadeOut: Fade | null;
  keyframes: Keyframe[];
  effects: Effect[];
}

export interface Fade {
  duration: number;
  curve: FadeCurve;
}

export interface Keyframe {
  target: KeyframeTarget;
  points: KeyframePoint[];
}

export interface KeyframePoint {
  time: number;
  value: number;
}

export interface Effect {
  index: number;
  kind: EffectType;
  params: EffectParam[];
}

export interface EffectParam {
  name: string;
  kind: EffectParamType;
  value: number | string | boolean;
}
```

- [x] **Step 2: Add TypeScript API wrapper**

Create `src/api/session.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import type { Multitrack } from "../types/multitrack";

export function parseOasx(raw: string): Promise<Multitrack> {
  return invoke<Multitrack>("parse_oasx", { raw });
}

export function openOasxFile(filepath: string): Promise<Multitrack> {
  return invoke<Multitrack>("open_oasx_file", { filepath });
}

export function saveOasxFile(filepath: string, raw: string): Promise<void> {
  return invoke<void>("save_oasx_file", { filepath, raw });
}
```

- [x] **Step 3: Add static DTO type smoke test**

Create `src/types/multitrack.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Multitrack } from "./multitrack";

describe("Multitrack DTO", () => {
  it("uses camelCase frontend fields", () => {
    const session: Multitrack = {
      version: "1.0",
      id: "session-main",
      name: "Main",
      sampleRate: 48000,
      bitDepth: 24,
      createdAt: "2026-05-18T10:15:00+09:00",
      updatedAt: "2026-05-18T11:20:00+09:00",
      duration: 10,
      mediaAssets: [],
      tracks: [],
    };

    expect(session.sampleRate).toBe(48000);
    expect(session.mediaAssets).toEqual([]);
  });
});
```

- [x] **Step 4: Run frontend tests**

Run:

```bash
pnpm test -- src/types/multitrack.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/types/multitrack.ts src/types/multitrack.test.ts src/api/session.ts
git commit -m "feat: add oasx frontend api"
```

---

### Task 7: Migration Notes And Verification

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/multitrack-session-xml.md`

- [x] **Step 1: Add convention to AGENTS**

Add under `### Rust / Tauri API` in `AGENTS.md`:

```markdown
- Parse, validate, open, and save `.oasx` XML on the Rust side. React should call Tauri session commands and should not parse session XML directly except in temporary migration tests.
```

- [x] **Step 2: Add Rust parser note to docs**

Add near the top of `docs/multitrack-session-xml.md`:

```markdown
Open Audition parses and validates `.oasx` files on the Rust/Tauri side. Frontend code should consume the parsed camelCase session DTO returned by Tauri commands instead of parsing XML directly.
```

- [x] **Step 3: Run full verification**

Run:

```bash
cd src-tauri && cargo test
cd src-tauri && cargo check
pnpm test -- src/types/multitrack.test.ts
pnpm build
```

Expected:

- Rust tests pass.
- Rust check passes.
- TypeScript tests pass.
- Frontend build passes.

- [x] **Step 4: Commit**

```bash
git add AGENTS.md docs/multitrack-session-xml.md
git commit -m "docs: document rust oasx parsing boundary"
```

---

## Follow-Up Plan Boundaries

These are intentionally outside this plan:

- Deleting `src/libs/xml/multitrack/*`.
- Replacing every UI call site with `openOasxFile`.
- XML serialization from DTO structs. This plan validates and saves raw XML; a future plan should add a Rust serializer once editing real sessions is wired.
- Project-level `.oaproj` file parsing.
- Media relinking and cache reconciliation from paths inside `.oasx`.

## Self-Review

- Spec coverage: The plan moves `.oasx` parsing and validation to Rust, adds Tauri commands, uses camelCase frontend DTOs, and preserves the current XML schema shape.
- Placeholder scan: Every task names concrete files, commands, expected results, and code to add.
- Type consistency: Rust `Multitrack` mirrors TypeScript `Multitrack`; Rust enum serialization returns PascalCase values matching the existing TypeScript union conventions.
