import { clamp } from "../../../utils/math";

interface WaveformSampleOptions {
  count: number;
  attackPercent: number;
  decayStartPercent: number;
  floor: number;
  phraseFrequency: number;
  phraseSecondaryFrequency: number;
  transientEvery: number[];
}

const maxSample = 0.94;

export function createWaveformSamples({
  count,
  attackPercent,
  decayStartPercent,
  floor,
  phraseFrequency,
  phraseSecondaryFrequency,
  transientEvery,
}: WaveformSampleOptions): number[] {
  return Array.from({ length: count }, (_, index) => {
    const progress = count <= 1 ? 0 : index / (count - 1);
    const attack = progress < attackPercent ? progress / attackPercent : 1;
    const decay =
      progress > decayStartPercent
        ? Math.max(0.1, 1 - (progress - decayStartPercent) / (1 - decayStartPercent))
        : 1;
    const phrase =
      0.45 +
      Math.sin(index * phraseFrequency) * 0.14 +
      Math.sin(index * phraseSecondaryFrequency) * 0.18;
    const texture = Math.abs(Math.sin(index * 1.68) * Math.cos(index * 0.39)) * 0.29;
    const transient = transientEvery.some((interval) => index % interval === 0) ? 0.4 : 0;

    return clamp((phrase + texture + transient) * attack * decay, floor, maxSample);
  });
}

export function createWaveformPolygonPoints(samples: number[]): string {
  const upperPoints = samples.map((sample, index) => {
    const x = samples.length <= 1 ? 0 : (index / (samples.length - 1)) * 100;
    const y = 50 - sample * 48;

    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const lowerPoints = samples
    .map((sample, index) => {
      const x = samples.length <= 1 ? 0 : (index / (samples.length - 1)) * 100;
      const y = 50 + sample * 48;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .reverse();

  return [...upperPoints, ...lowerPoints].join(" ");
}
