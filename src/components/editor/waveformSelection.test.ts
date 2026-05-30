import { describe, expect, it } from "vitest";
import { createWaveformSelection } from "./waveformSelection";

describe("createWaveformSelection", () => {
  it("normalizes forward and reverse drag percentages", () => {
    expect(createWaveformSelection(18, 46)).toEqual({ startPercent: 18, endPercent: 46 });
    expect(createWaveformSelection(64, 21)).toEqual({ startPercent: 21, endPercent: 64 });
  });

  it("clamps selection endpoints to the waveform content", () => {
    expect(createWaveformSelection(-12, 132)).toEqual({ startPercent: 0, endPercent: 100 });
  });

  it("returns null for a click-sized drag", () => {
    expect(createWaveformSelection(20, 20.2)).toBeNull();
  });
});
