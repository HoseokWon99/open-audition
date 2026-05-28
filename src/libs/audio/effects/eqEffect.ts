import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioEffect, AudioNodeManager } from "../core";
import { clamp } from "./effectParams";

const MIN_FREQUENCY_HZ = 20;
const MAX_FREQUENCY_HZ = 20_000;
const MIN_Q = 0.0001;
const MAX_Q = 100;
const MIN_EQ_GAIN_DB = -24;
const MAX_EQ_GAIN_DB = 24;

export interface EqEffect extends AudioEffect {
  readonly input: GainNode;
  readonly output: GainNode;
  readonly lowShelf: BiquadFilterNode;
  readonly midPeak: BiquadFilterNode;
  readonly highShelf: BiquadFilterNode;
}

interface EqEffectOptions {
  context: BaseAudioContext;
  id: string;
  bypassed: boolean;
  lowGainDb: number;
  midGainDb: number;
  highGainDb: number;
  lowFrequencyHz: number;
  midFrequencyHz: number;
  highFrequencyHz: number;
  midQ: number;
}

export function createEqEffect(options: EqEffectOptions): EqEffect {
  const input = options.context.createGain();
  const output = options.context.createGain();
  const lowShelf = options.context.createBiquadFilter();
  const midPeak = options.context.createBiquadFilter();
  const highShelf = options.context.createBiquadFilter();

  lowShelf.type = "lowshelf";
  lowShelf.frequency.value = clamp(options.lowFrequencyHz, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ);
  lowShelf.gain.value = clamp(options.lowGainDb, MIN_EQ_GAIN_DB, MAX_EQ_GAIN_DB);

  midPeak.type = "peaking";
  midPeak.frequency.value = clamp(options.midFrequencyHz, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ);
  midPeak.Q.value = clamp(options.midQ, MIN_Q, MAX_Q);
  midPeak.gain.value = clamp(options.midGainDb, MIN_EQ_GAIN_DB, MAX_EQ_GAIN_DB);

  highShelf.type = "highshelf";
  highShelf.frequency.value = clamp(options.highFrequencyHz, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ);
  highShelf.gain.value = clamp(options.highGainDb, MIN_EQ_GAIN_DB, MAX_EQ_GAIN_DB);

  return {
    id: options.id,
    input,
    output,
    lowShelf,
    midPeak,
    highShelf,
    bypassed: options.bypassed,
    activate: (manager) => activateEqEffect(manager, input, output, lowShelf, midPeak, highShelf),
  };
}

function activateEqEffect(
  manager: AudioNodeManager,
  input: GainNode,
  output: GainNode,
  lowShelf: BiquadFilterNode,
  midPeak: BiquadFilterNode,
  highShelf: BiquadFilterNode,
): Result<void, OpenAuditionError> {
  const nodes = [input, output, lowShelf, midPeak, highShelf];

  for (const node of nodes) {
    const registerResult = manager.register(node);

    if (registerResult.isErr()) {
      return err(registerResult.error);
    }
  }

  const edges: Array<[AudioNode, AudioNode]> = [
    [input, lowShelf],
    [lowShelf, midPeak],
    [midPeak, highShelf],
    [highShelf, output],
  ];

  for (const [from, to] of edges) {
    const connectResult = manager.connect(from, to);

    if (connectResult.isErr()) {
      return err(connectResult.error);
    }
  }

  return ok(undefined);
}
