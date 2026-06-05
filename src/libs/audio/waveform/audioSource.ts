import { convertFileSrc } from "@tauri-apps/api/core";
import type { MediaFile } from "../../../types/audio";
import type { MediaAsset } from "../../../types/media";

type LocalFileConverter = (path: string) => string;
export type AudioSource = MediaAsset | MediaFile | undefined;

const supportedAudioExtensions = [".mp3", ".wav", ".aiff", ".aif", ".flac", ".ogg", ".m4a"];

export function resolveAudioSourceUrl(
  source: AudioSource,
  convertLocalFilePath: LocalFileConverter = safeConvertFileSrc,
): string | null {
  const path = audioSourcePath(source);

  if (!path) {
    return null;
  }

  if (isBrowserReadableUrl(path)) {
    return null;
  }

  if (isMediaFile(source) && !hasSupportedAudioExtension(path)) {
    return null;
  }

  return convertLocalFilePath(path);
}

export function audioSourceDurationSeconds(source: AudioSource): number | undefined {
  if (!source) {
    return undefined;
  }

  if (isMediaAsset(source)) {
    return source.metadata?.durationSeconds;
  }

  return source.durationSeconds;
}

function isBrowserReadableUrl(path: string): boolean {
  return (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  );
}

function hasSupportedAudioExtension(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return supportedAudioExtensions.some((extension) => lowerPath.endsWith(extension));
}

function safeConvertFileSrc(path: string): string {
  try {
    return convertFileSrc(path);
  } catch {
    return path;
  }
}

function audioSourcePath(source: AudioSource): string | null {
  if (!source) {
    return null;
  }

  if (isMediaAsset(source)) {
    return source.kind === "Audio" ? source.cachePath : null;
  }

  if (source.mediaType !== "Audio" || source.filepath.includes("...")) {
    return null;
  }

  return source.filepath;
}

function isMediaAsset(source: MediaAsset | MediaFile): source is MediaAsset {
  return "cachePath" in source;
}

function isMediaFile(source: AudioSource): source is MediaFile {
  return Boolean(source && "filepath" in source);
}
