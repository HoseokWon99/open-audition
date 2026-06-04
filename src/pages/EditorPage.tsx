import { useCallback, useEffect, useState } from "react";
import type React from "react";
import { LeftDock } from "../components/editor/LeftDock";
import { MultitrackTimeline } from "../components/editor/MultitrackTimeline";
import { ResizableHandle } from "../components/editor/ResizableHandle";
import { TopBar } from "../components/editor/TopBar";
import { TransportBar } from "../components/editor/TransportBar";
import { WaveformCanvas } from "../components/editor/WaveformCanvas";
import type { WaveSurferController } from "../hooks/useWaveSurfer";
import type { AudioTransportEngine, TransportState } from "../libs/audio/engine";
import { useAppStore } from "../store/appStore";
import { useEditorStore } from "../store/editorStore";
import {
  useClipFileGetter,
  useSelectedFile,
  useSelectedProject,
  useTimelinePlayheadPercent,
  useTimelineViewport,
} from "../store/selectors";
import { useSessionStore } from "../store/sessionStore";
import { useTransportStore } from "../store/transportStore";
import { clamp } from "../utils/math";
import { formatTransportTime } from "../utils/time";

interface EditorPageProps {
  editorView: "Multitrack" | "Waveform";
  audioEngine: AudioTransportEngine;
}

