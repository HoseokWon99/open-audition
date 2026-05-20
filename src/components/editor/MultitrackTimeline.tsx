import { useEffect, useRef, useState } from "react";
import type React from "react";
import { TimelineRuler } from "./TimelineRuler";
import { TrackHeader } from "./TrackHeader";
import { ResizableHandle } from "./ResizableHandle";
import type { Clip, Track } from "../../types";
import { clamp } from "../../utils/math";

interface MultitrackTimelineProps {
  clips: Clip[];
  durationSeconds: number;
  playheadPercent: number;
  timelineWidthPercent: number;
  selectedClipId: string;
  selectedTrackId: string;
  trackHeights: Record<string, number>;
  tracks: Track[];
  visibleStartPercent: number;
  visibleWidthPercent: number;
  zoomLevel: number;
  onChangeClipTiming: (clipId: string, startPercent: number, widthPercent: number) => void;
  onChangeTrackGain: (trackId: string, gainDb: number) => void;
  onChangeTrackPan: (trackId: string, pan: number) => void;
  onChangePlayhead: (percent: number) => void;
  onChangeVisibleWindow: (startPercent: number, widthPercent: number) => void;
  onOpenClip: (clipId: string) => void;
  onResizeTrack: (trackId: string, nextTrackId: string, delta: number) => void;
  onResizeTrackHead: (delta: number) => void;
  onSelectClip: (clipId: string) => void;
  onSelectTrack: (trackId: string) => void;
}

