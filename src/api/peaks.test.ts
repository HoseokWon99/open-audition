import { describe, expect, it } from "vitest";
import { parsePeak } from "./peaks";

function makePeakBuffer(): ArrayBuffer {
  const buffer = new ArrayBuffer(48);
  const view = new DataView(buffer);
  view.setUint8(0, "O".charCodeAt(0));
  view.setUint8(1, "A".charCodeAt(0));
  view.setUint8(2, "P".charCodeAt(0));
  view.setUint8(3, "K".charCodeAt(0));
  view.setUint16(4, 1, true);
  view.setUint16(6, 2, true);
  view.setUint32(8, 48000, true);
  view.setUint32(12, 1024, true);
  view.setBigUint64(16, 2048n, true);
  view.setBigUint64(24, 2n, true);
  view.setFloat32(32, -0.5, true);
  view.setFloat32(36, 0.75, true);
  view.setFloat32(40, -1, true);
  view.setFloat32(44, 1, true);
  return buffer;
}

describe("parsePeak", () => {
  it("parses oapk peak bytes", () => {
    const peak = parsePeak(makePeakBuffer());

    expect(peak.sampleRateHz).toBe(48000);
    expect(peak.channelCount).toBe(2);
    expect(peak.samplesPerPeak).toBe(1024);
    expect(peak.sourceFrameCount).toBe(2048n);
    expect(peak.frames).toEqual([
      { min: -0.5, max: 0.75 },
      { min: -1, max: 1 },
    ]);
  });

  it("rejects invalid magic", () => {
    const buffer = makePeakBuffer();
    new DataView(buffer).setUint8(0, "X".charCodeAt(0));

    expect(() => parsePeak(buffer)).toThrow("Invalid peak cache magic");
  });
});
