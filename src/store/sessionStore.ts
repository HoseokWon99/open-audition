import { create } from "zustand";
import { clips as mockClips, mediaFiles, tracks as mockTracks } from "../data/mockData";
import type {
  MediaFile,
  TimelineClip,
  TimelineKeyframePoint,
  TimelineTrack,
} from "../types/audio";
import { clamp } from "../utils/math";

interface SessionStore {
  clips: TimelineClip[];
  files: MediaFile[];
  tracks: TimelineTrack[];
  dirty: boolean;
  changeClipTiming: (clipId: string, startPercent: number, widthPercent: number) => void;
  changeTrackGain: (trackId: string, gainDb: number) => void;
  changeTrackPan: (trackId: string, pan: number) => void;
  loadMockSession: () => void;
  deleteClipGainKeyframes: (clipId: string, keyframeIds: string[]) => void;
  moveClipGainKeyframes: (clipId: string, deltaYPercent: number) => void;
  resetClipGainKeyframes: (clipId: string, keyframeIds: string[]) => void;
  updateClipGainKeyframe: (
    clipId: string,
    keyframeId: string,
    xPercent: number,
    yPercent: number,
  ) => void;
  upsertClipGainKeyframe: (clipId: string, xPercent: number, yPercent: number) => void;
}

export const sessionInitialState = {
  clips: mockClips,
  files: mediaFiles,
  tracks: mockTracks,
  dirty: false,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...sessionInitialState,
  changeClipTiming: (clipId, startPercent, widthPercent) =>
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === clipId ? { ...clip, startPercent, widthPercent } : clip,
      ),
      dirty: true,
    })),
  changeTrackGain: (trackId, gainDb) =>
    set((state) => ({
      tracks: state.tracks.map((track) => (track.id === trackId ? { ...track, gainDb } : track)),
      dirty: true,
    })),
  changeTrackPan: (trackId, pan) =>
    set((state) => ({
      tracks: state.tracks.map((track) => (track.id === trackId ? { ...track, pan } : track)),
      dirty: true,
    })),
  loadMockSession: () => set(sessionInitialState),
  deleteClipGainKeyframes: (clipId, keyframeIds) => {
    if (keyframeIds.length === 0) {
      return;
    }

    set((state) => ({
      clips: state.clips.map((clip) => {
        if (clip.id !== clipId) {
          return clip;
        }

        return {
          ...clip,
          automation: {
            ...clip.automation,
            gain: (clip.automation?.gain ?? defaultClipGainKeyframes()).filter(
              (keyframe) => !keyframeIds.includes(keyframe.id),
            ),
          },
        };
      }),
      dirty: true,
    }));
  },
  moveClipGainKeyframes: (clipId, deltaYPercent) =>
    set((state) => ({
      clips: state.clips.map((clip) => {
        if (clip.id !== clipId) {
          return clip;
        }

        const gain = clip.automation?.gain ?? defaultClipGainKeyframes();

        return {
          ...clip,
          automation: {
            ...clip.automation,
            gain: gain.map((keyframe) => ({
              ...keyframe,
              yPercent: clamp(keyframe.yPercent + deltaYPercent, 0, 100),
            })),
          },
        };
      }),
      dirty: true,
    })),
  resetClipGainKeyframes: (clipId, keyframeIds) => {
    if (keyframeIds.length === 0) {
      return;
    }

    set((state) => ({
      clips: state.clips.map((clip) => {
        if (clip.id !== clipId) {
          return clip;
        }

        return {
          ...clip,
          automation: {
            ...clip.automation,
            gain: (clip.automation?.gain ?? defaultClipGainKeyframes()).map((keyframe) =>
              keyframeIds.includes(keyframe.id) ? { ...keyframe, yPercent: 50 } : keyframe,
            ),
          },
        };
      }),
      dirty: true,
    }));
  },
  updateClipGainKeyframe: (clipId, keyframeId, xPercent, yPercent) =>
    set((state) => ({
      clips: state.clips.map((clip) => {
        if (clip.id !== clipId) {
          return clip;
        }

        return {
          ...clip,
          automation: {
            ...clip.automation,
            gain: (clip.automation?.gain ?? defaultClipGainKeyframes())
              .map((candidate) =>
                candidate.id === keyframeId
                  ? {
                      ...candidate,
                      xPercent: clamp(xPercent, 0, 100),
                      yPercent: clamp(yPercent, 0, 100),
                    }
                  : candidate,
              )
              .sort((left, right) => left.xPercent - right.xPercent),
          },
        };
      }),
      dirty: true,
    })),
  upsertClipGainKeyframe: (clipId, xPercent, yPercent) =>
    set((state) => ({
      clips: state.clips.map((clip) => {
        if (clip.id !== clipId) {
          return clip;
        }

        const nextKeyframe: TimelineKeyframePoint = {
          id: `${clipId}-${Math.round(xPercent * 100)}-${Math.round(yPercent * 100)}`,
          xPercent,
          yPercent,
        };
        const gain = clip.automation?.gain ?? defaultClipGainKeyframes();

        return {
          ...clip,
          automation: {
            ...clip.automation,
            gain: gain
              .filter((keyframe) => Math.abs(keyframe.xPercent - xPercent) > 1.25)
              .concat(nextKeyframe)
              .sort((left, right) => left.xPercent - right.xPercent),
          },
        };
      }),
      dirty: true,
    })),
}));

function defaultClipGainKeyframes(): TimelineKeyframePoint[] {
  return [
    { id: "start", xPercent: 0, yPercent: 50 },
    { id: "end", xPercent: 100, yPercent: 50 },
  ];
}
