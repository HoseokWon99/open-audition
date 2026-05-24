import { z } from "zod";
import { fadeCurveSchema } from "./enums";
import { nonNegativeNumberSchema } from "./primitives";

export const fadeSchema = z
  .object({
    "@_duration": nonNegativeNumberSchema,
    "@_curve": fadeCurveSchema,
  })
  .transform((fade) => ({
    duration: fade["@_duration"],
    curve: fade["@_curve"],
  }));
