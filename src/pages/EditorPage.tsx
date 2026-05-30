import { useCallback, useEffect, useState } from "react";
import type React from "react";
import { LeftDock } from "../components/editor/LeftDock";
import { MultitrackTimeline } from "../components/editor/MultitrackTimeline";
import { ResizableHandle } from "../components/editor/ResizableHandle";
import { TopBar } from "../components/editor/TopBar";
import { TransportBar } from "../components/editor/TransportBar";
import { WaveformCanvas } from "../components/editor/WaveformCanvas";
import type { AudioTransportEngine, TransportState } from "../libs/audio/engine";
import type { MediaFile, MediaTab, TimelineClip, TimelineTrack } from "../types/audio";
import type { ProjectSummary } from "../types/project";
import { clamp } from "../utils/math";
import { formatTransportTime } from "../utils/time";

interface EditorPageProps {
  activeMediaTab: MediaTab;
  clips: TimelineClip[];
  editorView: "Multitrack" | "Waveform";
  files: MediaFile[];
  project: ProjectSummary;
  selectedClipId: string;
  selectedFileId: string;
  selectedTrackId: string;
  tracks: TimelineTrack[];
  audioEngine: AudioTransportEngine;
  onChangeClipTiming: (clipId: string, startPercent: number, widthPercent: number) => void;
  onChangeTrackGain: (trackId: string, gainDb: number) => void;
  onChangeTrackPan: (trackId: string, pan: number) => void;
  onGoHome: () => void;
  onOpenClip: (clipId: string) => void;
  onOpenFile: (fileId: string) => void;
  onOpenSettings: () => void;
  onSelectClip: (clipId: string) => void;
  onSelectFile: (fileId: string) => void;
  onSelectTrack: (trackId: string) => void;
  onTabChange: (tab: MediaTab) => void;
}

export function EditorPage({
  activeMediaTab,
  clips,
  editorView,
  files,
  project,
  selectedClipId,
  selectedFileId,
  selectedTrackId,
  tracks,
  audioEngine,
  onChangeClipTiming,
  onChangeTrackGain,
  onChangeTrackPan,
  onGoHome,
  onOpenClip,
  onOpenFile,
  onOpenSettings,
  onSelectClip,
  onSelectFile,
  onSelectTrack,
  onTabChange,
}: EditorPageProps) {
  const [leftDockWidth, setLeftDockWidth] = useState(318);
  const [inspectorHeight, setInspectorHeight] = useState(172);
  const [playheadSeconds, setPlayheadSeconds] = useState(73.091);
  const [trackHeadWidth, setTrackHeadWidth] = useState(318);
  const [trackHeights, setTrackHeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(tracks.map((track) => [track.id, 1])),
  );
  const [transportHeight, setTransportHeight] = useState(48);
  const [transportState, setTransportState] = useState<TransportState>(audioEngine.state);
  const [visibleStartPercent, setVisibleStartPercent] = useState(0);
  const [visibleWidthPercent, setVisibleWidthPercent] = useState(100);
  const timelineDurationSeconds = 140;
  const timelineWidthPercent = (100 / visibleWidthPercent) * 100;
  const zoomLevel = clamp(Math.round((100 - visibleWidthPercent) / 15), 0, 5);
  const selectedFile = files.find((file) => file.id === selectedFileId);

  const layoutStyle = {
    "--left-dock-width": `${leftDockWidth}px`,
    "--inspector-height": `${inspectorHeight}px`,
    "--track-head-width": `${trackHeadWidth}px`,
    "--transport-height": `${transportHeight}px`,
  } as React.CSSProperties;

  const setTransportPosition = useCallback(
    (seconds: number) => {
      const nextSeconds = clamp(seconds, 0, timelineDurationSeconds);
      audioEngine.seek(nextSeconds);
      setPlayheadSeconds(nextSeconds);
    },
    [audioEngine],
  );

  const reportAudioError = useCallback((message: string) => {
    console.error(message);
  }, []);

  const play = useCallback(() => {
    void audioEngine.play(playheadSeconds).then((result) => {
      if (result.isErr()) {
        reportAudioError(result.error.message);
        return;
      }

      setTransportState(audioEngine.state);
    });
  }, [audioEngine, playheadSeconds, reportAudioError]);

  const pause = useCallback(() => {
    void audioEngine.pause().then((result) => {
      if (result.isErr()) {
        reportAudioError(result.error.message);
        return;
      }

      setPlayheadSeconds(clamp(audioEngine.currentTime(), 0, timelineDurationSeconds));
      setTransportState(audioEngine.state);
    });
  }, [audioEngine, reportAudioError]);

  const stop = useCallback(() => {
    void audioEngine.stop().then((result) => {
      if (result.isErr()) {
        reportAudioError(result.error.message);
        return;
      }

      setPlayheadSeconds(0);
      setTransportState(audioEngine.state);
    });
  }, [audioEngine, reportAudioError]);

  useEffect(() => {
    if (transportState !== "Playing") {
      return;
    }

    let animationFrame = 0;

    function syncPlayhead() {
      const currentTime = clamp(audioEngine.currentTime(), 0, timelineDurationSeconds);
      setPlayheadSeconds(currentTime);

      if (currentTime >= timelineDurationSeconds) {
        void audioEngine.stop().then((result) => {
          if (result.isErr()) {
            reportAudioError(result.error.message);
            return;
          }

          setPlayheadSeconds(0);
          setTransportState(audioEngine.state);
        });
        return;
      }

      animationFrame = window.requestAnimationFrame(syncPlayhead);
    }

    animationFrame = window.requestAnimationFrame(syncPlayhead);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [audioEngine, reportAudioError, transportState]);

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
          axis="X"
          label="Resize left dock and editor"
          onResize={(delta) =>
            setLeftDockWidth((currentWidth) => clamp(currentWidth + delta, 240, 520))
          }
        />
        <section className="oa-main">
          {editorView === "Multitrack" ? (
            <MultitrackTimeline
              clips={clips}
              durationSeconds={timelineDurationSeconds}
              onChangePlayhead={(percent) =>
                setTransportPosition((timelineDurationSeconds * clamp(percent, 0, 100)) / 100)
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
          ) : (
            <WaveformCanvas file={selectedFile} />
          )}
          <ResizableHandle
            axis="Y"
            label="Resize editor and transport"
            onResize={(delta) =>
              setTransportHeight((currentHeight) => clamp(currentHeight - delta, 42, 90))
            }
          />
          <TransportBar
            currentTime={formatTransportTime(playheadSeconds)}
            onFastForward={() => setTransportPosition(playheadSeconds + 5)}
            onPause={pause}
            onPlay={play}
            onRewind={() => setTransportPosition(playheadSeconds - 5)}
            onSeekEnd={() => setTransportPosition(timelineDurationSeconds)}
            onSeekStart={() => setTransportPosition(0)}
            onStop={stop}
            state={transportState}
          />
        </section>
      </div>
    </main>
  );
}
