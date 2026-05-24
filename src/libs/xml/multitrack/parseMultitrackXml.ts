import { err, ok, type Result } from "neverthrow";
import type { Multitrack } from "../../../types/audio";
import { OpenAuditionError } from "../../../types/error.ts";
import { parseXml, ValidateSchema } from "../core";
import { multitrackSchema } from "./schema";
import { validateMultitrackSemantic } from "./validateMultitrackSemantic.ts";

export function parseMultitrackXml(raw: string | Uint8Array): Result<Multitrack, OpenAuditionError> {
  return parseXml(raw)
      .andThen(ValidateSchema(multitrackSchema))
      .andThen(validateSemantic);
}

function validateSemantic(session: Multitrack): Result<Multitrack, OpenAuditionError> {
  const issues = validateMultitrackSemantic(session);

  return issues.length === 0
      ? ok(session)
      : err({
        type: "InvalidMultitrackSemantic",
        message: "Invalid multitrack semantic",
        data: issues,
      });
}
