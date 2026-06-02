import { z } from "zod";
import { effectsContainerSchema } from "./effects";
import { fadeSchema } from "./fades";
import { keyframesContainerSchema } from "./keyframes";
import {
  arrayOf,
  booleanStringSchema,
  decimalStringSchema,
  integerStringSchema,
  nonNegativeNumberSchema,
  optionalStringSchema,
  panNumberSchema,
  positiveNumberSchema,
} from "./primitives";

export const clipSchema = z
  .object({
    "@_id": z.string().min(1),
    "@_assetId": z.string().min(1),
    "@_name": optionalStringSchema,
    "@_locked": booleanStringSchema,
    "@_muted": booleanStringSchema,
    "@_timelineStart": nonNegativeNumberSchema,
    "@_sourceStart": nonNegativeNumberSchema,
    "@_duration": positiveNumberSchema,
    "@_gainDb": decimalStringSchema,
    "@_pan": panNumberSchema,
    "@_playbackRate": positiveNumberSchema,
    fadeIn: fadeSchema.optional(),
    fadeOut: fadeSchema.optional(),
    keyframes: keyframesContainerSchema,
    effects: effectsContainerSchema,
  })
  .transform((clip) => ({
    id: clip["@_id"],
    assetId: clip["@_assetId"],
    name: clip["@_name"] ?? null,
    locked: clip["@_locked"],
    muted: clip["@_muted"],
    timelineStart: clip["@_timelineStart"],
    sourceStart: clip["@_sourceStart"],
    duration: clip["@_duration"],
    gainDb: clip["@_gainDb"],
    pan: clip["@_pan"],
    playbackRate: clip["@_playbackRate"],
    fadeIn: clip.fadeIn ?? null,
    fadeOut: clip.fadeOut ?? null,
    keyframes: clip.keyframes,
    effects: clip.effects,
  }));

export const clipsContainerSchema = z
  .union([
    z.literal(""),
    z.object({
      clip: arrayOf(clipSchema),
    }),
  ])
  .transform((clips) => (clips === "" ? [] : clips.clip));

export const trackSchema = z
  .object({
    "@_index": integerStringSchema,
    "@_name": z.string().min(1),
    "@_color": optionalStringSchema,
    "@_height": positiveNumberSchema.optional(),
    "@_locked": booleanStringSchema,
    "@_muted": booleanStringSchema,
    "@_solo": booleanStringSchema,
    "@_gainDb": decimalStringSchema,
    "@_pan": panNumberSchema,
    clips: clipsContainerSchema,
    effects: effectsContainerSchema,
  })
  .transform((track) => ({
    index: track["@_index"],
    name: track["@_name"],
    color: track["@_color"] ?? null,
    height: track["@_height"] ?? null,
    locked: track["@_locked"],
    muted: track["@_muted"],
    solo: track["@_solo"],
    gainDb: track["@_gainDb"],
    pan: track["@_pan"],
    clips: track.clips,
    effects: track.effects,
  }));

export const tracksContainerSchema = z
  .union([
    z.literal(""),
    z.object({
      track: arrayOf(trackSchema),
    }),
  ])
  .transform((tracks) => (tracks === "" ? [] : tracks.track));
