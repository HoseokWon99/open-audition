import { describe, expect, it, vi } from "vitest";
import type { Effect } from "../../../types/multitrack";
import { createRuntimeEffect } from "./effectFactory";

function createFakeGain(context: BaseAudioContext): GainNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 },
  } as unknown as GainNode;
}

function createFakeDelay(context: BaseAudioContext): DelayNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
    delayTime: { value: 0 },
  } as unknown as DelayNode;
}

function createFakeFilter(context: BaseAudioContext): BiquadFilterNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
    type: "lowpass",
    frequency: { value: 0 },
    Q: { value: 0 },
    gain: { value: 0 },
  } as unknown as BiquadFilterNode;
}

function createFakeConvolver(context: BaseAudioContext): ConvolverNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
    buffer: null,
  } as unknown as ConvolverNode;
}

function createFakeContext(): BaseAudioContext {
  const context = {
    createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
    createDelay: vi.fn(() => createFakeDelay(context as unknown as BaseAudioContext)),
    createBiquadFilter: vi.fn(() => createFakeFilter(context as unknown as BaseAudioContext)),
    createConvolver: vi.fn(() => createFakeConvolver(context as unknown as BaseAudioContext)),
  };

  return context as unknown as BaseAudioContext;
}

describe("createRuntimeEffect", () => {
  it("creates a gain effect from serializable effect params", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 0,
      kind: "Gain",
      params: [{ name: "gainDb", kind: "Number", value: 3 }],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().id).toBe("effect-0-gain");
  });

  it("creates an EQ effect from serializable effect params", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 4,
      kind: "Eq",
      params: [
        { name: "lowGainDb", kind: "Number", value: -2 },
        { name: "midGainDb", kind: "Number", value: 1 },
        { name: "highGainDb", kind: "Number", value: 3 },
      ],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().id).toBe("effect-4-eq");
  });

  it("creates a filter effect from serializable effect params", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 5,
      kind: "Filter",
      params: [
        { name: "filterType", kind: "String", value: "HighPass" },
        { name: "frequencyHz", kind: "Number", value: 120 },
        { name: "q", kind: "Number", value: 0.9 },
      ],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().id).toBe("effect-5-filter");
  });

  it("creates a delay effect from serializable effect params", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 0,
      kind: "Delay",
      params: [
        { name: "delaySeconds", kind: "Number", value: 0.35 },
        { name: "feedback", kind: "Number", value: 0.45 },
        { name: "mix", kind: "Number", value: 0.4 },
      ],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isOk()).toBe(true);
    const runtimeEffect = result._unsafeUnwrap();
    expect(runtimeEffect.id).toBe("effect-0-delay");
  });

  it("creates a reverb effect when the impulse response exists", () => {
    const context = createFakeContext();
    const impulseBuffer = {} as AudioBuffer;
    const effect: Effect = {
      index: 1,
      kind: "Reverb",
      params: [
        { name: "impulseId", kind: "String", value: "small-hall" },
        { name: "mix", kind: "Number", value: 0.2 },
      ],
    };

    const result = createRuntimeEffect({
      context,
      effect,
      impulseResponses: new Map([["small-hall", impulseBuffer]]),
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().id).toBe("effect-1-reverb");
  });

  it("returns an error when a reverb impulse response is missing", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 1,
      kind: "Reverb",
      params: [{ name: "impulseId", kind: "String", value: "missing-room" }],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("AudioEffectImpulseMissing");
  });

  it("returns an offline-only error for non-realtime effects", () => {
    const context = createFakeContext();
    const offlineKinds: Effect["kind"][] = ["Normalize", "PitchShift", "TimeStretch", "NoiseReduction"];

    for (const kind of offlineKinds) {
      const effect: Effect = {
        index: 3,
        kind,
        params: [],
      };

      const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().type).toBe("AudioEffectOfflineOnly");
    }
  });
});
