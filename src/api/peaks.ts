import { invoke } from "@tauri-apps/api/core";

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
