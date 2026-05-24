import { z } from "zod";

export const decimalStringSchema = z
  .string()
  .regex(/^-?(?:\d+|\d*\.\d+)$/)
  .transform(Number)
  .refine(Number.isFinite, { message: "Expected a finite number" });

export const nonNegativeNumberSchema = decimalStringSchema.refine((value) => value >= 0, {
  message: "Expected a non-negative number",
});

export const positiveNumberSchema = decimalStringSchema.refine((value) => value > 0, {
  message: "Expected a positive number",
});

export const panNumberSchema = decimalStringSchema.refine(
  (value) => value >= -1 && value <= 1,
  {
    message: "Expected a pan value between -1 and 1",
  },
);

export const integerStringSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine(Number.isInteger, { message: "Expected an integer" });

export const booleanStringSchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const optionalStringSchema = z.string().optional();

export const xmlDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/, {
    message: "Expected an ISO date-time string with an explicit offset",
  });

export function mapXmlValue<T extends string>(values: Record<string, T>, label: string) {
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

export function arrayOf<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (value === undefined || value === "") {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }, z.array(schema));
}
