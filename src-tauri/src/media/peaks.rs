use anyhow::{anyhow, bail, Result};
use ffmpeg_next as ffmpeg;
use std::path::Path;

const OAPK_MAGIC: &[u8; 4] = b"OAPK";
const OAPK_VERSION: u16 = 1;
const HEADER_LEN: usize = 32;

#[derive(Debug, Clone, PartialEq)]
pub struct Peak {
    pub sample_rate_hz: u32,
    pub channel_count: u16,
    pub samples_per_peak: u32,
    pub source_frame_count: u64,
    pub frames: Vec<PeakFrame>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PeakFrame {
    pub min: f32,
    pub max: f32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct DecodedAudio {
    pub sample_rate_hz: u32,
    pub channel_count: u16,
    pub samples: Vec<f32>,
}

pub fn encode_peak(peak: &Peak) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(HEADER_LEN + peak.frames.len() * 8);
    bytes.extend_from_slice(OAPK_MAGIC);
    bytes.extend_from_slice(&OAPK_VERSION.to_le_bytes());
    bytes.extend_from_slice(&peak.channel_count.to_le_bytes());
    bytes.extend_from_slice(&peak.sample_rate_hz.to_le_bytes());
    bytes.extend_from_slice(&peak.samples_per_peak.to_le_bytes());
    bytes.extend_from_slice(&peak.source_frame_count.to_le_bytes());
    bytes.extend_from_slice(&(peak.frames.len() as u64).to_le_bytes());

    for frame in &peak.frames {
        bytes.extend_from_slice(&frame.min.to_le_bytes());
        bytes.extend_from_slice(&frame.max.to_le_bytes());
    }

    bytes
}

#[allow(dead_code)]
pub fn decode_peak(bytes: &[u8]) -> Result<Peak> {
    if bytes.len() < HEADER_LEN {
        bail!("peak cache is too small");
    }

    if &bytes[0..4] != OAPK_MAGIC {
        bail!("invalid peak cache magic");
    }

    let version = u16::from_le_bytes(read_array(bytes, 4)?);
    if version != OAPK_VERSION {
        bail!("unsupported peak cache version: {version}");
    }

    let channel_count = u16::from_le_bytes(read_array(bytes, 6)?);
    let sample_rate_hz = u32::from_le_bytes(read_array(bytes, 8)?);
    let samples_per_peak = u32::from_le_bytes(read_array(bytes, 12)?);
    let source_frame_count = u64::from_le_bytes(read_array(bytes, 16)?);
    let peak_frame_count = u64::from_le_bytes(read_array(bytes, 24)?) as usize;
    let expected_len = HEADER_LEN + peak_frame_count * 8;

    if bytes.len() != expected_len {
        bail!("peak cache length mismatch");
    }

    let mut frames = Vec::with_capacity(peak_frame_count);
    let mut offset = HEADER_LEN;

    for _ in 0..peak_frame_count {
        let min = f32::from_le_bytes(read_array(bytes, offset)?);
        let max = f32::from_le_bytes(read_array(bytes, offset + 4)?);
        frames.push(PeakFrame { min, max });
        offset += 8;
    }

    Ok(Peak {
        sample_rate_hz,
        channel_count,
        samples_per_peak,
        source_frame_count,
        frames,
    })
}

pub fn build_peak_from_interleaved_f32(
    samples: &[f32],
    sample_rate_hz: u32,
    channel_count: u16,
    samples_per_peak: u32,
) -> Result<Peak> {
    if channel_count == 0 {
        bail!("channel count must be greater than zero");
    }

    if samples_per_peak == 0 {
        bail!("samples per peak must be greater than zero");
    }

    let channel_count_usize = channel_count as usize;
    if samples.len() % channel_count_usize != 0 {
        bail!("interleaved samples length is not divisible by channel count");
    }

    let source_frame_count = (samples.len() / channel_count_usize) as u64;
    let bucket_size = samples_per_peak as usize;
    let bucket_count = source_frame_count.div_ceil(samples_per_peak as u64) as usize;
    let mut frames = Vec::with_capacity(bucket_count * channel_count_usize);

    for bucket_index in 0..bucket_count {
        let frame_start = bucket_index * bucket_size;
        let frame_end = ((bucket_index + 1) * bucket_size).min(source_frame_count as usize);

        for channel_index in 0..channel_count_usize {
            let mut min = 0.0_f32;
            let mut max = 0.0_f32;

            for frame_index in frame_start..frame_end {
                let sample =
                    samples[frame_index * channel_count_usize + channel_index].clamp(-1.0, 1.0);
                min = min.min(sample);
                max = max.max(sample);
            }

            frames.push(PeakFrame { min, max });
        }
    }

    Ok(Peak {
        sample_rate_hz,
        channel_count,
        samples_per_peak,
        source_frame_count,
        frames,
    })
}

pub fn build_peak_from_audio_file(path: &Path, samples_per_peak: u32) -> Result<Peak> {
    let decoded = decode_audio_file_to_interleaved_f32(path)?;

    build_peak_from_interleaved_f32(
        &decoded.samples,
        decoded.sample_rate_hz,
        decoded.channel_count,
        samples_per_peak,
    )
}

pub fn decode_audio_file_to_interleaved_f32(path: &Path) -> Result<DecodedAudio> {
    ffmpeg::init()?;

    let mut input = ffmpeg::format::input(path)?;
    let stream = input
        .streams()
        .best(ffmpeg::media::Type::Audio)
        .ok_or_else(|| anyhow!("media file has no audio stream: {}", path.display()))?;
    let stream_index = stream.index();
    let codec_context = ffmpeg::codec::context::Context::from_parameters(stream.parameters())?;
    let mut decoder = codec_context.decoder().audio()?;
    let sample_rate_hz = decoder.rate();
    let channel_count = decoder.channels();
    let channel_layout = if decoder.channel_layout().is_empty() {
        ffmpeg::ChannelLayout::default(channel_count.into())
    } else {
        decoder.channel_layout()
    };
    let mut resampler = ffmpeg::software::resampling::Context::get(
        decoder.format(),
        channel_layout,
        sample_rate_hz,
        ffmpeg::format::Sample::F32(ffmpeg::format::sample::Type::Packed),
        channel_layout,
        sample_rate_hz,
    )?;
    let mut samples = Vec::new();

    for (packet_stream, packet) in input.packets() {
        if packet_stream.index() != stream_index {
            continue;
        }

        decoder.send_packet(&packet)?;
        receive_decoded_samples(&mut decoder, &mut resampler, &mut samples)?;
    }

    decoder.send_eof()?;
    receive_decoded_samples(&mut decoder, &mut resampler, &mut samples)?;

    Ok(DecodedAudio {
        sample_rate_hz,
        channel_count,
        samples,
    })
}

fn receive_decoded_samples(
    decoder: &mut ffmpeg::decoder::Audio,
    resampler: &mut ffmpeg::software::resampling::Context,
    samples: &mut Vec<f32>,
) -> Result<()> {
    let mut decoded = ffmpeg::util::frame::Audio::empty();

    while decoder.receive_frame(&mut decoded).is_ok() {
        let mut converted = ffmpeg::util::frame::Audio::empty();
        resampler.run(&decoded, &mut converted)?;
        append_packed_f32_samples(&converted, samples)?;
    }

    Ok(())
}

fn append_packed_f32_samples(
    frame: &ffmpeg::util::frame::Audio,
    samples: &mut Vec<f32>,
) -> Result<()> {
    if frame.format() != ffmpeg::format::Sample::F32(ffmpeg::format::sample::Type::Packed) {
        bail!("unsupported converted sample format: {:?}", frame.format());
    }

    let sample_count = frame.samples() * frame.channels() as usize;
    let byte_count = sample_count * std::mem::size_of::<f32>();
    let data = frame.data(0);
    let payload = data
        .get(..byte_count)
        .ok_or_else(|| anyhow!("converted audio frame ended unexpectedly"))?;

    for chunk in payload.chunks_exact(4) {
        samples.push(f32::from_ne_bytes(chunk.try_into()?));
    }

    Ok(())
}

#[allow(dead_code)]
fn read_array<const N: usize>(bytes: &[u8], offset: usize) -> Result<[u8; N]> {
    bytes
        .get(offset..offset + N)
        .ok_or_else(|| anyhow!("peak cache ended unexpectedly"))?
        .try_into()
        .map_err(|_| anyhow!("failed to read peak cache bytes"))
}

#[cfg(test)]
mod tests {
    use super::{decode_peak, encode_peak, Peak, PeakFrame};

