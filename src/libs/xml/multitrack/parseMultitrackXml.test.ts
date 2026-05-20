import { describe, expect, it } from "vitest";
import { parseMultitrackXml } from "./parseMultitrackXml";

const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE multitrack>
<multitrack
  version="1.0"
  id="session-main-sfx"
  name="Main SFX"
  sampleRate="48000"
  bitDepth="24"
  createdAt="2026-05-18T10:15:00+09:00"
  updatedAt="2026-05-18T11:20:00+09:00"
  duration="92.5">
  <media>
    <mediaAsset
      id="asset-thunder"
      name="Thunder Roll"
      path="../media/thunder.wav"
      duration="31.25"
      sampleRate="48000"
      channelCount="2"
      hash="sha256:abc123" />
  </media>
  <tracks>
    <track
      index="0"
      name="SFX"
      color="#5B8DEF"
      height="medium"
      locked="false"
      muted="false"
      solo="false"
      gainDb="-3"
      pan="0">
      <clips>
        <clip
          id="clip-thunder-1"
          assetId="asset-thunder"
          name="Thunder Hit"
          locked="false"
          muted="false"
          timelineStart="12.5"
          sourceStart="2"
          duration="8.25"
          gainDb="-1.5"
          pan="0"
          playbackRate="1">
          <fadeIn duration="0.75" curve="equalPower" />
          <fadeOut duration="1.25" curve="linear" />
          <keyframes>
            <keyframe target="gainDb">
              <point time="0" value="-8" curve="hold" />
              <point time="2.5" value="0" curve="linear" />
            </keyframe>
          </keyframes>
          <effects>
            <effect index="0" type="filter" enabled="true">
              <param name="mode" type="string">lowpass</param>
              <param name="frequencyHz" type="number">8000</param>
              <param name="enabled" type="boolean">true</param>
            </effect>
          </effects>
        </clip>
      </clips>
    </track>
  </tracks>
</multitrack>`;

describe("parseMultitrackXml", () => {
  it("parses a valid multitrack session XML string", () => {
    const result = parseMultitrackXml(validXml);

    expect(result.isOk()).toBe(true);

    if (result.isErr()) {
      return;
    }

    expect(result.value.id).toBe("session-main-sfx");
    expect(result.value.sampleRate).toBe(48000);
    expect(result.value.mediaAssets).toHaveLength(1);
    expect(result.value.tracks[0]?.height).toBe("Medium");
    expect(result.value.tracks[0]?.clips[0]?.fadeIn?.curve).toBe("EqualPower");
    expect(result.value.tracks[0]?.clips[0]?.fadeOut?.curve).toBe("Linear");
    expect(result.value.tracks[0]?.clips[0]?.keyframes[0]?.target).toBe("GainDb");
    expect(result.value.tracks[0]?.clips[0]?.effects[0]?.type).toBe("Filter");
    expect(result.value.tracks[0]?.clips[0]?.effects[0]?.params).toEqual([
      { name: "mode", type: "String", value: "lowpass" },
      { name: "frequencyHz", type: "Number", value: 8000 },
      { name: "enabled", type: "Boolean", value: true },
    ]);
  });

  it("parses Uint8Array input the same as string input", () => {
    const stringResult = parseMultitrackXml(validXml);
    const bytesResult = parseMultitrackXml(new TextEncoder().encode(validXml));

    expect(stringResult.isOk()).toBe(true);
    expect(bytesResult.isOk()).toBe(true);

    if (stringResult.isErr() || bytesResult.isErr()) {
      return;
    }

    expect(bytesResult.value).toEqual(stringResult.value);
  });

  it("returns DecodeFailed for invalid UTF-8 byte input", () => {
    const result = parseMultitrackXml(new Uint8Array([0xff]));

    expect(result.isErr()).toBe(true);

    if (result.isOk()) {
      return;
    }

    expect(result.error.type).toBe("DecodeFailed");
  });

  it("returns SchemaInvalid for unknown XML enum values", () => {
    const result = parseMultitrackXml(validXml.replace('curve="equalPower"', 'curve="sCurve"'));

    expect(result.isErr()).toBe(true);

    if (result.isOk()) {
      return;
    }

    expect(result.error.type).toBe("SchemaInvalid");
  });

  it("returns SchemaInvalid for missing required attributes", () => {
    const result = parseMultitrackXml(validXml.replace(' sampleRate="48000"', ""));

    expect(result.isErr()).toBe(true);

    if (result.isOk()) {
      return;
    }

    expect(result.error.type).toBe("SchemaInvalid");
  });

  it("returns SemanticInvalid for missing media references", () => {
    const result = parseMultitrackXml(
      validXml.replace('assetId="asset-thunder"', 'assetId="asset-missing"'),
    );

    expect(result.isErr()).toBe(true);

    if (result.isOk()) {
      return;
    }

    if (result.error.type !== "SemanticInvalid") {
      throw new Error(`Expected SemanticInvalid, received ${result.error.type}`);
    }

    expect(result.error.issues[0]?.path).toContain("assetId");
  });

  it("returns SemanticInvalid when fades exceed clip duration", () => {
    const result = parseMultitrackXml(validXml.replace('duration="1.25"', 'duration="8"'));

    expect(result.isErr()).toBe(true);

    if (result.isOk()) {
      return;
    }

    expect(result.error.type).toBe("SemanticInvalid");
  });

  it("returns SemanticInvalid for duplicate track indexes", () => {
    const result = parseMultitrackXml(
      validXml.replace(
        "</tracks>",
        `<track
          index="0"
          name="Duplicate"
          locked="false"
          muted="false"
          solo="false"
          gainDb="0"
          pan="0">
          <clips />
        </track>
      </tracks>`,
      ),
    );

    expect(result.isErr()).toBe(true);

    if (result.isOk()) {
      return;
    }

    expect(result.error.type).toBe("SemanticInvalid");
  });

  it("returns SemanticInvalid for non-contiguous effect indexes", () => {
    const result = parseMultitrackXml(validXml.replace('index="0" type="filter"', 'index="1" type="filter"'));

    expect(result.isErr()).toBe(true);

    if (result.isOk()) {
      return;
    }

    expect(result.error.type).toBe("SemanticInvalid");
  });
});
