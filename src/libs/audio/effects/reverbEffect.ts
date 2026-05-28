import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioEffect } from "../core/audioEffect";
import type { AudioNodeManager } from "../core/audioNodeManager";
import { clamp } from "./effectParams";

export interface ReverbEffect extends AudioEffect {
  readonly input: GainNode;
  readonly output: GainNode;
  readonly dryGain: GainNode;
  readonly wetGain: GainNode;
  readonly convolver: ConvolverNode;
}

interface ReverbEffectOptions {
  context: BaseAudioContext;
  id: string;
  bypassed: boolean;
  impulseBuffer: AudioBuffer;
  mix: number;
}

export function createReverbEffect(options: ReverbEffectOptions): ReverbEffect {
  const input = options.context.createGain();
  const output = options.context.createGain();
  const dryGain = options.context.createGain();
  const wetGain = options.context.createGain();
  const convolver = options.context.createConvolver();
  const mix = clamp(options.mix, 0, 1);

  convolver.buffer = options.impulseBuffer;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  return {
    id: options.id,
    input,
    output,
    dryGain,
    wetGain,
    convolver,
    bypassed: options.bypassed,
    activate: (manager) => activateReverbEffect(manager, input, output, dryGain, wetGain, convolver),
  };
}

function activateReverbEffect(
  manager: AudioNodeManager,
  input: GainNode,
  output: GainNode,
  dryGain: GainNode,
  wetGain: GainNode,
  convolver: ConvolverNode,
): Result<void, OpenAuditionError> {
  const nodes = [input, output, dryGain, wetGain, convolver];

  for (const node of nodes) {
    const registerResult = manager.register(node);

    if (registerResult.isErr()) {
      return err(registerResult.error);
    }
  }

  const edges: Array<[AudioNode, AudioNode]> = [
    [input, dryGain],
    [dryGain, output],
    [input, convolver],
    [convolver, wetGain],
    [wetGain, output],
  ];

  for (const [from, to] of edges) {
    const connectResult = manager.connect(from, to);

    if (connectResult.isErr()) {
      return err(connectResult.error);
    }
  }

  return ok(undefined);
}
