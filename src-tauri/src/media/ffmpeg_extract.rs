use anyhow::Result;
use std::fs;
use std::io::Write;
use std::path::Path;

use super::peaks::decode_audio_file_to_interleaved_f32;

pub fn extract_audio_with_ffmpeg(input_path: &Path, output_path: &Path) -> Result<()> {
    let decoded = decode_audio_file_to_interleaved_f32(input_path)?;
    write_pcm16_wav(
        output_path,
        decoded.sample_rate_hz,
        decoded.channel_count,
        &decoded.samples,
    )
}

fn write_pcm16_wav(
    output_path: &Path,
    sample_rate_hz: u32,
    channel_count: u16,
    samples: &[f32],
) -> Result<()> {
    let mut file = fs::File::create(output_path)?;
    let data_byte_len = (samples.len() * 2) as u32;
    let byte_rate = sample_rate_hz * u32::from(channel_count) * 2;
    let block_align = channel_count * 2;

    file.write_all(b"RIFF")?;
    file.write_all(&(36 + data_byte_len).to_le_bytes())?;
    file.write_all(b"WAVE")?;
    file.write_all(b"fmt ")?;
    file.write_all(&16_u32.to_le_bytes())?;
    file.write_all(&1_u16.to_le_bytes())?;
    file.write_all(&channel_count.to_le_bytes())?;
    file.write_all(&sample_rate_hz.to_le_bytes())?;
    file.write_all(&byte_rate.to_le_bytes())?;
    file.write_all(&block_align.to_le_bytes())?;
    file.write_all(&16_u16.to_le_bytes())?;
    file.write_all(b"data")?;
    file.write_all(&data_byte_len.to_le_bytes())?;

    for sample in samples {
        let clamped = sample.clamp(-1.0, 1.0);
        let scaled = if clamped < 0.0 {
            clamped * 32768.0
        } else {
            clamped * 32767.0
        };
        file.write_all(&(scaled as i16).to_le_bytes())?;
    }

    Ok(())
}
