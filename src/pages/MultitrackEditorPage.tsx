import { useState } from "react";
import type React from "react";
import { LeftDock } from "../components/editor/LeftDock";
import { MultitrackTimeline } from "../components/editor/MultitrackTimeline";
import { ResizableHandle } from "../components/editor/ResizableHandle";
import { TopBar } from "../components/editor/TopBar";
import { TransportBar } from "../components/editor/TransportBar";
import type { Clip, MediaFile, MediaTab, ProjectSummary, Track } from "../types";

interface MultitrackEditorPageProps {
  activeMediaTab: MediaTab;
  clips: Clip[];
  files: MediaFile[];
  project: ProjectSummary;
  selectedClipId: string;
  selectedFileId: string;
  selectedTrackId: string;
  tracks: Track[];
  onChangeClipTiming: (clipId: string, startPercent: number, widthPercent: number) => void;
  onGoHome: () => void;
  onChangeTrackGain: (trackId: string, gainDb: number) => void;
  onChangeTrackPan: (trackId: string, pan: number) => void;
  onOpenClip: (clipId: string) => void;
  onOpenFile: (fileId: string) => void;
  onOpenSettings: () => void;
  onSelectClip: (clipId: string) => void;
  onSelectFile: (fileId: string) => void;
  onSelectTrack: (trackId: string) => void;
  onTabChange: (tab: MediaTab) => void;
}

export function MultitrackEditorPage({
  activeMediaTab,
  clips,
  files,
  project,
  selectedClipId,
  selectedFileId,
  selectedTrackId,
  tracks,
  onChangeClipTiming,
  onGoHome,
  onChangeTrackGain,
  onChangeTrackPan,
  onOpenClip,
  onOpenFile,
  onOpenSettings,
  onSelectClip,
  onSelectFile,
  onSelectTrack,
  onTabChange,
}: MultitrackEditorPageProps) {
  const [leftDockWidth, setLeftDockWidth] = useState(318);
  const [inspectorHeight, setInspectorHeight] = useState(172);
  const [playheadSeconds, setPlayheadSeconds] = useState(73.091);
  const [trackHeadWidth, setTrackHeadWidth] = useState(318);
  const [trackHeights, setTrackHeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(tracks.map((track) => [track.id, 1])),
  );
  const [transportHeight, setTransportHeight] = useState(48);
  const [visibleStartPercent, setVisibleStartPercent] = useState(0);
  const [visibleWidthPercent, setVisibleWidthPercent] = useState(100);
  const timelineDurationSeconds = 140;
  const timelineWidthPercent = (100 / visibleWidthPercent) * 100;
  const zoomLevel = Math.max(0, Math.min(5, Math.round((100 - visibleWidthPercent) / 15)));

  const layoutStyle = {
    "--left-dock-width": `${leftDockWidth}px`,
    "--inspector-height": `${inspectorHeight}px`,
    "--track-head-width": `${trackHeadWidth}px`,
    "--transport-height": `${transportHeight}px`,
  } as React.CSSProperties;

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds - minutes * 60;

    return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, "0")}`;
  }

  return (
    <main className="oa-shell" style={layoutStyle}>
      <TopBar onGoHome={onGoHome} onOpenSettings={onOpenSettings} title={project.name} />
      <div className="oa-workspace">
        <LeftDock
          activeTab={activeMediaTab}
          clips={clips}
          files={files}
          onOpenFile={onOpenFile}
          onResizeInspector={(delta) =>
            setInspectorHeight((currentHeight) => clamp(currentHeight + delta, 112, 360))
          }
          onSelectFile={onSelectFile}
          onTabChange={onTabChange}
          selectedClipId={selectedClipId}
          selectedFileId={selectedFileId}
          tracks={tracks}
        />
        <ResizableHandle
          axis="x"
          label="Resize left dock and editor"
          onResize={(delta) =>
            setLeftDockWidth((currentWidth) => clamp(currentWidth + delta, 240, 520))
          }
        />
        <section className="oa-main">
          <MultitrackTimeline
            clips={clips}
            durationSeconds={timelineDurationSeconds}
            onChangePlayhead={(percent) =>
              setPlayheadSeconds((timelineDurationSeconds * clamp(percent, 0, 100)) / 100)
            }
            onChangeClipTiming={onChangeClipTiming}
            onChangeTrackGain={onChangeTrackGain}
            onChangeTrackPan={onChangeTrackPan}
            onOpenClip={onOpenClip}
            onChangeVisibleWindow={(startPercent, widthPercent) => {
              const nextWidthPercent = clamp(widthPercent, 10, 100);
              const nextStartPercent = clamp(startPercent, 0, 100 - nextWidthPercent);

              setVisibleWidthPercent(nextWidthPercent);
              setVisibleStartPercent(nextStartPercent);
            }}
            onResizeTrack={(trackId, nextTrackId, delta) =>
              setTrackHeights((currentHeights) => {
                const currentTrackHeight = currentHeights[trackId] ?? 1;
                const nextTrackHeight = currentHeights[nextTrackId] ?? 1;
                const totalPairHeight = currentTrackHeight + nextTrackHeight;
                const deltaRatio = delta / 120;
                const nextCurrentTrackHeight = clamp(
                  currentTrackHeight + deltaRatio,
                  0.55,
                  totalPairHeight - 0.55,
                );

                return {
                  ...currentHeights,
                  [trackId]: nextCurrentTrackHeight,
                  [nextTrackId]: totalPairHeight - nextCurrentTrackHeight,
                };
              })
            }
            onResizeTrackHead={(delta) =>
              setTrackHeadWidth((currentWidth) => clamp(currentWidth + delta, 250, 430))
            }
            onSelectClip={onSelectClip}
            onSelectTrack={onSelectTrack}
            playheadPercent={(playheadSeconds / timelineDurationSeconds) * 100}
            selectedClipId={selectedClipId}
            selectedTrackId={selectedTrackId}
            trackHeights={trackHeights}
            timelineWidthPercent={timelineWidthPercent}
            tracks={tracks}
            visibleStartPercent={visibleStartPercent}
            visibleWidthPercent={visibleWidthPercent}
            zoomLevel={zoomLevel}
          />
          <ResizableHandle
            axis="y"
            label="Resize editor and transport"
            onResize={(delta) =>
              setTransportHeight((currentHeight) => clamp(currentHeight - delta, 42, 90))
            }
          />
          <TransportBar currentTime={formatTime(playheadSeconds)} />
        </section>
      </div>
    </main>
  );
}
