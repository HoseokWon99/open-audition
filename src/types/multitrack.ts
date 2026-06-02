import type { core } from "zod";

export type FadeCurve = "Linear" | "EqualPower" | "Exponential" | "Logarithmic";
export type KeyframeTarget = "GainDb" | "Pan";

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
export type EffectParamValue = number | string | boolean;

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
  hash: string | null;
}

export interface Track {
  index: number;
  name: string;
  color: string | null;
  height: number | null;
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
  name: string | null;
  locked: boolean;
  muted: boolean;
  timelineStart: number;
  sourceStart: number;
  duration: number;
  gainDb: number;
  pan: number;
  playbackRate: number;
  fadeIn: Fade | null;
  fadeOut: Fade | null;
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
}

export interface Effect {
  index: number;
  kind: EffectType;
  params: EffectParam[];
}

export interface EffectParam {
  name: string;
  kind: EffectParamType;
  value: EffectParamValue;
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
