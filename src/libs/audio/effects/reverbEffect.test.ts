import { describe, expect, it, vi } from "vitest";
import { AudioNodeManager } from "../core";
import { createReverbEffect } from "./reverbEffect";

interface FakeAudioParam {
  value: number;
}

interface FakeAudioNode extends AudioNode {
  buffer?: AudioBuffer | null;
  gain?: FakeAudioParam;
}

function createFakeAudioNode(context: BaseAudioContext): FakeAudioNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as FakeAudioNode;
}

function createFakeGain(context: BaseAudioContext): GainNode {
  return {
    ...createFakeAudioNode(context),
    gain: { value: 1 },
  } as unknown as GainNode;
}

function createFakeConvolver(context: BaseAudioContext): ConvolverNode {
  return {
    ...createFakeAudioNode(context),
    buffer: null,
  } as unknown as ConvolverNode;
}

describe("ReverbEffect", () => {
  it("sets impulse response and clamped mix parameters", () => {
    const impulseBuffer = {} as AudioBuffer;
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
      createConvolver: vi.fn(() => createFakeConvolver(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;

    const effect = createReverbEffect({
      context,
      id: "reverb-1",
      impulseBuffer,
      mix: 2,
    });

    expect(effect.convolver.buffer).toBe(impulseBuffer);
    expect(effect.dryGain.gain.value).toBe(0);
    expect(effect.wetGain.gain.value).toBe(1);
  });

  it("registers and wires its internal convolution graph", () => {
    const impulseBuffer = {} as AudioBuffer;
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
      createConvolver: vi.fn(() => createFakeConvolver(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const effect = createReverbEffect({
      context,
      id: "reverb-1",
      impulseBuffer,
      mix: 0.25,
    });

    const result = effect.activate(manager);

    expect(result.isOk()).toBe(true);
    expect(effect.input.connect).toHaveBeenCalledWith(effect.dryGain);
    expect(effect.dryGain.connect).toHaveBeenCalledWith(effect.output);
    expect(effect.input.connect).toHaveBeenCalledWith(effect.convolver);
    expect(effect.convolver.connect).toHaveBeenCalledWith(effect.wetGain);
    expect(effect.wetGain.connect).toHaveBeenCalledWith(effect.output);
  });
});
