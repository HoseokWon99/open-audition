import { convertFileSrc } from "@tauri-apps/api/core";
import type { MediaFile } from "../../../types/audio";

type LocalFileConverter = (path: string) => string;

const supportedAudioExtensions = [".mp3", ".wav", ".aiff", ".aif", ".flac", ".ogg", ".m4a"];

export function resolveAudioSourceUrl(
  file: MediaFile | undefined,
  convertLocalFilePath: LocalFileConverter = safeConvertFileSrc,
): string | null {
  if (!file || file.mediaType !== "Audio" || file.filepath.includes("...")) {
    return null;
  }

  if (isBrowserReadableUrl(file.filepath)) {
    return file.filepath;
  }

  if (!hasSupportedAudioExtension(file.filepath)) {
    return null;
  }

  return convertLocalFilePath(file.filepath);
}

function isBrowserReadableUrl(path: string): boolean {
  return path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:");
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
