import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import { scheduleClipFadeAutomation, type ClipFadeAutomationOptions } from "../automation";
import { createAudioChain, type AudioChain, type AudioEffect, type AudioNodeManager } from "../core";

export interface ClipChainOptions {
  manager: AudioNodeManager;
  source: AudioNode;
  clipGain: GainNode;
  clipEffectsOutput: AudioNode;
  effects: AudioEffect[];
  playback?: ClipFadeAutomationOptions;
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
