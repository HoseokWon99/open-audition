import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import WaveSurfer from "wavesurfer.js";
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

export function useWaveSurfer(
  file: MediaFile | undefined,
  options: UseWaveSurferOptions = {},
): WaveSurferController {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const optionsRef = useRef(options);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(file?.durationSeconds ?? 0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<WaveSurferStatus>("Idle");

  optionsRef.current = options;

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let isCurrent = true;
    const audioSourceUrl = resolveAudioSourceUrl(file);
    const fallbackDurationSeconds = file?.durationSeconds ?? 70;
    const waveSurfer = WaveSurfer.create({
      container,
      height: "auto",
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
      duration: fallbackDurationSeconds,
      peaks: fallbackWaveformPeaks,
      splitChannels: [{ overlay: false }, { overlay: false }],
      ...optionsRef.current,
    });

    waveSurferRef.current = waveSurfer;
    setCurrentTimeSeconds(0);
    setDurationSeconds(audioSourceUrl ? file?.durationSeconds ?? 0 : fallbackDurationSeconds);
    setErrorMessage(null);
    setIsPlaying(false);
    setStatus(audioSourceUrl ? "Loading" : "Ready");

    const unsubscribers = [
      waveSurfer.on("ready", (duration) => {
        if (!isCurrent) {
          return;
        }

        setDurationSeconds(duration);
        setStatus("Ready");
      }),
      waveSurfer.on("error", (error) => {
        if (!isCurrent) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus("Error");
      }),
      waveSurfer.on("play", () => {
        if (isCurrent) {
          setIsPlaying(true);
        }
      }),
      waveSurfer.on("pause", () => {
        if (isCurrent) {
          setIsPlaying(false);
        }
      }),
      waveSurfer.on("finish", () => {
        if (isCurrent) {
          setIsPlaying(false);
        }
      }),
      waveSurfer.on("timeupdate", (seconds) => {
        if (isCurrent) {
          setCurrentTimeSeconds(seconds);
        }
      }),
    ];

    if (audioSourceUrl) {
      void waveSurfer.load(audioSourceUrl, fallbackWaveformPeaks, fallbackDurationSeconds).catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus("Error");
      });
    }

    return () => {
      isCurrent = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      waveSurfer.destroy();

      if (waveSurferRef.current === waveSurfer) {
        waveSurferRef.current = null;
      }
    };
  }, [file]);

  const play = useCallback(async () => {
    const waveSurfer = waveSurferRef.current;

    if (!waveSurfer) {
      return;
    }

    try {
      await waveSurfer.play();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStatus("Error");
    }
  }, []);

  const pause = useCallback(async () => {
    waveSurferRef.current?.pause();
  }, []);

  const seek = useCallback(
    (seconds: number) => {
      const waveSurfer = waveSurferRef.current;

      if (!waveSurfer) {
        return;
      }

      const nextSeconds = clamp(seconds, 0, durationSeconds || file?.durationSeconds || 0);
      waveSurfer.setTime(nextSeconds);
      setCurrentTimeSeconds(nextSeconds);
    },
    [durationSeconds, file?.durationSeconds],
  );

  const stop = useCallback(() => {
    const waveSurfer = waveSurferRef.current;

    if (!waveSurfer) {
      return;
    }

    waveSurfer.stop();
    setCurrentTimeSeconds(0);
    setIsPlaying(false);
  }, []);

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
