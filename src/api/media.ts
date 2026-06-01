import { invoke } from "@tauri-apps/api/core";

export type MediaKind = "Audio" | "Video" | "Xml" | "Unknown";

export interface FileFingerprint {
  sizeBytes: number;
  modifiedUnixMs: number | null;
  contentHash: string | null;
}

export interface AudioMetadata {
  durationSeconds: number;
  sampleRateHz: number;
  channelCount: number;
  codec: string | null;
  container: string | null;
}

export interface DerivedFrom {
  sourceAssetId: string;
  operation: string;
  paramsHash: string;
}

export interface MediaAsset {
  id: string;
  originalPath: string | null;
  cachePath: string;
  kind: MediaKind;
  fingerprint: FileFingerprint;
  metadata: AudioMetadata | null;
  derivedFrom: DerivedFrom | null;
  revision: string;
}

export function importMediaFile(filepath: string): Promise<MediaAsset> {
  return invoke<MediaAsset>("import_media_file", { filepath });
}

export function importVideoAudio(filepath: string): Promise<MediaAsset> {
  return invoke<MediaAsset>("import_video_audio", { filepath });
}

export function readAssetBytes(assetId: string): Promise<ArrayBuffer> {
  return invoke<ArrayBuffer>("read_asset_bytes", { assetId });
}
