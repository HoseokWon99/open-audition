import { describe, expect, it, vi } from "vitest";
import { AudioNodeManager } from "../core/audioNodeManager";
import { createEqEffect } from "./eqEffect";

interface FakeAudioParam {
  value: number;
}

type FakeBiquadFilter = BiquadFilterNode & {
  frequency: FakeAudioParam;
  Q: FakeAudioParam;
  gain: FakeAudioParam;
};

function createFakeGain(context: BaseAudioContext): GainNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 },
  } as unknown as GainNode;
}

function createFakeFilter(context: BaseAudioContext): FakeBiquadFilter {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
    type: "peaking",
    frequency: { value: 0 },
    Q: { value: 0 },
    gain: { value: 0 },
  } as unknown as FakeBiquadFilter;
}

describe("EqEffect", () => {
  it("sets three theatre-friendly EQ bands", () => {
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
      createBiquadFilter: vi.fn(() => createFakeFilter(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;

    const effect = createEqEffect({
      context,
      id: "eq-1",
      bypassed: false,
      lowGainDb: -3,
      midGainDb: 4,
      highGainDb: 2,
      lowFrequencyHz: 200,
      midFrequencyHz: 1500,
      highFrequencyHz: 6000,
      midQ: 1.5,
    });

    expect(effect.lowShelf.type).toBe("lowshelf");
    expect(effect.lowShelf.frequency.value).toBe(200);
    expect(effect.lowShelf.gain.value).toBe(-3);
    expect(effect.midPeak.type).toBe("peaking");
    expect(effect.midPeak.frequency.value).toBe(1500);
    expect(effect.midPeak.Q.value).toBe(1.5);
    expect(effect.midPeak.gain.value).toBe(4);
    expect(effect.highShelf.type).toBe("highshelf");
    expect(effect.highShelf.frequency.value).toBe(6000);
    expect(effect.highShelf.gain.value).toBe(2);
  });

  it("registers and wires the three EQ bands in order", () => {
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
      createBiquadFilter: vi.fn(() => createFakeFilter(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const effect = createEqEffect({
      context,
      id: "eq-1",
      bypassed: false,
      lowGainDb: 0,
      midGainDb: 0,
      highGainDb: 0,
      lowFrequencyHz: 320,
      midFrequencyHz: 1000,
      highFrequencyHz: 3200,
      midQ: 1,
    });

    const result = effect.activate(manager);

    expect(result.isOk()).toBe(true);
    expect(effect.input.connect).toHaveBeenCalledWith(effect.lowShelf);
    expect(effect.lowShelf.connect).toHaveBeenCalledWith(effect.midPeak);
    expect(effect.midPeak.connect).toHaveBeenCalledWith(effect.highShelf);
    expect(effect.highShelf.connect).toHaveBeenCalledWith(effect.output);
  });
});
