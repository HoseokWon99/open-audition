import { z, ZodError } from "zod";
import { Result } from "neverthrow";
import { OpenAuditionError } from "../../../types/error.ts";

export function ValidateSchema<Schema extends z.ZodType>(
    schema: Schema,
): (a: unknown) => Result<z.output<Schema>, OpenAuditionError> {
    return Result.fromThrowable(
        (xml: unknown): z.output<Schema> => schema.parse(xml),
        error => ({
            type: "InvalidXmlSchema",
            message: (error as ZodError).message,
            data: error,
        }),
    );
}
