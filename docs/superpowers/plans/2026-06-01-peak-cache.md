# Peak Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Open Audition `.oapk` peak cache files so waveform shapes load quickly without rescanning full audio files after every open, zoom, or redraw.

**Architecture:** Peak files are disposable derived data keyed by `assetId + revision + resolution`. All waveform peak calculation happens on the Rust side; the frontend does not decode source audio or calculate peaks. Rust generates and stores binary `.oapk` files under the media cache `peaks/` directory, Tauri returns peak bytes with `tauri::ipc::Response::new(bytes)`, and TypeScript parses the binary into camelCase DTOs for waveform rendering.

**Tech Stack:** Rust 2021, Tauri 2, ffmpeg-next, serde, anyhow, TypeScript, Vite, Web APIs `ArrayBuffer` / `DataView`.

---

## File Structure

- Create `src-tauri/src/media/peaks.rs`
  - Defines `.oapk` binary format, peak generation, serialization, parsing, and focused unit tests.
- Modify `src-tauri/src/media/mod.rs`
  - Exports the `peaks` module.
- Modify `src-tauri/src/media/cache.rs`
  - Adds peak path helpers and `ensure_peak_cache`.
- Modify `src-tauri/src/media/commands.rs`
  - Adds `ensure_asset_peaks` and `read_asset_peaks` Tauri commands.
- Modify `src-tauri/src/lib.rs`
  - Registers the new Tauri commands.
- Create `src/api/peaks.ts`
  - TypeScript command wrappers and `.oapk` binary parser with camelCase field names.
- Create `src/api/peaks.test.ts`
  - TypeScript parser tests.

This plan assumes `docs/superpowers/plans/2026-06-01-rust-media-cache.md` has already been implemented, including `MediaCache`, `MediaAsset`, `read_asset_bytes`, and camelCase serde conventions.

---

### Task 1: Binary Peak Format

**Files:**
- Create: `src-tauri/src/media/peaks.rs`
- Modify: `src-tauri/src/media/mod.rs`

- [ ] **Step 1: Add `.oapk` structs, serializer, parser, and tests**

Create `src-tauri/src/media/peaks.rs`:

```rust
use anyhow::{anyhow, bail, Result};

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
                PeakFrame { min: -0.5, max: 0.75 },
                PeakFrame { min: -1.0, max: 1.0 },
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
}
```

- [ ] **Step 2: Export the peaks module**

Modify `src-tauri/src/media/mod.rs`:

```rust
pub mod cache;
pub mod commands;
pub mod detect;
pub mod ffmpeg_extract;
pub mod fingerprint;
pub mod metadata;
pub mod peaks;
pub mod types;
```

- [ ] **Step 3: Run tests**

Run:

```bash
cd src-tauri && cargo test media::peaks
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/media/mod.rs src-tauri/src/media/peaks.rs
git commit -m "feat: define oapk peak cache format"
```

---

### Task 2: Peak Generation From Samples

**Files:**
- Modify: `src-tauri/src/media/peaks.rs`

- [ ] **Step 1: Add peak generation code**

Append this function before `read_array` in `src-tauri/src/media/peaks.rs`:

```rust
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
                let sample = samples[frame_index * channel_count_usize + channel_index].clamp(-1.0, 1.0);
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
```

- [ ] **Step 2: Add generation tests**

Append these tests inside the existing `#[cfg(test)] mod tests`:

```rust
    #[test]
    fn builds_channel_peak_frames_from_interleaved_samples() {
        let samples = [
            -0.25, 0.10,
            0.50, -0.20,
            -0.75, 0.80,
            0.25, -0.40,
        ];

        let peak = super::build_peak_from_interleaved_f32(&samples, 48_000, 2, 2)
            .expect("peaks should build");

        assert_eq!(peak.source_frame_count, 4);
        assert_eq!(peak.frames.len(), 4);
        assert_eq!(peak.frames[0], PeakFrame { min: -0.25, max: 0.50 });
        assert_eq!(peak.frames[1], PeakFrame { min: -0.20, max: 0.10 });
        assert_eq!(peak.frames[2], PeakFrame { min: -0.75, max: 0.25 });
        assert_eq!(peak.frames[3], PeakFrame { min: -0.40, max: 0.80 });
    }

    #[test]
    fn rejects_zero_resolution() {
        let error = super::build_peak_from_interleaved_f32(&[0.0], 48_000, 1, 0)
            .expect_err("zero resolution should fail");

        assert!(error.to_string().contains("samples per peak"));
    }
```

- [ ] **Step 3: Run tests**

Run:

```bash
cd src-tauri && cargo test media::peaks
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/media/peaks.rs
git commit -m "feat: build waveform peaks from samples"
```

---

### Task 3: FFmpeg Decode For Peak Generation

**Files:**
- Modify: `src-tauri/src/media/peaks.rs`

- [ ] **Step 1: Add audio decode function**

Add these imports at the top of `src-tauri/src/media/peaks.rs`:

```rust
use ffmpeg_next as ffmpeg;
use std::path::Path;
```

Append this function before `read_array`:

