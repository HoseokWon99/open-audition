import { z } from "zod";
import {
  arrayOf,
  integerStringSchema,
  nonNegativeNumberSchema,
  optionalStringSchema,
  positiveNumberSchema,
} from "./primitives";

export const mediaAssetSchema = z
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

export const mediaContainerSchema = z
  .union([
    z.literal(""),
    z.object({
      mediaAsset: arrayOf(mediaAssetSchema),
    }),
  ])
  .transform((media) => (media === "" ? [] : media.mediaAsset));
