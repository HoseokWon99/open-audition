import { err, ok, Result } from "neverthrow";
import { OpenAuditionError } from "../../../types/error.ts";
import { SyntaxValidator } from "fast-xml-validator";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseAttributeValue: false,
    parseTagValue: false,
    trimValues: true,
});

export function parseXml(raw: string | Uint8Array): Result<unknown, OpenAuditionError> {
    return decodeToString(raw)
        .andThen(validateXmlStr)
        .andThen(parseXmlStr);
}

function decodeToString(raw: string | Uint8Array): Result<string, OpenAuditionError> {
    return Result.fromThrowable(
        (raw: string | Uint8Array): string =>
            typeof raw === 'string'
                ? raw
                : new TextDecoder("utf-8", { fatal: true }).decode(raw),
        error => ({
            type: "DecodingError",
            message: (error as TypeError).message,
            data: error,
        })
    )(raw);
}

function validateXmlStr(xmlStr: string): Result<string, OpenAuditionError> {
    const result = SyntaxValidator.validate(xmlStr);

    return result === true
        ? ok(xmlStr)
        : err({ type: "InvalidXmlSyntax", message: result.err.msg, data: result.err });
}

function parseXmlStr(xmlStr: string): Result<unknown, OpenAuditionError> {
    return Result.fromThrowable(
        (parser: XMLParser, str: string): any => parser.parse(str),
        error => ({
            type: "MalformedXmlError",
            message: error instanceof Error ? error.message : "Failed to parse XML",
        })
    )(xmlParser, xmlStr);
}


