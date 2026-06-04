export type MediaTab = "Files" | "History";
export type HexColor = `#${string}`;

export interface MediaFile {
  id: string;
  name: string;
  duration: string;
  durationSeconds?: number;
  sampleRate: string;
  sampleRateHz?: number;
  channels: string;
  channelCount?: number;
  sourceFormat: string;
  mediaType: "Audio" | "Multitrack";
  filepath: string;
}

export interface TimelineClip {
  id: string;
  name: string;
  trackId: string;
  startPercent: number;
  widthPercent: number;
  color: HexColor;
  sourceFileId: string;
  gainDb: number;
  fadeIn: string;
  fadeOut: string;
  duration: string;
  automation?: TimelineClipAutomation;
}

export interface TimelineClipAutomation {
  gain: TimelineKeyframePoint[];
}

export interface TimelineKeyframePoint {
  id: string;
  xPercent: number;
  yPercent: number;
}

export interface TimelineTrack {
  id: string;
  name: string;
  color: HexColor;
  gainDb: number;
  pan: number;
  input: string;
  output: string;
}

export type {
  Clip,
  Effect,
  EffectParam,
  EffectParamType,
  EffectParamValue,
  EffectType,
  Fade,
  FadeCurve,
  Keyframe,
  KeyframePoint,
  KeyframeTarget,
  MediaAsset,
  Multitrack,
  MultitrackSemanticIssue,
  ParseMultitrackXmlError,
  Track,
} from "./multitrack";
