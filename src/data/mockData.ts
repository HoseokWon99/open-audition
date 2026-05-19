import type { Clip, MediaFile, ProjectSummary, Shortcut, Track } from "../types";

export const recentProjects: ProjectSummary[] = [
  {
    id: "water-glasses",
    name: "물안경",
    path: "~/projects/theatre/물안경",
    lastOpened: "Today",
  },
  {
    id: "tempest",
    name: "tempest",
    path: "~/theatre/tempest",
    lastOpened: "Yesterday",
  },
  {
    id: "winter-show",
    name: "winter-show",
    path: "~/sound/winter-show",
    lastOpened: "May 14",
  },
  {
    id: "scene-change-study",
    name: "scene-change-study",
    path: "~/study/scene-change-study",
    lastOpened: "May 10",
  },
  {
    id: "opening-night",
    name: "opening-night",
    path: "~/prototype/opening-night",
    lastOpened: "May 8",
  },
  {
    id: "black-box",
    name: "black-box",
    path: "~/theatre/black-box",
    lastOpened: "May 1",
  },
];

export const mediaFiles: MediaFile[] = [
  {
    id: "mola",
    name: "mola mola.mp3",
    duration: "3:02.531",
    sampleRate: "48000 Hz",
    channels: "Stereo",
    sourceFormat: "MP3 192 Kbps",
    mediaType: "Audio",
    filePath: "/Users/.../Imported Files/mola mola.mp3",
  },
  {
    id: "cat",
    name: "고양이.mp3",
    duration: "0:00.886",
    sampleRate: "48000 Hz",
    channels: "Stereo",
    sourceFormat: "MP3 192 Kbps",
    mediaType: "Audio",
    filePath: "/Users/.../Imported Files/고양이.mp3",
  },
  {
    id: "session",
    name: "물안경.sesx",
    duration: "1:02:41.638",
    sampleRate: "48000 Hz",
    channels: "Stereo",
    sourceFormat: "Open Audition Multitrack Session",
    mediaType: "Multitrack",
    filePath: "/Users/.../Audition/26.0/물안경/물안경.sesx",
  },
  {
    id: "ending",
    name: "엔딩.mp3",
    duration: "0:30.120",
    sampleRate: "48000 Hz",
    channels: "Stereo",
    sourceFormat: "MP3 192 Kbps",
    mediaType: "Audio",
    filePath: "/Users/.../Imported Files/엔딩.mp3",
  },
  {
    id: "opening",
    name: "오프닝.mp3",
    duration: "1:10.171",
    sampleRate: "48000 Hz",
    channels: "Stereo",
    sourceFormat: "MP3 192 Kbps",
    mediaType: "Audio",
    filePath: "/Users/.../Imported Files/오프닝.mp3",
  },
];

export const tracks: Track[] = [
  {
    id: "track-1",
    name: "Track 1",
    color: "green",
    gainDb: 0,
    pan: 0,
    input: "Default Stereo Input",
    output: "Mix",
  },
  {
    id: "track-2",
    name: "Track 2",
    color: "purple",
    gainDb: 0,
    pan: 0,
    input: "Default Stereo Input",
    output: "Mix",
  },
  {
    id: "track-3",
    name: "Track 3",
    color: "yellow",
    gainDb: 0,
    pan: 0,
    input: "Default Stereo Input",
    output: "Mix",
  },
  {
    id: "track-4",
    name: "Track 4",
    color: "teal",
    gainDb: 0,
    pan: 0,
    input: "Default Stereo Input",
    output: "Mix",
  },
  {
    id: "track-5",
    name: "Track 5",
    color: "purple",
    gainDb: 0,
    pan: 0,
    input: "Default Stereo Input",
    output: "Mix",
  },
];

export const clips: Clip[] = [
  {
    id: "clip-opening",
    name: "opening",
    trackId: "track-1",
    startPercent: 0,
    widthPercent: 48,
    color: "green",
    sourceFileId: "opening",
    gainDb: 0,
    fadeIn: "0:00.250",
    fadeOut: "0:01.000",
    duration: "1:10.171",
  },
  {
    id: "clip-mola",
    name: "mola mola",
    trackId: "track-3",
    startPercent: 53,
    widthPercent: 47,
    color: "yellow",
    sourceFileId: "mola",
    gainDb: 0,
    fadeIn: "0:00.000",
    fadeOut: "0:00.750",
    duration: "3:02.531",
  },
];

export const historyEntries = [
  "Imported 오프닝.mp3",
  "Moved mola mola to Track 3",
  "Selected Track 3",
  "Adjusted clip gain to +0 dB",
  "Saved 물안경.sesx",
];

export const shortcuts: Shortcut[] = [
  { command: "Play / Stop", keys: "Space" },
  { command: "Zoom In", keys: "Cmd +" },
  { command: "Zoom Out", keys: "Cmd -" },
  { command: "Open Settings", keys: "Cmd ," },
  { command: "Open Waveform Editor", keys: "W" },
];
