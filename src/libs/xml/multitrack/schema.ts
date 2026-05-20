import { z } from "zod";
import type {
  EffectParamType,
  EffectType,
  FadeCurve,
  KeyframeCurve,
  KeyframeTarget,
  TrackHeight,
} from "../../../types/audio";

const decimalStringSchema = z
  .string()
  .regex(/^-?(?:\d+|\d*\.\d+)$/)
  .transform(Number)
  .refine(Number.isFinite, { message: "Expected a finite number" });

const nonNegativeNumberSchema = decimalStringSchema.refine((value) => value >= 0, {
  message: "Expected a non-negative number",
});

const positiveNumberSchema = decimalStringSchema.refine((value) => value > 0, {
  message: "Expected a positive number",
});

const integerStringSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine(Number.isInteger, { message: "Expected an integer" });

const booleanStringSchema = z.enum(["true", "false"]).transform((value) => value === "true");

const optionalStringSchema = z.string().optional();

const xmlDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/, {
    message: "Expected an ISO date-time string with an explicit offset",
  });

function mapXmlValue<T extends string>(values: Record<string, T>, label: string) {
  return z.string().transform((value, ctx): T => {
    const mappedValue = values[value];

    if (mappedValue === undefined) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid ${label}: ${value}`,
      });
      return z.NEVER;
    }

    return mappedValue;
  });
}

function arrayOf<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (value === undefined || value === "") {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }, z.array(schema));
}

const trackHeightSchema = mapXmlValue<TrackHeight>(
  {
    small: "Small",
    medium: "Medium",
    large: "Large",
  },
  "track height",
);

const fadeCurveSchema = mapXmlValue<FadeCurve>(
  {
    linear: "Linear",
    equalPower: "EqualPower",
    exponential: "Exponential",
    logarithmic: "Logarithmic",
  },
  "fade curve",
);

const keyframeTargetSchema = mapXmlValue<KeyframeTarget>(
  {
    gainDb: "GainDb",
    pan: "Pan",
  },
  "keyframe target",
);

const keyframeCurveSchema = mapXmlValue<KeyframeCurve>(
  {
    hold: "Hold",
    linear: "Linear",
    easeIn: "EaseIn",
    easeOut: "EaseOut",
  },
  "keyframe curve",
);

const effectTypeSchema = mapXmlValue<EffectType>(
  {
    gain: "Gain",
    eq: "Eq",
    filter: "Filter",
    reverb: "Reverb",
    delay: "Delay",
    pitchShift: "PitchShift",
    timeStretch: "TimeStretch",
    noiseReduction: "NoiseReduction",
    normalize: "Normalize",
  },
  "effect type",
);

const effectParamTypeSchema = mapXmlValue<EffectParamType>(
  {
    number: "Number",
    string: "String",
    boolean: "Boolean",
  },
  "effect param type",
);

const mediaAssetSchema = z
  .object({
    "@_id": z.string().min(1),
    "@_name": z.string().min(1),
    "@_path": z.string().min(1),
    "@_duration": nonNegativeNumberSchema,
    "@_sampleRate": positiveNumberSchema,
    "@_channelCount": integerStringSchema.refine((value) => value > 0, {
      message: "Expected a positive channel count",
    }),
    "@_hash": optionalStringSchema,
  })
  .transform((asset) => ({
    id: asset["@_id"],
    name: asset["@_name"],
    path: asset["@_path"],
    duration: asset["@_duration"],
    sampleRate: asset["@_sampleRate"],
    channelCount: asset["@_channelCount"],
    hash: asset["@_hash"],
  }));

const fadeSchema = z
  .object({
    "@_duration": nonNegativeNumberSchema,
    "@_curve": fadeCurveSchema,
  })
  .transform((fade) => ({
    duration: fade["@_duration"],
    curve: fade["@_curve"],
  }));

const keyframePointSchema = z
  .object({
    "@_time": nonNegativeNumberSchema,
    "@_value": decimalStringSchema,
    "@_curve": keyframeCurveSchema,
  })
  .transform((point) => ({
    time: point["@_time"],
    value: point["@_value"],
    curve: point["@_curve"],
  }));

const keyframeSchema = z
  .object({
    "@_target": keyframeTargetSchema,
    point: arrayOf(keyframePointSchema),
  })
  .transform((keyframe) => ({
    target: keyframe["@_target"],
    points: keyframe.point,
  }));

const effectParamSchema = z
  .object({
    "@_name": z.string().min(1),
    "@_type": effectParamTypeSchema,
    "#text": z.string(),
  })
  .transform((param, ctx) => {
    if (param["@_type"] === "Number") {
      const parsedValue = decimalStringSchema.safeParse(param["#text"]);

      if (!parsedValue.success) {
        for (const issue of parsedValue.error.issues) {
          ctx.addIssue({
            code: "custom",
            message: issue.message,
            path: issue.path,
          });
        }
        return z.NEVER;
      }

      return {
        name: param["@_name"],
        type: param["@_type"],
        value: parsedValue.data,
      };
    }

    if (param["@_type"] === "Boolean") {
      const parsedValue = booleanStringSchema.safeParse(param["#text"]);

      if (!parsedValue.success) {
        for (const issue of parsedValue.error.issues) {
          ctx.addIssue({
            code: "custom",
            message: issue.message,
            path: issue.path,
          });
        }
        return z.NEVER;
      }

      return {
        name: param["@_name"],
        type: param["@_type"],
        value: parsedValue.data,
      };
    }

    return {
      name: param["@_name"],
      type: param["@_type"],
      value: param["#text"],
    };
  });

const effectSchema = z
  .object({
    "@_index": integerStringSchema,
    "@_type": effectTypeSchema,
    "@_enabled": booleanStringSchema,
    param: arrayOf(effectParamSchema),
  })
  .transform((effect) => ({
    index: effect["@_index"],
    type: effect["@_type"],
    enabled: effect["@_enabled"],
    params: effect.param,
  }));

const keyframesContainerSchema = z
  .union([
    z.literal(""),
    z.object({
      keyframe: arrayOf(keyframeSchema),
    }),
  ])
  .optional()
  .transform((keyframes) => (keyframes === undefined || keyframes === "" ? [] : keyframes.keyframe));

const effectsContainerSchema = z
  .union([
    z.literal(""),
    z.object({
      effect: arrayOf(effectSchema),
    }),
  ])
  .optional()
  .transform((effects) => (effects === undefined || effects === "" ? [] : effects.effect));

const clipSchema = z
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
    "@_pan": decimalStringSchema,
    "@_playbackRate": positiveNumberSchema,
    fadeIn: fadeSchema.optional(),
    fadeOut: fadeSchema.optional(),
    keyframes: keyframesContainerSchema,
    effects: effectsContainerSchema,
  })
  .transform((clip) => ({
    id: clip["@_id"],
    assetId: clip["@_assetId"],
    name: clip["@_name"],
    locked: clip["@_locked"],
    muted: clip["@_muted"],
    timelineStart: clip["@_timelineStart"],
    sourceStart: clip["@_sourceStart"],
    duration: clip["@_duration"],
    gainDb: clip["@_gainDb"],
    pan: clip["@_pan"],
    playbackRate: clip["@_playbackRate"],
    fadeIn: clip.fadeIn,
    fadeOut: clip.fadeOut,
    keyframes: clip.keyframes,
    effects: clip.effects,
  }));

const clipsContainerSchema = z
  .union([
    z.literal(""),
    z.object({
      clip: arrayOf(clipSchema),
    }),
  ])
  .transform((clips) => (clips === "" ? [] : clips.clip));

const trackSchema = z
  .object({
    "@_index": integerStringSchema,
    "@_name": z.string().min(1),
    "@_color": optionalStringSchema,
    "@_height": trackHeightSchema.optional(),
    "@_locked": booleanStringSchema,
    "@_muted": booleanStringSchema,
    "@_solo": booleanStringSchema,
    "@_gainDb": decimalStringSchema,
    "@_pan": decimalStringSchema,
    clips: clipsContainerSchema,
    effects: effectsContainerSchema,
  })
  .transform((track) => ({
    index: track["@_index"],
    name: track["@_name"],
    color: track["@_color"],
    height: track["@_height"],
    locked: track["@_locked"],
    muted: track["@_muted"],
    solo: track["@_solo"],
    gainDb: track["@_gainDb"],
    pan: track["@_pan"],
    clips: track.clips,
    effects: track.effects,
  }));

const mediaContainerSchema = z
  .union([
    z.literal(""),
    z.object({
      mediaAsset: arrayOf(mediaAssetSchema),
    }),
  ])
  .transform((media) => (media === "" ? [] : media.mediaAsset));

const tracksContainerSchema = z
  .union([
    z.literal(""),
    z.object({
      track: arrayOf(trackSchema),
    }),
  ])
  .transform((tracks) => (tracks === "" ? [] : tracks.track));

export const parsedMultitrackXmlSchema = z
  .object({
    multitrack: z.object({
      "@_version": z.literal("1.0"),
      "@_id": z.string().min(1),
      "@_name": z.string().min(1),
      "@_sampleRate": positiveNumberSchema,
      "@_bitDepth": integerStringSchema.refine((value) => value > 0, {
        message: "Expected a positive bit depth",
      }),
      "@_createdAt": xmlDateTimeSchema,
      "@_updatedAt": xmlDateTimeSchema,
      "@_duration": nonNegativeNumberSchema,
      media: mediaContainerSchema,
      tracks: tracksContainerSchema,
    }),
  })
  .transform(({ multitrack }) => ({
    version: multitrack["@_version"],
    id: multitrack["@_id"],
    name: multitrack["@_name"],
    sampleRate: multitrack["@_sampleRate"],
    bitDepth: multitrack["@_bitDepth"],
    createdAt: multitrack["@_createdAt"],
    updatedAt: multitrack["@_updatedAt"],
    duration: multitrack["@_duration"],
    mediaAssets: multitrack.media,
    tracks: multitrack.tracks,
  }));
