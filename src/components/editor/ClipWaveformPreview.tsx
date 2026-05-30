import type React from "react";
import type { MediaFile } from "../../types/audio";
import { clamp } from "../../utils/math";

interface ClipWaveformPreviewProps {
  file?: MediaFile;
}

const previewBars = Array.from({ length: 96 }, (_, index) => {
  const phrase = Math.sin(index * 0.21) * 0.26 + Math.sin(index * 0.57) * 0.19;
  const transient = index % 17 === 0 || index % 23 === 0 ? 0.36 : 0;
  const breath = index < 10 || index > 86 ? 0.18 : 0.34;

  return clamp(breath + phrase + transient, 0.08, 0.82);
});

export function ClipWaveformPreview({ file }: ClipWaveformPreviewProps) {
  const channelCount = file?.channelCount ?? 2;

  return (
    <span aria-hidden="true" className="oa-clip-waveform">
      {Array.from({ length: Math.min(channelCount, 2) }, (_, channelIndex) => (
        <span className="oa-clip-waveform-channel" key={channelIndex}>
          {previewBars.map((height, index) => (
            <span
              className="oa-clip-waveform-bar"
              key={index}
              style={{
                "--bar-height": `${Math.round(
                  clamp(
                    height * (channelIndex === 0 ? 0.82 + Math.sin(index * 0.13) * 0.16 : 0.74 + Math.cos(index * 0.17) * 0.18),
                    0.05,
                    0.88,
                  ) * 24,
                )}px`,
              } as React.CSSProperties}
            />
          ))}
        </span>
      ))}
    </span>
  );
}