export function MultitrackTimeline({
  clips,
  durationSeconds,
  playheadPercent,
  timelineWidthPercent,
  selectedClipId,
  selectedTrackId,
  trackHeights,
  tracks,
  visibleStartPercent,
  visibleWidthPercent,
  zoomLevel,
  onChangeClipTiming,
  onChangeTrackGain,
  onChangeTrackPan,
  onChangePlayhead,
  onChangeVisibleWindow,
  onOpenClip,
  onResizeTrack,
  onResizeTrackHead,
  onSelectClip,
  onSelectTrack,
}: MultitrackTimelineProps) {
  const lanesRef = useRef<HTMLDivElement>(null);
  const laneContentRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const [timelineScrollLeft, setTimelineScrollLeft] = useState(0);

  function percentFromPointer(event: MouseEvent | React.MouseEvent<HTMLElement>) {
    const rect = laneContentRef.current?.getBoundingClientRect();

    if (!rect) {
      return playheadPercent;
    }

    return clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
  }

  function movePlayheadToPointer(event: React.MouseEvent<HTMLElement>) {
    onChangePlayhead(percentFromPointer(event));
  }

  function startPlayheadDrag(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    onChangePlayhead(percentFromPointer(event));

    function handleMove(moveEvent: MouseEvent) {
      onChangePlayhead(percentFromPointer(moveEvent));
    }

    function stopDrag() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDrag);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDrag);
  }

  function startClipTrimDrag(
    event: React.MouseEvent<HTMLElement>,
    clip: Clip,
    edge: "Start" | "End",
  ) {
    event.preventDefault();
    event.stopPropagation();
    onSelectClip(clip.id);

    const initialPointerPercent = percentFromPointer(event);
    const initialStartPercent = clip.startPercent;
    const initialEndPercent = clip.startPercent + clip.widthPercent;
    const minWidthPercent = 1;

    function handleMove(moveEvent: MouseEvent) {
      const deltaPercent = percentFromPointer(moveEvent) - initialPointerPercent;

      if (edge === "Start") {
        const nextStartPercent = clamp(
          initialStartPercent + deltaPercent,
          0,
          initialEndPercent - minWidthPercent,
        );

        onChangeClipTiming(clip.id, nextStartPercent, initialEndPercent - nextStartPercent);
        return;
      }

      const nextEndPercent = clamp(
        initialEndPercent + deltaPercent,
        initialStartPercent + minWidthPercent,
        100,
      );

      onChangeClipTiming(clip.id, initialStartPercent, nextEndPercent - initialStartPercent);
    }

    function stopDrag() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDrag);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDrag);
  }

  function nudgePlayhead(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 5 : 1;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onChangePlayhead(clamp(playheadPercent - step, 0, 100));
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      onChangePlayhead(clamp(playheadPercent + step, 0, 100));
    }
  }

  function overviewPercentFromPointer(event: MouseEvent | React.MouseEvent<HTMLElement>) {
    const rect = overviewRef.current?.getBoundingClientRect();

    if (!rect) {
      return visibleStartPercent;
    }

    return clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
  }

  function startOverviewDrag(
    event: React.MouseEvent<HTMLElement>,
    mode: "Move" | "Start" | "End",
  ) {
    event.preventDefault();
    event.stopPropagation();

    const initialPointerPercent = overviewPercentFromPointer(event);
    const initialStartPercent = visibleStartPercent;
    const initialWidthPercent = visibleWidthPercent;

    function handleMove(moveEvent: MouseEvent) {
      const deltaPercent = overviewPercentFromPointer(moveEvent) - initialPointerPercent;

      if (mode === "Move") {
        onChangeVisibleWindow(initialStartPercent + deltaPercent, initialWidthPercent);
        return;
      }

      if (mode === "Start") {
        const nextStartPercent = Math.min(
          initialStartPercent + initialWidthPercent - 10,
          initialStartPercent + deltaPercent,
        );
        onChangeVisibleWindow(
          nextStartPercent,
          initialWidthPercent + initialStartPercent - nextStartPercent,
        );
        return;
      }

      onChangeVisibleWindow(initialStartPercent, initialWidthPercent + deltaPercent);
    }

    function stopDrag() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDrag);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDrag);
  }

  const trackGridTemplate = tracks
    .map((track) => `${trackHeights[track.id] ?? 1}fr`)
    .join(" 6px ");
  const overviewStyle = {
    "--overview-start": visibleStartPercent,
    "--overview-width": visibleWidthPercent,
  } as React.CSSProperties;

  useEffect(() => {
    const lanes = lanesRef.current;

    if (!lanes) {
      return;
    }

    const maxScrollLeft = lanes.scrollWidth - lanes.clientWidth;
    const maxStartPercent = 100 - visibleWidthPercent;
    const nextScrollLeft =
      maxStartPercent <= 0 ? 0 : (visibleStartPercent / maxStartPercent) * maxScrollLeft;

    lanes.scrollLeft = nextScrollLeft;
    setTimelineScrollLeft(nextScrollLeft);
  }, [visibleStartPercent, visibleWidthPercent]);

  return (
    <div className="oa-editor-area">
      <div
        aria-label="Timeline zoom and scroll overview"
        className="oa-overview"
        onMouseDown={(event) => {
          const pointerPercent = overviewPercentFromPointer(event);
          onChangeVisibleWindow(pointerPercent - visibleWidthPercent / 2, visibleWidthPercent);
        }}
        ref={overviewRef}
        role="group"
      >
        <div
          aria-valuemax={100}
          aria-valuemin={10}
          aria-valuenow={Math.round(visibleWidthPercent)}
          aria-label="Visible timeline range"
          className="oa-overview-window"
          onMouseDown={(event) => startOverviewDrag(event, "Move")}
          role="slider"
          style={overviewStyle}
          tabIndex={0}
        >
          <span
            aria-hidden="true"
            className="oa-overview-handle start"
            onMouseDown={(event) => startOverviewDrag(event, "Start")}
          />
          <span
            aria-hidden="true"
            className="oa-overview-handle end"
            onMouseDown={(event) => startOverviewDrag(event, "End")}
          />
        </div>
      </div>
      <div className="oa-timeline-grid">
        <div className="oa-ruler-gutter" />
        <TimelineRuler
          durationSeconds={durationSeconds}
          scrollLeft={timelineScrollLeft}
          timelineWidthPercent={timelineWidthPercent}
          zoomLevel={zoomLevel}
        />
        <div className="oa-track-heads" style={{ gridTemplateRows: trackGridTemplate }}>
          {tracks.map((track, index) => (
            <div className="oa-track-stack" key={track.id} style={{ display: "contents" }}>
              <TrackHeader
                isSelected={track.id === selectedTrackId}
                onChangeGain={(gainDb) => onChangeTrackGain(track.id, gainDb)}
                onChangePan={(pan) => onChangeTrackPan(track.id, pan)}
                onSelect={() => onSelectTrack(track.id)}
                track={track}
              />
              {index < tracks.length - 1 ? (
                <ResizableHandle
                  axis="Y"
                  label={`Resize ${track.name}`}
                  onResize={(delta) => onResizeTrack(track.id, tracks[index + 1].id, delta)}
                />
              ) : null}
            </div>
          ))}
        </div>
        <ResizableHandle
          axis="X"
          label="Resize track headers and timeline"
          onResize={onResizeTrackHead}
        />
        <div className="oa-playhead-layer">
          <div
            className="oa-playhead-content"
            style={{
              transform: `translateX(-${timelineScrollLeft}px)`,
              width: `${timelineWidthPercent}%`,
            }}
          >
            <div
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(playheadPercent)}
              aria-label="Transport playhead"
              className="oa-playhead"
              onKeyDown={nudgePlayhead}
              onMouseDown={startPlayheadDrag}
              role="slider"
              style={{ left: `${playheadPercent}%` }}
              tabIndex={0}
            />
          </div>
        </div>
        <div
          className="oa-lanes"
          ref={lanesRef}
          onScroll={(event) => setTimelineScrollLeft(event.currentTarget.scrollLeft)}
        >
          <div
            className="oa-lane-content"
            ref={laneContentRef}
            style={{ gridTemplateRows: trackGridTemplate, width: `${timelineWidthPercent}%` }}
          >
            {tracks.map((track, index) => {
              const trackClips = clips.filter((clip) => clip.trackId === track.id);

              return (
                <div className="oa-track-stack" key={track.id} style={{ display: "contents" }}>
                  <div
                    className={`oa-lane ${track.id === selectedTrackId ? "is-selected" : ""}`}
                    onMouseDown={(event) => {
                      if (event.currentTarget === event.target) {
                        movePlayheadToPointer(event);
                      }
                    }}
                    onClick={() => onSelectTrack(track.id)}
                  >
                    {trackClips.map((clip) => (
                      <button
                        className={`oa-clip color-${clip.color.toLowerCase()} ${
                          clip.id === selectedClipId ? "is-selected" : ""
                        }`}
                        key={clip.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                        onMouseDown={(event) => {
                          event.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                        onDoubleClick={() => onOpenClip(clip.id)}
                        style={{
                          left: `${clip.startPercent}%`,
                          width: `${clip.widthPercent}%`,
                        }}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className="oa-clip-trim start"
                          onMouseDown={(event) => startClipTrimDrag(event, clip, "Start")}
                        />
                        <span className="oa-clip-name">{clip.name}</span>
                        <span className="oa-wave-line" />
                        <span className="oa-wave-line second" />
                        <span
                          aria-hidden="true"
                          className="oa-clip-trim end"
                          onMouseDown={(event) => startClipTrimDrag(event, clip, "End")}
                        />
                      </button>
                    ))}
                  </div>
                  {index < tracks.length - 1 ? (
                    <ResizableHandle
                      axis="Y"
                      label={`Resize ${track.name} lane`}
                      onResize={(delta) => onResizeTrack(track.id, tracks[index + 1].id, delta)}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
