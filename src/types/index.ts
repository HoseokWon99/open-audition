export type AppView = "home" | "multitrack" | "waveform" | "settings";

export type MediaTab = "files" | "history";

export type SettingsSection =
  | "device"
  | "editing"
  | "multitrack"
  | "waveform"
  | "appearance"
  | "shortcuts";

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
}

export interface MediaFile {
  id: string;
  name: string;
  duration: string;
  sampleRate: string;
  channels: string;
  sourceFormat: string;
  mediaType: "Audio" | "Multitrack";
  filePath: string;
}

export interface Clip {
  id: string;
  name: string;
  trackId: string;
  startPercent: number;
  widthPercent: number;
  color: "green" | "yellow";
  sourceFileId: string;
  gainDb: number;
  fadeIn: string;
  fadeOut: string;
  duration: string;
}

export interface Track {
  id: string;
  name: string;
  color: "green" | "purple" | "yellow" | "teal";
  gainDb: number;
  pan: number;
  input: string;
  output: string;
}

export interface Shortcut {
  command: string;
  keys: string;
}
