use anyhow::{anyhow, bail, Context, Result};
use quick_xml::de::from_str;

use super::types::*;
use super::validate::validate_multitrack_semantic;
use super::xml_model::*;

pub fn parse_oasx_str(raw: &str) -> Result<Multitrack> {
    let normalized = normalize_oasx_xml(raw);
    let multitrack: XmlMultitrack = from_str(&normalized).context("failed to parse .oasx XML")?;
    let session = transform_multitrack(multitrack)?;
    let issues = validate_multitrack_semantic(&session);

    if !issues.is_empty() {
        bail!(
            "invalid .oasx semantic: {}",
            serde_json::to_string(&issues)?
        );
    }

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
        height: xml
            .height
            .map(|height| parse_positive_f64(&height, "track.height"))
            .transpose()?,
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
        EffectParamType::Boolean => {
            EffectParamValue::Boolean(parse_bool(&xml.value, "effect.param")?)
        }
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
    value.and_then(|value| {
        if value.trim().is_empty() {
            None
        } else {
            Some(value)
        }
    })
}

fn parse_bool(value: &str, path: &str) -> Result<bool> {
    match value {
        "true" => Ok(true),
        "false" => Ok(false),
        _ => Err(anyhow!("{path} must be true or false")),
    }
}

fn parse_u32(value: &str, path: &str) -> Result<u32> {
    value
        .parse::<u32>()
        .map_err(|_| anyhow!("{path} must be an integer"))
}

fn parse_positive_u32(value: &str, path: &str) -> Result<u32> {
    let parsed = parse_u32(value, path)?;
    if parsed == 0 {
        bail!("{path} must be positive");
    }
    Ok(parsed)
}

fn parse_positive_u16(value: &str, path: &str) -> Result<u16> {
    let parsed = value
        .parse::<u16>()
        .map_err(|_| anyhow!("{path} must be an integer"))?;
    if parsed == 0 {
        bail!("{path} must be positive");
    }
    Ok(parsed)
}

fn parse_f64(value: &str, path: &str) -> Result<f64> {
    value
        .parse::<f64>()
        .map_err(|_| anyhow!("{path} must be a number"))
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
    use crate::session::types::{EffectParamType, EffectParamValue, EffectType, FadeCurve};

    const VALID_OASX: &str = r##"<?xml version="1.0" encoding="UTF-8"?>
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
</multitrack>"##;

    #[test]
    fn parses_valid_oasx() {
        let session = parse_oasx_str(VALID_OASX).expect("session should parse");

        assert_eq!(session.version, "1.0");
        assert_eq!(session.id, "session-main-sfx");
        assert_eq!(session.media_assets.len(), 1);
        assert_eq!(session.tracks.len(), 1);
        assert_eq!(session.tracks[0].clips.len(), 1);
        assert_eq!(
            session.tracks[0].clips[0].fade_in.as_ref().unwrap().curve,
            FadeCurve::EqualPower
        );
        assert_eq!(
            session.tracks[0].clips[0].effects[0].kind,
            EffectType::Filter
        );
        assert_eq!(
            session.tracks[0].clips[0].effects[0].params[0].kind,
            EffectParamType::Number
        );
        assert_eq!(
            session.tracks[0].clips[0].effects[0].params[0].value,
            EffectParamValue::Number(8000.0)
        );
    }

    #[test]
    fn rejects_invalid_version() {
        let xml = VALID_OASX.replace("version=\"1.0\"", "version=\"2.0\"");

        let error = parse_oasx_str(&xml).expect_err("unsupported version should fail");

        assert!(error.to_string().contains("unsupported multitrack version"));
    }

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
}
