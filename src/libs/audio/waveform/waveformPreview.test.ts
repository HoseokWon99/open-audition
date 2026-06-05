import { describe, expect, it } from "vitest";
import { createWaveformPolygonPoints, createWaveformSamples } from "./waveformPreview";

describe("waveformPreview", () => {
  it("creates deterministic clamped placeholder waveform samples", () => {
    const samples = createWaveformSamples({
      count: 4,
      attackPercent: 0.25,
      decayStartPercent: 0.75,
      floor: 0.03,
      phraseFrequency: 0.1,
      phraseSecondaryFrequency: 0.043,
      transientEvery: [2],
    });

    expect(samples).toHaveLength(4);
    expect(samples[0]).toBe(0.03);
    expect(samples.every((sample) => sample >= 0.03 && sample <= 0.94)).toBe(true);
  });

  it("converts samples to a mirrored svg polygon", () => {
    expect(createWaveformPolygonPoints([0.25, 0.5])).toBe(
      "0.00,38.00 100.00,26.00 100.00,74.00 0.00,62.00",
    );
  });
});
