import { describe, expect, it, vi } from "vitest";
import { AudioNodeManager } from "../core/audioNodeManager";
import { createClipChain, createMasterChain, createTrackChain } from ".";

function createFakeAudioNode(context: BaseAudioContext): AudioNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as AudioNode;
}

function createFakeGainNode(context: BaseAudioContext): GainNode {
  return {
    ...createFakeAudioNode(context),
    gain: {
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setValueCurveAtTime: vi.fn(),
    },
  } as unknown as GainNode;
}

function createFakeContext(): BaseAudioContext {
  return {
    createGain: vi.fn(),
    createStereoPanner: vi.fn(),
  } as unknown as BaseAudioContext;
}

describe("mix chain factories", () => {
  it("creates clip chain as source stage into clip effects output", () => {
    const context = createFakeContext();
    const manager = new AudioNodeManager(context);
    const source = createFakeAudioNode(context);
    const clipGain = createFakeGainNode(context);
    const clipEffectsOutput = createFakeAudioNode(context);

    const chain = createClipChain({
      manager,
      source,
      clipGain,
      clipEffectsOutput,
      effects: [],
    });

    expect(chain.isOk()).toBe(true);
    expect(source.connect).toHaveBeenCalledWith(clipGain);
    expect(clipGain.connect).toHaveBeenCalledWith(clipEffectsOutput);
  });

  it("schedules clip fade automation on the clip gain", () => {
    const context = createFakeContext();
    const manager = new AudioNodeManager(context);
    const source = createFakeAudioNode(context);
    const clipGain = createFakeGainNode(context);
    const clipEffectsOutput = createFakeAudioNode(context);

    const chain = createClipChain({
      manager,
      source,
      clipGain,
      clipEffectsOutput,
      effects: [],
      playback: {
        baseGain: 0.5,
        clipStartTime: 10,
        clipDuration: 5,
        fadeIn: { duration: 0.25, curve: "Linear" },
        fadeOut: { duration: 1, curve: "Linear" },
      },
    });

    expect(chain.isOk()).toBe(true);
    expect(clipGain.gain.cancelScheduledValues).toHaveBeenCalledWith(10);
    expect(clipGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 10);
    expect(clipGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.5, 10.25);
    expect(clipGain.gain.setValueAtTime).toHaveBeenCalledWith(0.5, 14);
    expect(clipGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 15);
  });

  it("creates track chain as input bus through gain and pan into track effects output", () => {
    const context = createFakeContext();
    const manager = new AudioNodeManager(context);
    const trackInput = createFakeAudioNode(context);
    const trackGain = createFakeAudioNode(context);
    const trackPan = createFakeAudioNode(context);
    const trackEffectsOutput = createFakeAudioNode(context);

    const chain = createTrackChain({
      manager,
      trackInput,
      trackGain,
      trackPan,
      trackEffectsOutput,
      effects: [],
    });

    expect(chain.isOk()).toBe(true);
    expect(trackInput.connect).toHaveBeenCalledWith(trackGain);
    expect(trackGain.connect).toHaveBeenCalledWith(trackPan);
    expect(trackPan.connect).toHaveBeenCalledWith(trackEffectsOutput);
  });

  it("creates master chain as master input through gain and meter into destination output", () => {
    const context = createFakeContext();
    const manager = new AudioNodeManager(context);
    const masterInput = createFakeAudioNode(context);
    const masterGain = createFakeAudioNode(context);
    const meter = createFakeAudioNode(context);
    const destination = createFakeAudioNode(context);

    const chain = createMasterChain({
      manager,
      masterInput,
      masterGain,
      meter,
      destination,
      effects: [],
    });

    expect(chain.isOk()).toBe(true);
    expect(masterInput.connect).toHaveBeenCalledWith(masterGain);
    expect(masterGain.connect).toHaveBeenCalledWith(meter);
    expect(meter.connect).toHaveBeenCalledWith(destination);
  });

  it("connects clip chain to track chain, then track chain to master chain", () => {
    const context = createFakeContext();
    const manager = new AudioNodeManager(context);
    const source = createFakeAudioNode(context);
    const clipGain = createFakeGainNode(context);
    const clipOutput = createFakeAudioNode(context);
    const trackInput = createFakeAudioNode(context);
    const trackGain = createFakeAudioNode(context);
    const trackPan = createFakeAudioNode(context);
    const trackOutput = createFakeAudioNode(context);
    const masterInput = createFakeAudioNode(context);
    const masterGain = createFakeAudioNode(context);
    const meter = createFakeAudioNode(context);
    const destination = createFakeAudioNode(context);

    const clipChain = createClipChain({
      manager,
      source,
      clipGain,
      clipEffectsOutput: clipOutput,
      effects: [],
    })._unsafeUnwrap();
    const trackChain = createTrackChain({
      manager,
      trackInput,
      trackGain,
      trackPan,
      trackEffectsOutput: trackOutput,
      effects: [],
    })._unsafeUnwrap();
    const masterChain = createMasterChain({
      manager,
      masterInput,
      masterGain,
      meter,
      destination,
      effects: [],
    })._unsafeUnwrap();

    expect(clipChain.connectTo(trackChain.input).isOk()).toBe(true);
    expect(trackChain.connectTo(masterChain.input).isOk()).toBe(true);

    expect(clipOutput.connect).toHaveBeenCalledWith(trackInput);
    expect(trackOutput.connect).toHaveBeenCalledWith(masterInput);
  });
});
