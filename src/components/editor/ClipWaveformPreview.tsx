import { useWaveSurfer } from "../../hooks/useWaveSurfer";
import type { MediaFile } from "../../types/audio";

interface ClipWaveformPreviewProps {
  file?: MediaFile;
}

const previewWaveSurferOptions = {
  height: 28,
  interact: false,
  cursorWidth: 0,
  normalize: true,
};

export function ClipWaveformPreview({ file }: ClipWaveformPreviewProps) {
  const controller = useWaveSurfer(file, previewWaveSurferOptions);

  return <span aria-hidden="true" className="oa-clip-waveform" ref={controller.containerRef} />;
}
