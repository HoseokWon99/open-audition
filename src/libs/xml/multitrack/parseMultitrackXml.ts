import { XMLParser, XMLValidator } from "fast-xml-parser";
import { err, ok, type Result } from "neverthrow";
import type { MultitrackSession, ParseMultitrackXmlError } from "../../../types/audio";
import { parsedMultitrackXmlSchema } from "./schema";
import { validateMultitrackSession } from "./semanticValidation";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

function decodeXmlInput(input: string | Uint8Array): Result<string, ParseMultitrackXmlError> {
  if (typeof input === "string") {
    return ok(input);
  }

  try {
    return ok(new TextDecoder("utf-8", { fatal: true }).decode(input));
  } catch (error) {
    return err({
      type: "DecodeFailed",
      message: error instanceof Error ? error.message : "Failed to decode XML",
    });
  }
}

function validateXmlSyntax(xml: string): Result<void, ParseMultitrackXmlError> {
  const validationResult = XMLValidator.validate(xml);

  if (validationResult === true) {
    return ok(undefined);
  }

  return err({
    type: "MalformedXml",
    message: validationResult.err.msg,
  });
}

export function parseMultitrackXml(
  input: string | Uint8Array,
): Result<MultitrackSession, ParseMultitrackXmlError> {
  const decodedXml = decodeXmlInput(input);

  if (decodedXml.isErr()) {
    return err(decodedXml.error);
  }

  const validXml = validateXmlSyntax(decodedXml.value);

  if (validXml.isErr()) {
    return err(validXml.error);
  }

  let parsedXml: unknown;

  try {
    parsedXml = xmlParser.parse(decodedXml.value);
  } catch (error) {
    return err({
      type: "MalformedXml",
      message: error instanceof Error ? error.message : "Failed to parse XML",
    });
  }

  const parsedSession = parsedMultitrackXmlSchema.safeParse(parsedXml);

  if (!parsedSession.success) {
    return err({
      type: "SchemaInvalid",
      issues: parsedSession.error.issues,
    });
  }

  const semanticIssues = validateMultitrackSession(parsedSession.data);

  if (semanticIssues.length > 0) {
    return err({
      type: "SemanticInvalid",
      issues: semanticIssues,
    });
  }

  return ok(parsedSession.data);
}
