import { invoke } from "@tauri-apps/api/core";
import type { Multitrack } from "../types/multitrack";

export function parseOasx(raw: string): Promise<Multitrack> {
  return invoke<Multitrack>("parse_oasx", { raw });
}

export function openOasxFile(filepath: string): Promise<Multitrack> {
  return invoke<Multitrack>("open_oasx_file", { filepath });
}

export function saveOasxFile(filepath: string, raw: string): Promise<void> {
  return invoke<void>("save_oasx_file", { filepath, raw });
}
