import { z } from "zod";
import { effectParamTypeSchema, effectTypeSchema } from "./enums";
import { arrayOf, booleanStringSchema, decimalStringSchema, integerStringSchema } from "./primitives";

export const effectParamSchema = z
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

export const effectSchema = z
  .object({
    "@_index": integerStringSchema,
    "@_type": effectTypeSchema,
    param: arrayOf(effectParamSchema),
  })
  .transform((effect) => ({
    index: effect["@_index"],
    type: effect["@_type"],
    params: effect.param,
  }));

export const effectsContainerSchema = z
  .union([
    z.literal(""),
    z.object({
      effect: arrayOf(effectSchema),
    }),
  ])
  .optional()
  .transform((effects) => (effects === undefined || effects === "" ? [] : effects.effect));
