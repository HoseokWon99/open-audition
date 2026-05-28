import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioEffect, AudioNodeManager } from "../core";
import { clamp } from "./effectParams";

const MIN_GAIN_DB = -96;
const MAX_GAIN_DB = 24;

export interface GainEffect extends AudioEffect {
  readonly input: GainNode;
  readonly output: GainNode;
  readonly gain: GainNode;
}

interface GainEffectOptions {
  context: BaseAudioContext;
  id: string;
  bypassed: boolean;
  gainDb: number;
}

export function createGainEffect(options: GainEffectOptions): GainEffect {
  const gain = options.context.createGain();
  const gainDb = clamp(options.gainDb, MIN_GAIN_DB, MAX_GAIN_DB);

  gain.gain.value = decibelsToLinear(gainDb);

  return {
    id: options.id,
    input: gain,
    output: gain,
    gain,
    bypassed: options.bypassed,
    activate: (manager) => activateGainEffect(manager, gain),
  };
}

function decibelsToLinear(gainDb: number): number {
  return 10 ** (gainDb / 20);
}

function activateGainEffect(manager: AudioNodeManager, gain: GainNode): Result<void, OpenAuditionError> {
  return manager.register(gain);
}
