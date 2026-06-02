import { invoke } from "@tauri-apps/api/core";
import type { Peak, PeakFrame } from "../types/peaks";

const OapkHeaderByteLength = 32;

export type { Peak, PeakFrame } from "../types/peaks";

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
