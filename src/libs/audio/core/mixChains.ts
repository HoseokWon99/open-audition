import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import { scheduleClipFadeAutomation } from "../automation/fades";
import type { ClipFadeAutomationOptions } from "../automation/fades";
import { createAudioChain } from "./audioChain";
import type { AudioChain } from "./audioChain";
import type { AudioEffect } from "./audioEffect";
import type { AudioNodeManager } from "./audioNodeManager";

export interface ClipChainOptions {
  manager: AudioNodeManager;
  source: AudioNode;
  clipGain: GainNode;
  clipEffectsOutput: AudioNode;
  effects: AudioEffect[];
  playback?: ClipFadeAutomationOptions;
}

export interface TrackChainOptions {
  manager: AudioNodeManager;
  trackInput: AudioNode;
  trackGain: AudioNode;
  trackPan: AudioNode;
  trackEffectsOutput: AudioNode;
  effects: AudioEffect[];
}

export interface MasterChainOptions {
  manager: AudioNodeManager;
  masterInput: AudioNode;
  masterGain: AudioNode;
  meter: AudioNode;
  destination: AudioNode;
  effects: AudioEffect[];
}

export function createClipChain(options: ClipChainOptions): Result<AudioChain, OpenAuditionError> {
  if (options.playback) {
    scheduleClipFadeAutomation(options.clipGain.gain, options.playback);
  }

  return createAudioChain({
    manager: options.manager,
    input: options.source,
    output: options.clipEffectsOutput,
    effects: [
      {
        id: "clip-gain",
        input: options.clipGain,
        output: options.clipGain,
        activate: (manager) => manager.register(options.clipGain),
      },
      ...options.effects,
    ],
  });
}

export function createTrackChain(options: TrackChainOptions): Result<AudioChain, OpenAuditionError> {
  return createAudioChain({
    manager: options.manager,
    input: options.trackInput,
    output: options.trackEffectsOutput,
    effects: [
      {
        id: "track-gain",
        input: options.trackGain,
        output: options.trackGain,
        activate: (manager) => manager.register(options.trackGain),
      },
      {
        id: "track-pan",
        input: options.trackPan,
        output: options.trackPan,
        activate: (manager) => manager.register(options.trackPan),
      },
      ...options.effects,
    ],
  });
}

export function createMasterChain(options: MasterChainOptions): Result<AudioChain, OpenAuditionError> {
  return createAudioChain({
    manager: options.manager,
    input: options.masterInput,
    output: options.destination,
    effects: [
      {
        id: "master-gain",
        input: options.masterGain,
        output: options.masterGain,
        activate: (manager) => manager.register(options.masterGain),
      },
      ...options.effects,
      {
        id: "master-meter",
        input: options.meter,
        output: options.meter,
        activate: (manager) => manager.register(options.meter),
      },
    ],
  });
}
