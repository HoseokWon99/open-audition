import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import { createAudioChain, type AudioChain, type AudioEffect, type AudioNodeManager } from "../core";

export interface TrackChainOptions {
  manager: AudioNodeManager;
  trackInput: AudioNode;
  trackGain: AudioNode;
  trackPan: AudioNode;
  trackEffectsOutput: AudioNode;
  effects: AudioEffect[];
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
