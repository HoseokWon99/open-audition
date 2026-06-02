import { z } from "zod";
import { keyframeTargetSchema } from "./enums";
import {
  arrayOf,
  decimalStringSchema,
  nonNegativeNumberSchema,
} from "./primitives";

export const keyframePointSchema = z
  .object({
    "@_time": nonNegativeNumberSchema,
    "@_value": decimalStringSchema,
    "@_curve": z.literal("linear"),
  })
  .transform((point) => ({
    time: point["@_time"],
    value: point["@_value"],
  }));

export const keyframeSchema = z
  .object({
    "@_target": keyframeTargetSchema,
    point: arrayOf(keyframePointSchema),
  })
  .transform((keyframe) => ({
    target: keyframe["@_target"],
    points: keyframe.point,
  }));

export const keyframesContainerSchema = z
  .union([
    z.literal(""),
    z.object({
      keyframe: arrayOf(keyframeSchema),
    }),
  ])
  .optional()
  .transform((keyframes) =>
    keyframes === undefined || keyframes === "" ? [] : keyframes.keyframe,
  );
