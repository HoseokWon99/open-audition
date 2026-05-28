import type { core } from "zod";
import type { EffectParam } from "../libs/audio/effects/effectParams";

export type MediaTab = "Files" | "History";

export interface MediaFile {
  id: string;
  name: string;
  duration: string;
  sampleRate: string;
  channels: string;
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
  color: "Green" | "Yellow";
  sourceFileId: string;
  gainDb: number;
  fadeIn: string;
  fadeOut: string;
  duration: string;
}

export interface TimelineTrack {
  id: string;
  name: string;
  color: "Green" | "Purple" | "Yellow" | "Teal";
  gainDb: number;
  pan: number;
  input: string;
  output: string;
}

export type TrackHeight = "Small" | "Medium" | "Large";
export type FadeCurve = "Linear" | "EqualPower" | "Exponential" | "Logarithmic";
export type KeyframeTarget = "GainDb" | "Pan";
export type KeyframeCurve = "Hold" | "Linear" | "EaseIn" | "EaseOut";

export type EffectType =
  | "Gain"
  | "Eq"
  | "Filter"
  | "Reverb"
  | "Delay"
  | "PitchShift"
  | "TimeStretch"
  | "NoiseReduction"
  | "Normalize";

export type EffectParamType = "Number" | "String" | "Boolean";

export interface Multitrack {
  version: "1.0";
  id: string;
  name: string;
  sampleRate: number;
  bitDepth: number;
  createdAt: string;
  updatedAt: string;
  duration: number;
  mediaAssets: MediaAsset[];
  tracks: Track[];
}

export interface MediaAsset {
  id: string;
  name: string;
  path: string;
  duration: number;
  sampleRate: number;
  channelCount: number;
  hash?: string;
}

export interface Track {
  index: number;
  name: string;
  color?: string;
  height?: TrackHeight;
  locked: boolean;
  muted: boolean;
  solo: boolean;
  gainDb: number;
  pan: number;
  clips: Clip[];
  effects: Effect[];
}

export interface Clip {
  id: string;
  assetId: string;
  name?: string;
  locked: boolean;
  muted: boolean;
  timelineStart: number;
  sourceStart: number;
  duration: number;
  gainDb: number;
  pan: number;
  playbackRate: number;
  fadeIn?: Fade;
  fadeOut?: Fade;
  keyframes: Keyframe[];
  effects: Effect[];
}

export interface Fade {
  duration: number;
  curve: FadeCurve;
}

export interface Keyframe {
  target: KeyframeTarget;
  points: KeyframePoint[];
}

export interface KeyframePoint {
  time: number;
  value: number;
  curve: KeyframeCurve;
}

export interface Effect {
  index: number;
  type: EffectType;
  enabled: boolean;
  params: EffectParam[];
}

export interface MultitrackSemanticIssue {
  path: string;
  message: string;
}

export type ParseMultitrackXmlError =
  | { type: "DecodeFailed"; message: string }
  | { type: "MalformedXml"; message: string }
  | { type: "SchemaInvalid"; issues: core.$ZodIssue[] }
  | { type: "SemanticInvalid"; issues: MultitrackSemanticIssue[] };
