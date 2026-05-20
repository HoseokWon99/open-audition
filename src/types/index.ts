export type AppView = "Home" | "Multitrack" | "Waveform" | "Settings";

export type MediaTab = "Files" | "History";

export type SettingsSection =
  | "Device"
  | "Editing"
  | "Multitrack"
  | "Waveform"
  | "Appearance"
  | "Shortcuts";

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
  color: "Green" | "Yellow";
  sourceFileId: string;
  gainDb: number;
  fadeIn: string;
  fadeOut: string;
  duration: string;
}

export interface Track {
  id: string;
  name: string;
  color: "Green" | "Purple" | "Yellow" | "Teal";
  gainDb: number;
  pan: number;
  input: string;
  output: string;
}

export interface Shortcut {
  command: string;
  keys: string;
}
