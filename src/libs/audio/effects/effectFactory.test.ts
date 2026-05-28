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
    createConvolver: vi.fn(() => createFakeConvolver(context as unknown as BaseAudioContext)),
  };

  return context as unknown as BaseAudioContext;
}

describe("createRuntimeEffect", () => {
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

  it("returns an error for realtime-unsupported effects", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 3,
      type: "NoiseReduction",
      enabled: true,
      params: [],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("AudioEffectUnsupported");
  });
});
