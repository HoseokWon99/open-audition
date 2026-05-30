import { describe, expect, it, vi } from "vitest";
import { AudioNodeManager } from "../core";
import { createFilterEffect } from "./filterEffect";

interface FakeAudioParam {
  value: number;
}

type FakeBiquadFilter = BiquadFilterNode & {
  frequency: FakeAudioParam;
  Q: FakeAudioParam;
  gain: FakeAudioParam;
};

function createFakeFilter(context: BaseAudioContext): FakeBiquadFilter {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
    type: "lowpass",
    frequency: { value: 0 },
    Q: { value: 0 },
    gain: { value: 0 },
  } as unknown as FakeBiquadFilter;
}

describe("FilterEffect", () => {
  it("sets clamped filter parameters", () => {
    const context = {
      createBiquadFilter: vi.fn(() => createFakeFilter(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;

    const effect = createFilterEffect({
      context,
      id: "filter-1",
      filterType: "HighPass",
      frequencyHz: 50_000,
      q: -1,
      gainDb: 100,
    });

    expect(effect.filter.type).toBe("highpass");
    expect(effect.filter.frequency.value).toBe(20_000);
    expect(effect.filter.Q.value).toBe(0.0001);
    expect(effect.filter.gain.value).toBe(40);
  });

  it("registers the filter node", () => {
    const context = {
      createBiquadFilter: vi.fn(() => createFakeFilter(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const effect = createFilterEffect({
      context,
      id: "filter-1",
      filterType: "LowPass",
      frequencyHz: 800,
      q: 0.7,
      gainDb: 0,
    });

    expect(effect.activate(manager).isOk()).toBe(true);
  });
});
