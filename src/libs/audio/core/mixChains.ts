import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { Fade } from "../../../types/multitrack";
import { createAudioChain } from "./audioChain";
import type { AudioChain } from "./audioChain";
import type { AudioEffect } from "./audioEffect";
import type { AudioNodeManager } from "./audioNodeManager";

const MIN_EXPONENTIAL_GAIN = 0.0001;
const FADE_CURVE_POINT_COUNT = 64;

interface ClipPlaybackOptions {
  baseGain: number;
  clipStartTime: number;
  clipDuration: number;
  fadeIn: Fade | null;
  fadeOut: Fade | null;
}

export interface ClipChainOptions {
  manager: AudioNodeManager;
  source: AudioNode;
  clipGain: GainNode;
  clipEffectsOutput: AudioNode;
  effects: AudioEffect[];
  playback?: ClipPlaybackOptions;
}

export interface TrackChainOptions {
  manager: AudioNodeManager;
  trackInput: AudioNode;
  trackGain: AudioNode;
  trackPan: AudioNode;
  trackEffectsOutput: AudioNode;
  effects: AudioEffect[];
}

export interface MasterChainOptions {
  manager: AudioNodeManager;
  masterInput: AudioNode;
  masterGain: AudioNode;
  meter: AudioNode;
  destination: AudioNode;
  effects: AudioEffect[];
}

export function createClipChain(options: ClipChainOptions): Result<AudioChain, OpenAuditionError> {
  if (options.playback) {
    scheduleClipFadeAutomation(options.clipGain.gain, options.playback);
  }

  return createAudioChain({
    manager: options.manager,
    input: options.source,
    output: options.clipEffectsOutput,
    effects: [
      {
        id: "clip-gain",
        input: options.clipGain,
        output: options.clipGain,
        activate: (manager) => manager.register(options.clipGain),
      },
      ...options.effects,
    ],
  });
}

export function scheduleClipFadeAutomation(gain: AudioParam, options: ClipPlaybackOptions): void {
  const startTime = Math.max(0, options.clipStartTime);
  const duration = Math.max(0, options.clipDuration);
  const endTime = startTime + duration;
  const fadeInDuration = clampFadeDuration(options.fadeIn?.duration ?? 0, duration);
  const fadeOutDuration = clampFadeDuration(options.fadeOut?.duration ?? 0, duration - fadeInDuration);
  const fadeInEndTime = startTime + fadeInDuration;
  const fadeOutStartTime = endTime - fadeOutDuration;
  const baseGain = Math.max(0, options.baseGain);

  gain.cancelScheduledValues(startTime);

  if (fadeInDuration > 0 && options.fadeIn) {
    scheduleFadeRamp(gain, options.fadeIn, startTime, fadeInDuration, 0, baseGain);
  } else {
    gain.setValueAtTime(baseGain, startTime);
  }

  if (fadeOutDuration > 0 && options.fadeOut) {
    gain.setValueAtTime(baseGain, Math.max(fadeInEndTime, fadeOutStartTime));
    scheduleFadeRamp(gain, options.fadeOut, fadeOutStartTime, fadeOutDuration, baseGain, 0);
  } else {
    gain.setValueAtTime(baseGain, fadeInEndTime);
  }
}

function clampFadeDuration(duration: number, maxDuration: number): number {
  return Math.max(0, Math.min(duration, Math.max(0, maxDuration)));
}

function scheduleFadeRamp(
  gain: AudioParam,
  fade: Fade,
  startTime: number,
  duration: number,
  startGain: number,
  endGain: number,
): void {
  if (fade.curve === "Linear") {
    gain.setValueAtTime(startGain, startTime);
    gain.linearRampToValueAtTime(endGain, startTime + duration);
    return;
  }

  if (fade.curve === "Exponential") {
    gain.setValueAtTime(Math.max(startGain, MIN_EXPONENTIAL_GAIN), startTime);
    gain.exponentialRampToValueAtTime(Math.max(endGain, MIN_EXPONENTIAL_GAIN), startTime + duration);
    return;
  }

  gain.setValueCurveAtTime(createFadeCurve(fade.curve, startGain, endGain), startTime, duration);
}

function createFadeCurve(curve: Fade["curve"], startGain: number, endGain: number): Float32Array {
  const values = new Float32Array(FADE_CURVE_POINT_COUNT);

  for (let index = 0; index < values.length; index += 1) {
    const progress = index / (values.length - 1);
    values[index] = startGain + (endGain - startGain) * curveProgress(curve, progress);
  }

  return values;
}

function curveProgress(curve: Fade["curve"], progress: number): number {
  if (curve === "EqualPower") {
    return Math.sin((progress * Math.PI) / 2);
  }

  if (curve === "Logarithmic") {
    return Math.log10(1 + progress * 9);
  }

  return progress;
}

export function createTrackChain(options: TrackChainOptions): Result<AudioChain, OpenAuditionError> {
  return createAudioChain({
    manager: options.manager,
    input: options.trackInput,
    output: options.trackEffectsOutput,
    effects: [
      {
        id: "track-gain",
        input: options.trackGain,
        output: options.trackGain,
        activate: (manager) => manager.register(options.trackGain),
      },
      {
        id: "track-pan",
        input: options.trackPan,
        output: options.trackPan,
        activate: (manager) => manager.register(options.trackPan),
      },
      ...options.effects,
    ],
  });
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
