import { invoke } from "@tauri-apps/api/core";
import type { MediaAsset } from "../types/media";

export type { AudioMetadata, DerivedFrom, FileFingerprint, MediaAsset, MediaKind } from "../types/media";

export function importMediaFile(filepath: string): Promise<MediaAsset> {
  return invoke<MediaAsset>("import_media_file", { filepath });
}

export function importVideoAudio(filepath: string): Promise<MediaAsset> {
  return invoke<MediaAsset>("import_video_audio", { filepath });
}

export function readAssetBytes(assetId: string): Promise<ArrayBuffer> {
  return invoke<ArrayBuffer>("read_asset_bytes", { assetId });
}
