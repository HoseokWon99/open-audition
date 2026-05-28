import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioEffect } from "../core/audioEffect";
import type { AudioNodeManager } from "../core/audioNodeManager";
import { clamp } from "./effectParams";

const MIN_FREQUENCY_HZ = 20;
const MAX_FREQUENCY_HZ = 20_000;
const MIN_Q = 0.0001;
const MAX_Q = 100;
const MIN_FILTER_GAIN_DB = -40;
const MAX_FILTER_GAIN_DB = 40;

export type FilterType =
  | "LowPass"
  | "HighPass"
  | "BandPass"
  | "LowShelf"
  | "HighShelf"
  | "Peaking"
  | "Notch"
  | "AllPass";

export interface FilterEffect extends AudioEffect {
  readonly input: BiquadFilterNode;
  readonly output: BiquadFilterNode;
  readonly filter: BiquadFilterNode;
}

interface FilterEffectOptions {
  context: BaseAudioContext;
  id: string;
  bypassed: boolean;
  filterType: string;
  frequencyHz: number;
  q: number;
  gainDb: number;
}

export function createFilterEffect(options: FilterEffectOptions): FilterEffect {
  const filter = options.context.createBiquadFilter();

  filter.type = toBiquadFilterType(options.filterType);
  filter.frequency.value = clamp(options.frequencyHz, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ);
  filter.Q.value = clamp(options.q, MIN_Q, MAX_Q);
  filter.gain.value = clamp(options.gainDb, MIN_FILTER_GAIN_DB, MAX_FILTER_GAIN_DB);

  return {
    id: options.id,
    input: filter,
    output: filter,
    filter,
    bypassed: options.bypassed,
    activate: (manager) => activateFilterEffect(manager, filter),
  };
}

function toBiquadFilterType(filterType: string): BiquadFilterType {
  const mapping: Record<FilterType, BiquadFilterType> = {
    LowPass: "lowpass",
    HighPass: "highpass",
    BandPass: "bandpass",
    LowShelf: "lowshelf",
    HighShelf: "highshelf",
    Peaking: "peaking",
    Notch: "notch",
    AllPass: "allpass",
  };

  return mapping[filterType as FilterType] ?? "lowpass";
}

function activateFilterEffect(manager: AudioNodeManager, filter: BiquadFilterNode): Result<void, OpenAuditionError> {
  return manager.register(filter);
}
