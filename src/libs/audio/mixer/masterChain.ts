import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import { createAudioChain, type AudioChain, type AudioEffect, type AudioNodeManager } from "../core";

export interface MasterChainOptions {
  manager: AudioNodeManager;
  masterInput: AudioNode;
  masterGain: AudioNode;
  meter: AudioNode;
  destination: AudioNode;
  effects: AudioEffect[];
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
