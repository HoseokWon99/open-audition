import { useEffect, useRef, useState } from "react";
import type React from "react";
import { TimelineRuler } from "./TimelineRuler";
import { TrackHeader } from "./TrackHeader";
import { ResizableHandle } from "./ResizableHandle";
import { ClipWaveformPreview } from "./ClipWaveformPreview";
import type { MediaFile, TimelineClip, TimelineTrack } from "../../types/audio";
import { clamp } from "../../utils/math";

interface ClipLevelKeyframe {
  id: string;
  xPercent: number;
  yPercent: number;
}

interface MultitrackTimelineProps {
  clips: TimelineClip[];
  durationSeconds: number;
  playheadPercent: number;
  timelineWidthPercent: number;
  selectedClipId: string;
  selectedTrackId: string;
  trackHeights: Record<string, number>;
  tracks: TimelineTrack[];
  visibleStartPercent: number;
  visibleWidthPercent: number;
  zoomLevel: number;
  getClipFile: (clip: TimelineClip) => MediaFile | undefined;
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
  getClipFile,
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
  const [clipLevelKeyframes, setClipLevelKeyframes] = useState<Record<string, ClipLevelKeyframe[]>>(
    {},
  );
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
    clip: TimelineClip,
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

  function addClipLevelKeyframe(event: React.MouseEvent<SVGSVGElement>, clip: TimelineClip) {
    event.preventDefault();
    event.stopPropagation();
    onSelectClip(clip.id);

    const rect = event.currentTarget.getBoundingClientRect();
    const xPercent = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const yPercent = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    const keyframeId = `${clip.id}-${Math.round(xPercent * 100)}-${Math.round(yPercent * 100)}`;

    setClipLevelKeyframes((currentKeyframes) => {
      const existingKeyframes = currentKeyframes[clip.id] ?? defaultClipLevelKeyframes();
      const nextKeyframes = existingKeyframes
        .filter((keyframe) => Math.abs(keyframe.xPercent - xPercent) > 1.25)
        .concat({ id: keyframeId, xPercent, yPercent })
        .sort((left, right) => left.xPercent - right.xPercent);

      return {
        ...currentKeyframes,
        [clip.id]: nextKeyframes,
      };
    });
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
                    {trackClips.map((clip) => {
                      const levelKeyframes = clipLevelKeyframes[clip.id] ?? defaultClipLevelKeyframes();

                      return (
                      <button
                        className={`oa-clip ${clip.id === selectedClipId ? "is-selected" : ""}`}
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
                          "--clip-color": clip.color,
                          left: `${clip.startPercent}%`,
                          width: `${clip.widthPercent}%`,
                        } as React.CSSProperties}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className="oa-clip-trim start"
                          onMouseDown={(event) => startClipTrimDrag(event, clip, "Start")}
                        />
                        <span className="oa-clip-name">{clip.name}</span>
                        <ClipWaveformPreview file={getClipFile(clip)} />
                        <svg
                          aria-hidden="true"
                          className="oa-clip-level"
                          onClick={(event) => addClipLevelKeyframe(event, clip)}
                          onMouseDown={(event) => event.stopPropagation()}
                          preserveAspectRatio="none"
                          viewBox="0 0 100 100"
                        >
                          <rect className="oa-clip-level-hitbox" height="100" width="100" />
                          <polyline
                            className="oa-clip-level-line"
                            points={levelKeyframes
                              .map((keyframe) => `${keyframe.xPercent},${keyframe.yPercent}`)
                              .join(" ")}
                          />
                          {levelKeyframes.map((keyframe) => (
                            <rect
                              className="oa-clip-level-keyframe"
                              height="3.8"
                              key={keyframe.id}
                              transform={`rotate(45 ${keyframe.xPercent} ${keyframe.yPercent})`}
                              width="3.8"
                              x={keyframe.xPercent - 1.9}
                              y={keyframe.yPercent - 1.9}
                            />
                          ))}
                        </svg>
                        <span
                          aria-hidden="true"
                          className="oa-clip-trim end"
                          onMouseDown={(event) => startClipTrimDrag(event, clip, "End")}
                        />
                      </button>
                      );
                    })}
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

function defaultClipLevelKeyframes(): ClipLevelKeyframe[] {
  return [
    { id: "start", xPercent: 0, yPercent: 50 },
    { id: "end", xPercent: 100, yPercent: 50 },
  ];
}
