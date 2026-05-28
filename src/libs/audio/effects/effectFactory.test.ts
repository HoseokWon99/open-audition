import { describe, expect, it, vi } from "vitest";
import type { Effect } from "../../../types/audio";
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
      type: "Gain",
      enabled: true,
      params: [{ name: "gainDb", type: "Number", value: 3 }],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().id).toBe("effect-0-gain");
  });

  it("creates an EQ effect from serializable effect params", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 4,
      type: "Eq",
      enabled: true,
      params: [
        { name: "lowGainDb", type: "Number", value: -2 },
        { name: "midGainDb", type: "Number", value: 1 },
        { name: "highGainDb", type: "Number", value: 3 },
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
      type: "Filter",
      enabled: true,
      params: [
        { name: "filterType", type: "String", value: "HighPass" },
        { name: "frequencyHz", type: "Number", value: 120 },
        { name: "q", type: "Number", value: 0.9 },
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
      type: "Delay",
      enabled: true,
      params: [
        { name: "delaySeconds", type: "Number", value: 0.35 },
        { name: "feedback", type: "Number", value: 0.45 },
        { name: "mix", type: "Number", value: 0.4 },
      ],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isOk()).toBe(true);
    const runtimeEffect = result._unsafeUnwrap();
    expect(runtimeEffect.id).toBe("effect-0-delay");
    expect(runtimeEffect.bypassed).toBe(false);
  });

  it("maps disabled serializable effects to bypassed runtime effects", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 2,
      type: "Delay",
      enabled: false,
      params: [],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().bypassed).toBe(true);
  });

  it("creates a reverb effect when the impulse response exists", () => {
    const context = createFakeContext();
    const impulseBuffer = {} as AudioBuffer;
    const effect: Effect = {
      index: 1,
      type: "Reverb",
      enabled: true,
      params: [
        { name: "impulseId", type: "String", value: "small-hall" },
        { name: "mix", type: "Number", value: 0.2 },
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
      type: "Reverb",
      enabled: true,
      params: [{ name: "impulseId", type: "String", value: "missing-room" }],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("AudioEffectImpulseMissing");
  });

  it("returns an offline-only error for non-realtime effects", () => {
    const context = createFakeContext();
    const offlineTypes: Effect["type"][] = ["Normalize", "PitchShift", "TimeStretch", "NoiseReduction"];

    for (const type of offlineTypes) {
      const effect: Effect = {
        index: 3,
        type,
        enabled: true,
        params: [],
      };

      const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().type).toBe("AudioEffectOfflineOnly");
    }
  });
});
