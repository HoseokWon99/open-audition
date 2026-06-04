import { create } from "zustand";
import type { TransportState } from "../libs/audio/engine";
import { clamp } from "../utils/math";

interface TransportStore {
  timelineDurationSeconds: number;
  timelinePlayheadSeconds: number;
  waveformDurationSeconds: number;
  waveformPlayheadSeconds: number;
  transportState: TransportState;
  setTimelinePlayhead: (seconds: number) => void;
  setWaveformDuration: (seconds: number) => void;
  setWaveformPlayhead: (seconds: number) => void;
  setTransportState: (state: TransportState) => void;
  stopTimeline: () => void;
  stopWaveform: () => void;
}

export const transportInitialState = {
  timelineDurationSeconds: 140,
  timelinePlayheadSeconds: 73.091,
  waveformDurationSeconds: 70,
  waveformPlayheadSeconds: 0,
  transportState: "Stopped" as TransportState,
};

export const useTransportStore = create<TransportStore>((set) => ({
  ...transportInitialState,
  setTimelinePlayhead: (seconds) =>
    set((state) => ({
      timelinePlayheadSeconds: clamp(seconds, 0, state.timelineDurationSeconds),
    })),
  setWaveformDuration: (seconds) =>
    set((state) => {
      const nextDurationSeconds = Math.max(0, seconds);

      return {
        waveformDurationSeconds: nextDurationSeconds,
        waveformPlayheadSeconds: clamp(
          state.waveformPlayheadSeconds,
          0,
          nextDurationSeconds,
        ),
      };
    }),
  setWaveformPlayhead: (seconds) =>
    set((state) => ({
      waveformPlayheadSeconds: clamp(seconds, 0, state.waveformDurationSeconds),
    })),
  setTransportState: (state) => set({ transportState: state }),
  stopTimeline: () => set({ timelinePlayheadSeconds: 0, transportState: "Stopped" }),
  stopWaveform: () => set({ waveformPlayheadSeconds: 0 }),
}));