    #[test]
    fn round_trips_peak_binary_format() {
        let peak = Peak {
            sample_rate_hz: 48_000,
            channel_count: 2,
            samples_per_peak: 1024,
            source_frame_count: 2048,
            frames: vec![
                PeakFrame {
                    min: -0.5,
                    max: 0.75,
                },
                PeakFrame {
                    min: -1.0,
                    max: 1.0,
                },
            ],
        };

        let bytes = encode_peak(&peak);
        let decoded = decode_peak(&bytes).expect("peak cache should decode");

        assert_eq!(decoded, peak);
    }

    #[test]
    fn rejects_invalid_magic() {
        let peak = Peak {
            sample_rate_hz: 48_000,
            channel_count: 1,
            samples_per_peak: 256,
            source_frame_count: 256,
            frames: vec![PeakFrame { min: 0.0, max: 0.0 }],
        };
        let mut bytes = encode_peak(&peak);
        bytes[0] = b'X';

        let error = decode_peak(&bytes).expect_err("invalid magic should fail");

        assert!(error.to_string().contains("invalid peak cache magic"));
    }

    #[test]
    fn builds_channel_peak_frames_from_interleaved_samples() {
        let samples = [-0.25, 0.10, 0.50, -0.20, -0.75, 0.80, 0.25, -0.40];

        let peak = super::build_peak_from_interleaved_f32(&samples, 48_000, 2, 2)
            .expect("peaks should build");

        assert_eq!(peak.source_frame_count, 4);
        assert_eq!(peak.frames.len(), 4);
        assert_eq!(
            peak.frames[0],
            PeakFrame {
                min: -0.25,
                max: 0.50
            }
        );
        assert_eq!(
            peak.frames[1],
            PeakFrame {
                min: -0.20,
                max: 0.10
            }
        );
        assert_eq!(
            peak.frames[2],
            PeakFrame {
                min: -0.75,
                max: 0.25
            }
        );
        assert_eq!(
            peak.frames[3],
            PeakFrame {
                min: -0.40,
                max: 0.80
            }
        );
    }

    #[test]
    fn rejects_zero_resolution() {
        let error = super::build_peak_from_interleaved_f32(&[0.0], 48_000, 1, 0)
            .expect_err("zero resolution should fail");

        assert!(error.to_string().contains("samples per peak"));
    }
}
