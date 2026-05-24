import { z } from "zod";
import { mediaContainerSchema } from "./media";
import {
  integerStringSchema,
  nonNegativeNumberSchema,
  positiveNumberSchema,
  xmlDateTimeSchema,
} from "./primitives";
import { tracksContainerSchema } from "./tracks";

export const multitrackSchema = z
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