```rust
pub fn build_peak_from_audio_file(path: &Path, samples_per_peak: u32) -> Result<Peak> {
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
    let mut samples = Vec::new();

    for (packet_stream, packet) in input.packets() {
        if packet_stream.index() != stream_index {
            continue;
        }

        decoder.send_packet(&packet)?;
        receive_decoded_samples(&mut decoder, &mut samples)?;
    }

    decoder.send_eof()?;
    receive_decoded_samples(&mut decoder, &mut samples)?;

    build_peak_from_interleaved_f32(&samples, sample_rate_hz, channel_count, samples_per_peak)
}

fn receive_decoded_samples(
    decoder: &mut ffmpeg::decoder::Audio,
    samples: &mut Vec<f32>,
) -> Result<()> {
    let mut frame = ffmpeg::util::frame::Audio::empty();

    while decoder.receive_frame(&mut frame).is_ok() {
        let channels = frame.channels() as usize;
        let sample_count = frame.samples();
        let format = frame.format();

        if !format.is_planar() || format.name() != "flt" {
            bail!("unsupported decoded sample format: {}", format.name());
        }

        for sample_index in 0..sample_count {
            for channel_index in 0..channels {
                let plane = frame.plane::<f32>(channel_index);
                samples.push(plane[sample_index]);
            }
        }
    }

    Ok(())
}
```

- [ ] **Step 2: Run Rust check**

Run:

```bash
cd src-tauri && cargo check
```

Expected: PASS. If this fails because the decoder does not emit planar float for some files, keep this task compiling first and defer resampling/conversion to a later fix task.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/media/peaks.rs
git commit -m "feat: decode audio for peak generation"
```

---

### Task 4: Peak Cache Storage

**Files:**
- Modify: `src-tauri/src/media/cache.rs`

- [ ] **Step 1: Add peak cache storage methods**

Add these imports to `src-tauri/src/media/cache.rs`:

```rust
use super::peaks::{build_peak_from_audio_file, encode_peak};
```

Replace the existing `peak_path` method with this version:

```rust
    pub fn peak_path(&self, asset_id: &str, revision: &str, resolution: u32) -> PathBuf {
        self.root_dir
            .join("peaks")
            .join(format!("{asset_id}-{revision}-{resolution}.oapk"))
    }
```

Add this method inside `impl MediaCache`:

```rust
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
```

- [ ] **Step 2: Update peak path test**

In `src-tauri/src/media/cache.rs`, change the expected peak cache filename:

```rust
        assert_eq!(path, root.join("peaks").join("asset-1-3-2048.oapk"));
```

- [ ] **Step 3: Run cache tests**

Run:

```bash
cd src-tauri && cargo test media::cache
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/media/cache.rs
git commit -m "feat: store generated peak cache files"
```

---

### Task 5: Tauri Peak Commands

**Files:**
- Modify: `src-tauri/src/media/commands.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add peak commands**

Add these commands to `src-tauri/src/media/commands.rs`:

```rust
#[tauri::command]
pub async fn ensure_asset_peaks(
    state: State<'_, MediaCacheState>,
    asset_id: String,
    resolution: u32,
) -> Result<String, String> {
    let cache = state.lock().map_err(|error| error.to_string())?;
    cache
        .ensure_peak_cache(&asset_id, resolution)
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn read_asset_peaks(
    state: State<'_, MediaCacheState>,
    asset_id: String,
    revision: String,
    resolution: u32,
) -> Result<Response, String> {
    let cache = state.lock().map_err(|error| error.to_string())?;
    let path = cache.peak_path(&asset_id, &revision, resolution);
    let bytes = std::fs::read(&path).map_err(|error| error.to_string())?;

    Ok(Response::new(bytes))
}
```

- [ ] **Step 2: Register commands in `lib.rs`**

Modify the command import in `src-tauri/src/lib.rs`:

```rust
use media::commands::{
    ensure_asset_peaks,
    import_media_file,
    import_video_audio,
    read_asset_bytes,
    read_asset_peaks,
};
```

Modify the `generate_handler!` list:

```rust
        .invoke_handler(tauri::generate_handler![
            greet,
            import_media_file,
            import_video_audio,
            read_asset_bytes,
            ensure_asset_peaks,
            read_asset_peaks,
        ])
```

- [ ] **Step 3: Run Rust check**

Run:

```bash
cd src-tauri && cargo check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/media/commands.rs
git commit -m "feat: expose peak cache commands"
```

---

### Task 6: TypeScript Peak API And Parser

**Files:**
- Create: `src/api/peaks.ts`
- Create: `src/api/peaks.test.ts`

- [ ] **Step 1: Add TypeScript API and parser**

