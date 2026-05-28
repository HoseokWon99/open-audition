import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioEffect, AudioNodeManager } from "../core";
import { clamp } from "./effectParams";

const MAX_DELAY_SECONDS = 5;
const MAX_FEEDBACK = 0.95;

export interface DelayEffect extends AudioEffect {
  readonly input: GainNode;
  readonly output: GainNode;
  readonly dryGain: GainNode;
  readonly wetGain: GainNode;
  readonly delay: DelayNode;
  readonly feedback: GainNode;
}

interface DelayEffectOptions {
  context: BaseAudioContext;
  id: string;
  bypassed: boolean;
  delaySeconds: number;
  feedback: number;
  mix: number;
}

export function createDelayEffect(options: DelayEffectOptions): DelayEffect {
  const input = options.context.createGain();
  const output = options.context.createGain();
  const dryGain = options.context.createGain();
  const wetGain = options.context.createGain();
  const delay = options.context.createDelay(MAX_DELAY_SECONDS);
  const feedback = options.context.createGain();
  const mix = clamp(options.mix, 0, 1);

  delay.delayTime.value = clamp(options.delaySeconds, 0, MAX_DELAY_SECONDS);
  feedback.gain.value = clamp(options.feedback, 0, MAX_FEEDBACK);
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  return {
    id: options.id,
    input,
    output,
    dryGain,
    wetGain,
    delay,
    feedback,
    bypassed: options.bypassed,
    activate: (manager) => activateDelayEffect(manager, input, output, dryGain, wetGain, delay, feedback),
  };
}

function activateDelayEffect(
  manager: AudioNodeManager,
  input: GainNode,
  output: GainNode,
  dryGain: GainNode,
  wetGain: GainNode,
  delay: DelayNode,
  feedback: GainNode,
): Result<void, OpenAuditionError> {
  const nodes = [input, output, dryGain, wetGain, delay, feedback];

  for (const node of nodes) {
    const registerResult = manager.register(node);

    if (registerResult.isErr()) {
      return err(registerResult.error);
    }
  }

  const edges: Array<[AudioNode, AudioNode]> = [
    [input, dryGain],
    [dryGain, output],
    [input, delay],
    [delay, wetGain],
    [wetGain, output],
    [delay, feedback],
    [feedback, delay],
  ];

  for (const [from, to] of edges) {
    const connectResult = manager.connect(from, to);

    if (connectResult.isErr()) {
      return err(connectResult.error);
    }
  }

  return ok(undefined);
}