export function EditorPage({ editorView, audioEngine }: EditorPageProps) {
  const [waveformController, setWaveformController] = useState<WaveSurferController | null>(null);
  const activeMediaTab = useEditorStore((state) => state.activeMediaTab);
  const leftDockWidth = useEditorStore((state) => state.leftDockWidth);
  const inspectorHeight = useEditorStore((state) => state.inspectorHeight);
  const resizeInspector = useEditorStore((state) => state.resizeInspector);
  const resizeLeftDock = useEditorStore((state) => state.resizeLeftDock);
  const resizeTrackHead = useEditorStore((state) => state.resizeTrackHead);
  const resizeTrackPair = useEditorStore((state) => state.resizeTrackPair);
  const resizeTransport = useEditorStore((state) => state.resizeTransport);
  const selectClip = useEditorStore((state) => state.selectClip);
  const selectFile = useEditorStore((state) => state.selectFile);
  const selectTrack = useEditorStore((state) => state.selectTrack);
  const selectedClipId = useEditorStore((state) => state.selectedClipId);
  const selectedFileId = useEditorStore((state) => state.selectedFileId);
  const selectedTrackId = useEditorStore((state) => state.selectedTrackId);
  const setMediaTab = useEditorStore((state) => state.setMediaTab);
  const setVisibleWindow = useEditorStore((state) => state.setVisibleWindow);
  const trackHeadWidth = useEditorStore((state) => state.trackHeadWidth);
  const trackHeights = useEditorStore((state) => state.trackHeights);
  const transportHeight = useEditorStore((state) => state.transportHeight);
  const changeClipTiming = useSessionStore((state) => state.changeClipTiming);
  const changeTrackGain = useSessionStore((state) => state.changeTrackGain);
  const changeTrackPan = useSessionStore((state) => state.changeTrackPan);
  const clips = useSessionStore((state) => state.clips);
  const deleteClipGainKeyframes = useSessionStore((state) => state.deleteClipGainKeyframes);
  const files = useSessionStore((state) => state.files);
  const moveClipGainKeyframes = useSessionStore((state) => state.moveClipGainKeyframes);
  const resetClipGainKeyframes = useSessionStore((state) => state.resetClipGainKeyframes);
  const tracks = useSessionStore((state) => state.tracks);
  const updateClipGainKeyframe = useSessionStore((state) => state.updateClipGainKeyframe);
  const upsertClipGainKeyframe = useSessionStore((state) => state.upsertClipGainKeyframe);
  const navigate = useAppStore((state) => state.navigate);
  const openSettings = useAppStore((state) => state.openSettings);
  const timelineDurationSeconds = useTransportStore((state) => state.timelineDurationSeconds);
  const timelinePlayheadSeconds = useTransportStore((state) => state.timelinePlayheadSeconds);
  const setTimelinePlayhead = useTransportStore((state) => state.setTimelinePlayhead);
  const setTransportState = useTransportStore((state) => state.setTransportState);
  const setWaveformDuration = useTransportStore((state) => state.setWaveformDuration);
  const setWaveformPlayhead = useTransportStore((state) => state.setWaveformPlayhead);
  const stopTimeline = useTransportStore((state) => state.stopTimeline);
  const stopWaveform = useTransportStore((state) => state.stopWaveform);
  const transportState = useTransportStore((state) => state.transportState);
  const waveformDurationSeconds = useTransportStore((state) => state.waveformDurationSeconds);
  const waveformPlayheadSeconds = useTransportStore((state) => state.waveformPlayheadSeconds);
  const getClipFile = useClipFileGetter();
  const project = useSelectedProject();
  const selectedFile = useSelectedFile();
  const playheadPercent = useTimelinePlayheadPercent();
  const { timelineWidthPercent, visibleStartPercent, visibleWidthPercent, zoomLevel } =
    useTimelineViewport();
  const activeDurationSeconds =
    editorView === "Waveform" ? waveformDurationSeconds : timelineDurationSeconds;
  const activePlayheadSeconds =
    editorView === "Waveform" ? waveformPlayheadSeconds : timelinePlayheadSeconds;
  const activeTransportState: TransportState =
    editorView === "Waveform"
      ? waveformController?.isPlaying
        ? "Playing"
        : waveformPlayheadSeconds > 0
          ? "Paused"
          : "Stopped"
      : transportState;

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
      setTimelinePlayhead(nextSeconds);
    },
    [audioEngine, setTimelinePlayhead, timelineDurationSeconds],
  );

  const reportAudioError = useCallback((message: string) => {
    console.error(message);
  }, []);

  const setWaveformPosition = useCallback(
    (seconds: number) => {
      const nextSeconds = clamp(seconds, 0, waveformDurationSeconds);

      waveformController?.seek(nextSeconds);
      setWaveformPlayhead(nextSeconds);
    },
    [setWaveformPlayhead, waveformController, waveformDurationSeconds],
  );

  const openFile = useCallback(
    (fileId: string) => {
      const file = files.find((candidate) => candidate.id === fileId);

      selectFile(fileId);

      if (file?.mediaType === "Multitrack") {
        navigate("Multitrack");
        return;
      }

      navigate("Waveform");
    },
    [files, navigate, selectFile],
  );

  const openClip = useCallback(
    (clipId: string) => {
      const clip = clips.find((candidate) => candidate.id === clipId);

      selectClip(clipId);

      if (clip) {
        selectFile(clip.sourceFileId);
      }

      navigate("Waveform");
    },
    [clips, navigate, selectClip, selectFile],
  );

  const play = useCallback(() => {
    if (editorView === "Waveform") {
      void waveformController?.play();
      return;
    }

    void audioEngine.play(timelinePlayheadSeconds).then((result) => {
      if (result.isErr()) {
        reportAudioError(result.error.message);
        return;
      }

      setTransportState(audioEngine.state);
    });
  }, [
    audioEngine,
    editorView,
    reportAudioError,
    setTransportState,
    timelinePlayheadSeconds,
    waveformController,
  ]);

  const pause = useCallback(() => {
    if (editorView === "Waveform") {
      void waveformController?.pause();
      return;
    }

    void audioEngine.pause().then((result) => {
      if (result.isErr()) {
        reportAudioError(result.error.message);
        return;
      }

      setTimelinePlayhead(clamp(audioEngine.currentTime(), 0, timelineDurationSeconds));
      setTransportState(audioEngine.state);
    });
  }, [
    audioEngine,
    editorView,
    reportAudioError,
    setTimelinePlayhead,
    setTransportState,
    timelineDurationSeconds,
    waveformController,
  ]);

  const stop = useCallback(() => {
    if (editorView === "Waveform") {
      waveformController?.stop();
      stopWaveform();
      return;
    }

    void audioEngine.stop().then((result) => {
      if (result.isErr()) {
        reportAudioError(result.error.message);
        return;
      }

      stopTimeline();
    });
  }, [audioEngine, editorView, reportAudioError, stopTimeline, stopWaveform, waveformController]);

  useEffect(() => {
    if (transportState !== "Playing") {
      return;
    }

    let animationFrame = 0;

    function syncPlayhead() {
      const currentTime = clamp(audioEngine.currentTime(), 0, timelineDurationSeconds);

      setTimelinePlayhead(currentTime);

      if (currentTime >= timelineDurationSeconds) {
        void audioEngine.stop().then((result) => {
          if (result.isErr()) {
            reportAudioError(result.error.message);
            return;
          }

          stopTimeline();
        });
        return;
      }

      animationFrame = window.requestAnimationFrame(syncPlayhead);
    }

    animationFrame = window.requestAnimationFrame(syncPlayhead);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    audioEngine,
    reportAudioError,
    setTimelinePlayhead,
    stopTimeline,
    timelineDurationSeconds,
    transportState,
  ]);

  useEffect(() => {
    setWaveformDuration(selectedFile?.durationSeconds ?? 70);
    setWaveformPlayhead(0);
  }, [selectedFile, setWaveformDuration, setWaveformPlayhead]);

  return (
    <main className="oa-shell" style={layoutStyle}>
      <TopBar
        onGoHome={() => navigate("Home")}
        onOpenSettings={openSettings}
        title={project.name}
      />
      <div className="oa-workspace">
        <LeftDock
          activeTab={activeMediaTab}
          clips={clips}
          files={files}
          onOpenFile={openFile}
          onResizeInspector={resizeInspector}
          onSelectFile={selectFile}
          onTabChange={setMediaTab}
          selectedClipId={selectedClipId ?? ""}
          selectedFileId={selectedFileId ?? ""}
          tracks={tracks}
        />
        <ResizableHandle
          axis="X"
          label="Resize left dock and editor"
          onResize={resizeLeftDock}
        />
        <section className="oa-main">
          {editorView === "Multitrack" ? (
            <MultitrackTimeline
              clips={clips}
              durationSeconds={timelineDurationSeconds}
              getClipFile={getClipFile}
              onChangeClipTiming={changeClipTiming}
              onChangePlayhead={(percent) =>
                setTransportPosition((timelineDurationSeconds * clamp(percent, 0, 100)) / 100)
              }
              onChangeTrackGain={changeTrackGain}
              onChangeTrackPan={changeTrackPan}
              onChangeVisibleWindow={setVisibleWindow}
              onDeleteClipGainKeyframes={deleteClipGainKeyframes}
              onMoveClipGainKeyframes={moveClipGainKeyframes}
              onOpenClip={openClip}
              onResetClipGainKeyframes={resetClipGainKeyframes}
              onResizeTrack={resizeTrackPair}
              onResizeTrackHead={resizeTrackHead}
              onSelectClip={selectClip}
              onSelectTrack={selectTrack}
              onUpdateClipGainKeyframe={updateClipGainKeyframe}
              onUpsertClipGainKeyframe={upsertClipGainKeyframe}
              playheadPercent={playheadPercent}
              selectedClipId={selectedClipId ?? ""}
              selectedTrackId={selectedTrackId ?? ""}
              trackHeights={trackHeights}
              timelineWidthPercent={timelineWidthPercent}
              tracks={tracks}
              visibleStartPercent={visibleStartPercent}
              visibleWidthPercent={visibleWidthPercent}
              zoomLevel={zoomLevel}
            />
          ) : (
            <WaveformCanvas
              file={selectedFile}
              onControllerChange={setWaveformController}
              onReady={setWaveformDuration}
              onSeek={setWaveformPlayhead}
              onTimeUpdate={setWaveformPlayhead}
              playheadSeconds={waveformPlayheadSeconds}
            />
          )}
          <ResizableHandle
            axis="Y"
            label="Resize editor and transport"
            onResize={resizeTransport}
          />
          <TransportBar
            currentTime={formatTransportTime(activePlayheadSeconds)}
            onFastForward={() =>
              editorView === "Waveform"
                ? setWaveformPosition(waveformPlayheadSeconds + 5)
                : setTransportPosition(timelinePlayheadSeconds + 5)
            }
            onPause={pause}
            onPlay={play}
            onRewind={() =>
              editorView === "Waveform"
                ? setWaveformPosition(waveformPlayheadSeconds - 5)
                : setTransportPosition(timelinePlayheadSeconds - 5)
            }
            onSeekEnd={() =>
              editorView === "Waveform"
                ? setWaveformPosition(activeDurationSeconds)
                : setTransportPosition(timelineDurationSeconds)
            }
            onSeekStart={() =>
              editorView === "Waveform" ? setWaveformPosition(0) : setTransportPosition(0)
            }
            onStop={stop}
            state={activeTransportState}
          />
        </section>
      </div>
    </main>
  );
}
