import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useWavesurfer } from "@wavesurfer/react";
import type WaveSurfer from "wavesurfer.js";
import type { WaveSurferOptions } from "wavesurfer.js";
import { resolveAudioSourceUrl } from "../libs/audio/waveform/audioSource";
import type { MediaFile } from "../types/audio";
import { clamp } from "../utils/math";

export type WaveSurferStatus = "Idle" | "Loading" | "Ready" | "Error";

export interface WaveSurferController {
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentTimeSeconds: number;
  durationSeconds: number;
  errorMessage: string | null;
  isPlaying: boolean;
  status: WaveSurferStatus;
  pause: () => Promise<void>;
  play: () => Promise<void>;
  seek: (seconds: number) => void;
  stop: () => void;
}

type UseWaveSurferOptions = Omit<Partial<WaveSurferOptions>, "container">;

const bars = Array.from({ length: 180 }, (_, index) => {
  const rise = Math.min(1, index / 40);
  const fall = index > 118 ? Math.max(0.18, 1 - (index - 118) / 72) : 1;
  const variance = 0.62 + Math.sin(index * 0.33) * 0.22 + Math.sin(index * 1.7) * 0.13;
  return clamp(rise * fall * variance, 0.08, 1);
});

const fallbackWaveformPeaks = [
  bars,
  bars.map((height, index) => clamp(height * (0.88 + Math.sin(index * 0.21) * 0.12), 0.08, 1)),
];

const defaultWaveSurferOptions: UseWaveSurferOptions = {};

export function useWaveSurfer(
  file: MediaFile | undefined,
  options: UseWaveSurferOptions = defaultWaveSurferOptions,
): WaveSurferController {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioSourceUrl = resolveAudioSourceUrl(file);
  const fallbackDurationSeconds = file?.durationSeconds ?? 70;
  const waveSurferOptions = useMemo(
    () => ({
      container: containerRef,
      height: "auto" as const,
      waveColor: "#00d99c",
      progressColor: "#00b985",
      cursorColor: "transparent",
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1,
      dragToSeek: false,
      fillParent: true,
      interact: false,
      normalize: true,
      splitChannels: [{ overlay: false }, { overlay: false }],
      ...options,
      ...(audioSourceUrl ? { url: audioSourceUrl } : { duration: fallbackDurationSeconds, peaks: fallbackWaveformPeaks }),
    }),
    [audioSourceUrl, fallbackDurationSeconds, options],
  );
  const {
    currentTime: waveSurferCurrentTimeSeconds,
    isPlaying,
    isReady,
    wavesurfer,
  } = useWavesurfer(waveSurferOptions);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(file?.durationSeconds ?? 0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<WaveSurferStatus>("Idle");

  useEffect(() => {
    setCurrentTimeSeconds(0);
    setDurationSeconds(audioSourceUrl ? file?.durationSeconds ?? 0 : fallbackDurationSeconds);
    setErrorMessage(null);
    setStatus(wavesurfer ? (audioSourceUrl ? "Loading" : "Ready") : "Idle");
  }, [audioSourceUrl, fallbackDurationSeconds, file?.durationSeconds, wavesurfer]);

  useEffect(() => {
    if (!wavesurfer) {
      return;
    }

    let isCurrent = true;
    const unsubscribers = [
      wavesurfer.on("ready", (duration) => {
        if (!isCurrent) {
          return;
        }

        setDurationSeconds(duration);
        setStatus("Ready");
      }),
      wavesurfer.on("error", (error) => {
        if (!isCurrent) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus("Error");
      }),
    ];

    return () => {
      isCurrent = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [wavesurfer]);

  useEffect(() => {
    if (isReady) {
      setStatus("Ready");
    }
  }, [isReady]);

  useEffect(() => {
    setCurrentTimeSeconds(waveSurferCurrentTimeSeconds);
  }, [waveSurferCurrentTimeSeconds]);

  const play = useCallback(async () => {
    if (!wavesurfer) {
      return;
    }

    try {
      await wavesurfer.play();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStatus("Error");
    }
  }, [wavesurfer]);

  const pause = useCallback(async () => {
    wavesurfer?.pause();
  }, [wavesurfer]);

  const seek = useCallback(
    (seconds: number) => {
      if (!wavesurfer) {
        return;
      }

      const nextSeconds = clamp(seconds, 0, durationSeconds || file?.durationSeconds || 0);
      wavesurfer.setTime(nextSeconds);
      setCurrentTimeSeconds(nextSeconds);
    },
    [durationSeconds, file?.durationSeconds, wavesurfer],
  );

  const stop = useCallback(() => {
    if (!wavesurfer) {
      return;
    }

    wavesurfer.stop();
    setCurrentTimeSeconds(0);
  }, [wavesurfer]);

  return useMemo(
    () => ({
      containerRef,
      currentTimeSeconds,
      durationSeconds,
      errorMessage,
      isPlaying,
      status,
      pause,
      play,
      seek,
      stop,
    }),
    [currentTimeSeconds, durationSeconds, errorMessage, isPlaying, pause, play, seek, status, stop],
  );
}