Create `src/api/peaks.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";

const OapkHeaderByteLength = 32;

export interface PeakFrame {
  min: number;
  max: number;
}

export interface Peak {
  sampleRateHz: number;
  channelCount: number;
  samplesPerPeak: number;
  sourceFrameCount: bigint;
  frames: PeakFrame[];
}

export function ensureAssetPeaks(assetId: string, resolution: number): Promise<string> {
  return invoke<string>("ensure_asset_peaks", { assetId, resolution });
}

export function readAssetPeaks(
  assetId: string,
  revision: string,
  resolution: number,
): Promise<ArrayBuffer> {
  return invoke<ArrayBuffer>("read_asset_peaks", { assetId, revision, resolution });
}

export function parsePeak(buffer: ArrayBuffer): Peak {
  if (buffer.byteLength < OapkHeaderByteLength) {
    throw new Error("Peak cache is too small");
  }

  const view = new DataView(buffer);
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );

  if (magic !== "OAPK") {
    throw new Error("Invalid peak cache magic");
  }

  const version = view.getUint16(4, true);
  if (version !== 1) {
    throw new Error(`Unsupported peak cache version: ${version}`);
  }

  const channelCount = view.getUint16(6, true);
  const sampleRateHz = view.getUint32(8, true);
  const samplesPerPeak = view.getUint32(12, true);
  const sourceFrameCount = view.getBigUint64(16, true);
  const frameCount = Number(view.getBigUint64(24, true));
  const expectedByteLength = OapkHeaderByteLength + frameCount * 8;

  if (buffer.byteLength !== expectedByteLength) {
    throw new Error("Peak cache length mismatch");
  }

  const frames: PeakFrame[] = [];
  let offset = OapkHeaderByteLength;

  for (let index = 0; index < frameCount; index += 1) {
    frames.push({
      min: view.getFloat32(offset, true),
      max: view.getFloat32(offset + 4, true),
    });
    offset += 8;
  }

  return {
    sampleRateHz,
    channelCount,
    samplesPerPeak,
    sourceFrameCount,
    frames,
  };
}
```

- [ ] **Step 2: Add parser tests**

Create `src/api/peaks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parsePeak } from "./peaks";

function makePeakBuffer(): ArrayBuffer {
  const buffer = new ArrayBuffer(48);
  const view = new DataView(buffer);
  view.setUint8(0, "O".charCodeAt(0));
  view.setUint8(1, "A".charCodeAt(0));
  view.setUint8(2, "P".charCodeAt(0));
  view.setUint8(3, "K".charCodeAt(0));
  view.setUint16(4, 1, true);
  view.setUint16(6, 2, true);
  view.setUint32(8, 48000, true);
  view.setUint32(12, 1024, true);
  view.setBigUint64(16, 2048n, true);
  view.setBigUint64(24, 2n, true);
  view.setFloat32(32, -0.5, true);
  view.setFloat32(36, 0.75, true);
  view.setFloat32(40, -1, true);
  view.setFloat32(44, 1, true);
  return buffer;
}

describe("parsePeak", () => {
  it("parses oapk peak cache bytes", () => {
    const peak = parsePeak(makePeakBuffer());

    expect(peak.sampleRateHz).toBe(48000);
    expect(peak.channelCount).toBe(2);
    expect(peak.samplesPerPeak).toBe(1024);
    expect(peak.sourceFrameCount).toBe(2048n);
    expect(peak.frames).toEqual([
      { min: -0.5, max: 0.75 },
      { min: -1, max: 1 },
    ]);
  });

  it("rejects invalid magic", () => {
    const buffer = makePeakBuffer();
    new DataView(buffer).setUint8(0, "X".charCodeAt(0));

    expect(() => parsePeak(buffer)).toThrow("Invalid peak cache magic");
  });
});
```

- [ ] **Step 3: Run parser tests**

Run:

```bash
pnpm test -- src/api/peaks.test.ts
```

Expected: PASS. If the project does not have a `pnpm test` script yet, run `pnpm build` and add the parser tests to the next test runner setup task instead.

- [ ] **Step 4: Run frontend build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/peaks.ts src/api/peaks.test.ts
git commit -m "feat: parse peak cache files in frontend"
```

---

### Task 7: Verification

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

- [ ] **Step 4: Commit verification fixes**

If verification required fixes:

```bash
git add src-tauri/src src/api
git commit -m "fix: stabilize peak cache implementation"
```

If no fixes were required, do not create an empty commit.

---

## Follow-Up Plan Boundaries

These are intentionally outside this plan:

- Rendering `.oapk` data inside `WaveformCanvas` or WaveSurfer.
- Multi-resolution peak prewarming policy.
- Background worker queue for long peak generation.
- Peak cache manifest persistence.
- Automatic stale cache cleanup.
- Sample format conversion/resampling if `ffmpeg-next` does not decode a file as planar float.

Those should be planned after this foundation works end-to-end for one supported audio format.

## Self-Review

- Spec coverage: The plan implements Audition-style waveform shape cache files, avoids recalculation on zoom, stores binary peak cache files, returns bytes through `tauri::ipc::Response`, and parses data into camelCase TypeScript fields.
- Placeholder scan: No code step uses unspecified names without defining them in the same or earlier tasks. Unsupported sample conversion is explicitly scoped out of this foundation plan.
- Type consistency: Rust uses `Peak` and `PeakFrame`; TypeScript mirrors those names with camelCase fields. Commands use `asset_id` in Rust and `assetId` in TypeScript invoke payloads.
