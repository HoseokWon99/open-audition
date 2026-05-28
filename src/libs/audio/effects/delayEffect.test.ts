import { describe, expect, it, vi } from "vitest";
import { AudioNodeManager } from "../core/audioNodeManager";
import { createDelayEffect } from "./delayEffect";

interface FakeAudioParam {
  value: number;
}

interface FakeAudioNode extends AudioNode {
  delayTime?: FakeAudioParam;
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

function createFakeDelay(context: BaseAudioContext): DelayNode {
  return {
    ...createFakeAudioNode(context),
    delayTime: { value: 0 },
  } as unknown as DelayNode;
}

describe("DelayEffect", () => {
  it("sets clamped delay, feedback, and mix parameters", () => {
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
      createDelay: vi.fn(() => createFakeDelay(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;

    const effect = createDelayEffect({
      context,
      id: "delay-1",
      bypassed: false,
      delaySeconds: 12,
      feedback: 2,
      mix: -1,
    });

    expect(effect.delay.delayTime.value).toBe(5);
    expect(effect.feedback.gain.value).toBe(0.95);
    expect(effect.dryGain.gain.value).toBe(1);
    expect(effect.wetGain.gain.value).toBe(0);
  });

  it("registers and wires its internal delay graph", () => {
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
      createDelay: vi.fn(() => createFakeDelay(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const effect = createDelayEffect({
      context,
      id: "delay-1",
      bypassed: false,
      delaySeconds: 0.25,
      feedback: 0.4,
      mix: 0.35,
    });

    const result = effect.activate(manager);

    expect(result.isOk()).toBe(true);
    expect(effect.input.connect).toHaveBeenCalledWith(effect.dryGain);
    expect(effect.dryGain.connect).toHaveBeenCalledWith(effect.output);
    expect(effect.input.connect).toHaveBeenCalledWith(effect.delay);
    expect(effect.delay.connect).toHaveBeenCalledWith(effect.wetGain);
    expect(effect.wetGain.connect).toHaveBeenCalledWith(effect.output);
    expect(effect.delay.connect).toHaveBeenCalledWith(effect.feedback);
    expect(effect.feedback.connect).toHaveBeenCalledWith(effect.delay);
  });
});
