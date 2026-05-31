import type { MediaFile } from "../../types/audio";
import { clamp } from "../../utils/math";

interface ClipWaveformPreviewProps {
  file?: MediaFile;
}

const waveformSamples = Array.from({ length: 260 }, (_, index) => {
  const progress = index / 259;
  const attack = progress < 0.06 ? progress / 0.06 : 1;
  const decay = progress > 0.56 ? Math.max(0.1, 1 - (progress - 0.56) / 0.44) : 1;
  const phrase = 0.45 + Math.sin(index * 0.1) * 0.12 + Math.sin(index * 0.043) * 0.18;
  const texture = Math.abs(Math.sin(index * 1.73) * Math.cos(index * 0.37)) * 0.28;
  const transient = index % 31 === 0 || index % 47 === 0 ? 0.38 : 0;

  return clamp((phrase + texture + transient) * attack * decay, 0.03, 0.92);
});

const waveformPolygonPoints = waveformPoints(waveformSamples);

export function ClipWaveformPreview({ file }: ClipWaveformPreviewProps) {
  const channelCount = file?.channelCount ?? 2;

  return (
    <span aria-hidden="true" className="oa-clip-waveform">
      {Array.from({ length: Math.min(channelCount, 2) }, (_, channelIndex) => (
        <span className="oa-clip-waveform-channel" key={channelIndex}>
          <svg className="oa-clip-waveform-shape" preserveAspectRatio="none" viewBox="0 0 100 100">
            <polygon points={waveformPolygonPoints} />
          </svg>
        </span>
      ))}
    </span>
  );
}

function waveformPoints(samples: number[]): string {
  const upperPoints = samples.map((sample, index) => {
    const x = (index / (samples.length - 1)) * 100;
    const y = 50 - sample * 48;

    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const lowerPoints = samples
    .map((sample, index) => {
      const x = (index / (samples.length - 1)) * 100;
      const y = 50 + sample * 48;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .reverse();

  return [...upperPoints, ...lowerPoints].join(" ");
}
