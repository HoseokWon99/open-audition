import { create } from "zustand";
import type { MediaTab } from "../types/audio";
import { clamp } from "../utils/math";

interface EditorStore {
  activeMediaTab: MediaTab;
  selectedClipId: string | null;
  selectedFileId: string | null;
  selectedTrackId: string | null;
  leftDockWidth: number;
  inspectorHeight: number;
  trackHeadWidth: number;
  trackHeights: Record<string, number>;
  transportHeight: number;
  visibleStartPercent: number;
  visibleWidthPercent: number;
  selectClip: (clipId: string) => void;
  selectFile: (fileId: string) => void;
  selectTrack: (trackId: string) => void;
  setMediaTab: (tab: MediaTab) => void;
  resizeLeftDock: (delta: number) => void;
  resizeInspector: (delta: number) => void;
  resizeTrackHead: (delta: number) => void;
  resizeTrackPair: (trackId: string, nextTrackId: string, delta: number) => void;
  resizeTransport: (delta: number) => void;
  setVisibleWindow: (startPercent: number, widthPercent: number) => void;
}

export const editorInitialState = {
  activeMediaTab: "Files" as MediaTab,
  selectedClipId: "clip-mola",
  selectedFileId: "opening",
  selectedTrackId: "track-3",
  leftDockWidth: 318,
  inspectorHeight: 172,
  trackHeadWidth: 318,
  trackHeights: {},
  transportHeight: 48,
  visibleStartPercent: 0,
  visibleWidthPercent: 100,
};

export const useEditorStore = create<EditorStore>((set) => ({
  ...editorInitialState,
  selectClip: (clipId) => set({ selectedClipId: clipId }),
  selectFile: (fileId) => set({ selectedFileId: fileId }),
  selectTrack: (trackId) => set({ selectedTrackId: trackId }),
  setMediaTab: (tab) => set({ activeMediaTab: tab }),
  resizeLeftDock: (delta) =>
    set((state) => ({ leftDockWidth: clamp(state.leftDockWidth + delta, 240, 520) })),
  resizeInspector: (delta) =>
    set((state) => ({ inspectorHeight: clamp(state.inspectorHeight + delta, 112, 360) })),
  resizeTrackHead: (delta) =>
    set((state) => ({ trackHeadWidth: clamp(state.trackHeadWidth + delta, 250, 430) })),
  resizeTrackPair: (trackId, nextTrackId, delta) =>
    set((state) => {
      const currentTrackHeight = state.trackHeights[trackId] ?? 1;
      const nextTrackHeight = state.trackHeights[nextTrackId] ?? 1;
      const totalPairHeight = currentTrackHeight + nextTrackHeight;
      const nextCurrentTrackHeight = clamp(
        currentTrackHeight + delta / 120,
        0.55,
        totalPairHeight - 0.55,
      );

      return {
        trackHeights: {
          ...state.trackHeights,
          [trackId]: nextCurrentTrackHeight,
          [nextTrackId]: totalPairHeight - nextCurrentTrackHeight,
        },
      };
    }),
  resizeTransport: (delta) =>
    set((state) => ({ transportHeight: clamp(state.transportHeight - delta, 42, 90) })),
  setVisibleWindow: (startPercent, widthPercent) => {
    const nextWidthPercent = clamp(widthPercent, 10, 100);

    set({
      visibleWidthPercent: nextWidthPercent,
      visibleStartPercent: clamp(startPercent, 0, 100 - nextWidthPercent),
    });
  },
}));
