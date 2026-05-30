import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { Effect } from "../../../types/audio";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioEffect } from "../core";
import { createDelayEffect } from "./delayEffect";
import { createEqEffect } from "./eqEffect";
import { getNumberParam, getStringParam } from "./effectParams";
import { createFilterEffect } from "./filterEffect";
import { createGainEffect } from "./gainEffect";
import { createReverbEffect } from "./reverbEffect";

interface CreateRuntimeEffectOptions {
  context: BaseAudioContext;
  effect: Effect;
  impulseResponses: ReadonlyMap<string, AudioBuffer>;
}

export function createRuntimeEffect(options: CreateRuntimeEffectOptions): Result<AudioEffect, OpenAuditionError> {
  const { context, effect, impulseResponses } = options;
  const id = `effect-${effect.index}-${effect.type.toLowerCase()}`;

  if (effect.type === "Gain") {
    return ok(
      createGainEffect({
        context,
        id,
        gainDb: getNumberParam(effect.params, "gainDb", 0),
      }),
    );
  }

  if (effect.type === "Eq") {
    return ok(
      createEqEffect({
        context,
        id,
        lowGainDb: getNumberParam(effect.params, "lowGainDb", 0),
        midGainDb: getNumberParam(effect.params, "midGainDb", 0),
        highGainDb: getNumberParam(effect.params, "highGainDb", 0),
        lowFrequencyHz: getNumberParam(effect.params, "lowFrequencyHz", 320),
        midFrequencyHz: getNumberParam(effect.params, "midFrequencyHz", 1000),
        highFrequencyHz: getNumberParam(effect.params, "highFrequencyHz", 3200),
        midQ: getNumberParam(effect.params, "midQ", 1),
      }),
    );
  }

  if (effect.type === "Filter") {
    return ok(
      createFilterEffect({
        context,
        id,
        filterType: getStringParam(effect.params, "filterType", "LowPass"),
        frequencyHz: getNumberParam(effect.params, "frequencyHz", 1000),
        q: getNumberParam(effect.params, "q", 0.707),
        gainDb: getNumberParam(effect.params, "gainDb", 0),
      }),
    );
  }

  if (effect.type === "Delay") {
    return ok(
      createDelayEffect({
        context,
        id,
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
        impulseBuffer,
        mix: getNumberParam(effect.params, "mix", 0.2),
      }),
    );
  }

  if (
    effect.type === "Normalize" ||
    effect.type === "PitchShift" ||
    effect.type === "TimeStretch" ||
    effect.type === "NoiseReduction"
  ) {
    return err({
      type: "AudioEffectOfflineOnly",
      message: `Effect is only available in offline processing: ${effect.type}`,
      data: { effect },
    });
  }

  return err({
    type: "AudioEffectUnsupported",
    message: `Realtime effect is not supported: ${effect.type}`,
    data: { effect },
  });
}
