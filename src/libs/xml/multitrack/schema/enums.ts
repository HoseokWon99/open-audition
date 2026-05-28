import type { EffectParamType } from "../../../audio/effects/effectParams";
import type { EffectType, FadeCurve, KeyframeCurve, KeyframeTarget, TrackHeight } from "../../../../types/audio";
import { mapXmlValue } from "./primitives";

export const trackHeightSchema = mapXmlValue<TrackHeight>(
  {
    small: "Small",
    medium: "Medium",
    large: "Large",
  },
  "track height",
);

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

export const keyframeCurveSchema = mapXmlValue<KeyframeCurve>(
  {
    hold: "Hold",
    linear: "Linear",
    easeIn: "EaseIn",
    easeOut: "EaseOut",
  },
  "keyframe curve",
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
