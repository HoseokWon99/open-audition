import { convertFileSrc } from "@tauri-apps/api/core";
import type { MediaFile } from "../../../types/audio";

type LocalFileConverter = (path: string) => string;

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

  return convertLocalFilePath(file.filepath);
}

function isBrowserReadableUrl(path: string): boolean {
  return path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:");
}

function safeConvertFileSrc(path: string): string {
  try {
    return convertFileSrc(path);
  } catch {
    return path;
  }
}
