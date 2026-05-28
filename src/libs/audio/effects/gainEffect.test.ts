import { describe, expect, it, vi } from "vitest";
import { AudioNodeManager } from "../core/audioNodeManager";
import { createGainEffect } from "./gainEffect";

function createFakeGain(context: BaseAudioContext): GainNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 },
  } as unknown as GainNode;
}

describe("GainEffect", () => {
  it("converts decibels to linear gain", () => {
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;

    const effect = createGainEffect({
      context,
      id: "gain-1",
      bypassed: false,
      gainDb: 6,
    });

    expect(effect.gain.gain.value).toBeCloseTo(1.995, 3);
  });

  it("registers the gain node", () => {
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const effect = createGainEffect({
      context,
      id: "gain-1",
      bypassed: false,
      gainDb: -3,
    });

    expect(effect.activate(manager).isOk()).toBe(true);
  });
});
