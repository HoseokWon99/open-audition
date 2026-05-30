import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { resolveAudioSourceUrl } from "../libs/audio/waveform/audioSource";
import type { MediaFile } from "../types/audio";

export function useWaveSurferRenderer(file: MediaFile | undefined, fallbackPeaks: number[][]) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    const container = waveformRef.current;

    if (!container) {
      return;
    }

    const waveSurfer = WaveSurfer.create({
      container,
      height: "auto",
      waveColor: "#00d99c",
      progressColor: "#00d99c",
      cursorColor: "transparent",
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1,
      dragToSeek: false,
      duration: 70,
      fillParent: true,
      interact: false,
      normalize: true,
      peaks: fallbackPeaks,
      splitChannels: [{ overlay: false }, { overlay: false }],
    });

    waveSurferRef.current = waveSurfer;

    const audioSourceUrl = resolveAudioSourceUrl(file);

    if (audioSourceUrl) {
      void waveSurfer.load(audioSourceUrl).catch((error) => {
        console.warn("Failed to render real waveform, keeping fallback waveform", error);
      });
    }

    return () => {
      waveSurfer.destroy();

      if (waveSurferRef.current === waveSurfer) {
        waveSurferRef.current = null;
      }
    };
  }, [fallbackPeaks, file]);

  return waveformRef;
}
