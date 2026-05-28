import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { Effect } from "../../../types/audio";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioEffect } from "../core/audioEffect";
import { createDelayEffect } from "./delayEffect";
import { getNumberParam, getStringParam } from "./effectParams";
import { createReverbEffect } from "./reverbEffect";

interface CreateRuntimeEffectOptions {
  context: BaseAudioContext;
  effect: Effect;
  impulseResponses: ReadonlyMap<string, AudioBuffer>;
}

export function createRuntimeEffect(options: CreateRuntimeEffectOptions): Result<AudioEffect, OpenAuditionError> {
  const { context, effect, impulseResponses } = options;
  const id = `effect-${effect.index}-${effect.type.toLowerCase()}`;
  const bypassed = !effect.enabled;

  if (effect.type === "Delay") {
    return ok(
      createDelayEffect({
        context,
        id,
        bypassed,
        delaySeconds: getNumberParam(effect.params, "delaySeconds", 0.25),
        feedback: getNumberParam(effect.params, "feedback", 0.3),
        mix: getNumberParam(effect.params, "mix", 0.25),
      }),
    );
  }

  if (effect.type === "Reverb") {
    const impulseId = getStringParam(effect.params, "impulseId", "default");
    const impulseBuffer = impulseResponses.get(impulseId);

    if (impulseBuffer === undefined) {
      return err({
        type: "AudioEffectImpulseMissing",
        message: `Missing impulse response for reverb effect: ${impulseId}`,
        data: { impulseId, effect },
      });
    }

    return ok(
      createReverbEffect({
        context,
        id,
        bypassed,
        impulseBuffer,
        mix: getNumberParam(effect.params, "mix", 0.2),
      }),
    );
  }

  return err({
    type: "AudioEffectUnsupported",
    message: `Realtime effect is not supported: ${effect.type}`,
    data: { effect },
  });
}
