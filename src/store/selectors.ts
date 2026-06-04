import { recentProjects } from "../data/mockData";
import type { TimelineClip } from "../types/audio";
import { clamp } from "../utils/math";
import { useAppStore } from "./appStore";
import { useEditorStore } from "./editorStore";
import { useSessionStore } from "./sessionStore";
import { useTransportStore } from "./transportStore";

export function useSelectedProject() {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);

  return recentProjects.find((project) => project.id === selectedProjectId) ?? recentProjects[0];
}

export function useSelectedFile() {
  const selectedFileId = useEditorStore((state) => state.selectedFileId);
  const files = useSessionStore((state) => state.files);

  return files.find((file) => file.id === selectedFileId);
}

export function useSelectedClip() {
  const selectedClipId = useEditorStore((state) => state.selectedClipId);
  const clips = useSessionStore((state) => state.clips);

  return clips.find((clip) => clip.id === selectedClipId);
}

export function useClipFileGetter() {
  const files = useSessionStore((state) => state.files);

  return (clip: TimelineClip) => files.find((file) => file.id === clip.sourceFileId);
}

export function useTimelineViewport() {
  const visibleWidthPercent = useEditorStore((state) => state.visibleWidthPercent);
  const visibleStartPercent = useEditorStore((state) => state.visibleStartPercent);
  const timelineWidthPercent = (100 / visibleWidthPercent) * 100;
  const zoomLevel = clamp(Math.round((100 - visibleWidthPercent) / 15), 0, 5);

  return { timelineWidthPercent, visibleStartPercent, visibleWidthPercent, zoomLevel };
}

export function useTimelinePlayheadPercent() {
  const playheadSeconds = useTransportStore((state) => state.timelinePlayheadSeconds);
  const durationSeconds = useTransportStore((state) => state.timelineDurationSeconds);

  return durationSeconds === 0 ? 0 : (playheadSeconds / durationSeconds) * 100;
}
