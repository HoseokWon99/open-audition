import type { EffectParamType, EffectType, FadeCurve, KeyframeTarget } from "../../../../types/multitrack";
import { mapXmlValue } from "./primitives";

export const fadeCurveSchema = mapXmlValue<FadeCurve>(
  {
    linear: "Linear",
    equalPower: "EqualPower",
    exponential: "Exponential",
    logarithmic: "Logarithmic",
  },
  "fade curve",
);

export const keyframeTargetSchema = mapXmlValue<KeyframeTarget>(
  {
    gainDb: "GainDb",
    pan: "Pan",
  },
  "keyframe target",
);

export const effectTypeSchema = mapXmlValue<EffectType>(
  {
    gain: "Gain",
    eq: "Eq",
    filter: "Filter",
    reverb: "Reverb",
    delay: "Delay",
    pitchShift: "PitchShift",
    timeStretch: "TimeStretch",
    noiseReduction: "NoiseReduction",
    normalize: "Normalize",
  },
  "effect type",
);

export const effectParamTypeSchema = mapXmlValue<EffectParamType>(
  {
    number: "Number",
    string: "String",
    boolean: "Boolean",
  },
  "effect param type",
);
