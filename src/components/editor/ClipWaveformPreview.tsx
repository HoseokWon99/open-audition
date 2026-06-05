import type { MediaFile } from "../../types/audio";
import {
  createWaveformPolygonPoints,
  createWaveformSamples,
} from "../../libs/audio/waveform";

interface ClipWaveformPreviewProps {
  file?: MediaFile;
}

const waveformSamples = createWaveformSamples({
  count: 260,
  attackPercent: 0.06,
  decayStartPercent: 0.56,
  floor: 0.03,
  phraseFrequency: 0.1,
  phraseSecondaryFrequency: 0.043,
  transientEvery: [31, 47],
});

const waveformPolygonPoints = createWaveformPolygonPoints(waveformSamples);

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
