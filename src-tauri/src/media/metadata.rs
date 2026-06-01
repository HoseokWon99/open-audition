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
