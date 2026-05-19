import { useEffect, useRef, useState } from "react";
import type React from "react";
import { TimelineRuler } from "./TimelineRuler";
import { clamp } from "../../utils/math";

const bars = Array.from({ length: 180 }, (_, index) => {
  const rise = Math.min(1, index / 40);
  const fall = index > 118 ? Math.max(0.18, 1 - (index - 118) / 72) : 1;
  const variance = 0.62 + Math.sin(index * 0.33) * 0.22 + Math.sin(index * 1.7) * 0.13;
  return clamp(rise * fall * variance, 0.08, 1);
});

export function WaveformCanvas() {
  const overviewRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [playheadPercent, setPlayheadPercent] = useState(52);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [visibleStartPercent, setVisibleStartPercent] = useState(0);
  const [visibleWidthPercent, setVisibleWidthPercent] = useState(100);
  const timelineWidthPercent = (100 / visibleWidthPercent) * 100;

  function changeVisibleWindow(startPercent: number, widthPercent: number) {
    const nextWidthPercent = clamp(widthPercent, 10, 100);
    const nextStartPercent = clamp(startPercent, 0, 100 - nextWidthPercent);

    setVisibleWidthPercent(nextWidthPercent);
    setVisibleStartPercent(nextStartPercent);
  }

  function contentPercentFromPointer(event: MouseEvent | React.MouseEvent<HTMLElement>) {
    const rect = contentRef.current?.getBoundingClientRect();

    if (!rect) {
      return playheadPercent;
    }

    return clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
  }

  function overviewPercentFromPointer(event: MouseEvent | React.MouseEvent<HTMLElement>) {
    const rect = overviewRef.current?.getBoundingClientRect();

    if (!rect) {
      return visibleStartPercent;
    }

    return clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
  }

  function startPlayheadDrag(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setPlayheadPercent(contentPercentFromPointer(event));

    function handleMove(moveEvent: MouseEvent) {
      setPlayheadPercent(contentPercentFromPointer(moveEvent));
    }

    function stopDrag() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDrag);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDrag);
  }

  function startOverviewDrag(
    event: React.MouseEvent<HTMLElement>,
    mode: "move" | "start" | "end",
  ) {
    event.preventDefault();
    event.stopPropagation();

    const initialPointerPercent = overviewPercentFromPointer(event);
    const initialStartPercent = visibleStartPercent;
    const initialWidthPercent = visibleWidthPercent;

    function handleMove(moveEvent: MouseEvent) {
      const deltaPercent = overviewPercentFromPointer(moveEvent) - initialPointerPercent;

      if (mode === "move") {
        changeVisibleWindow(initialStartPercent + deltaPercent, initialWidthPercent);
        return;
      }

      if (mode === "start") {
        const nextStartPercent = Math.min(
          initialStartPercent + initialWidthPercent - 10,
          initialStartPercent + deltaPercent,
        );
        changeVisibleWindow(
          nextStartPercent,
          initialWidthPercent + initialStartPercent - nextStartPercent,
        );
        return;
      }

      changeVisibleWindow(initialStartPercent, initialWidthPercent + deltaPercent);
    }

    function stopDrag() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDrag);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDrag);
  }

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const contentWidth = viewport.clientWidth * (timelineWidthPercent / 100);
    const maxScrollLeft = contentWidth - viewport.clientWidth;
    const maxStartPercent = 100 - visibleWidthPercent;
    const nextScrollLeft =
      maxStartPercent <= 0 ? 0 : (visibleStartPercent / maxStartPercent) * maxScrollLeft;

    setScrollLeft(nextScrollLeft);
  }, [timelineWidthPercent, visibleStartPercent, visibleWidthPercent]);

  const overviewStyle = {
    "--overview-start": visibleStartPercent,
    "--overview-width": visibleWidthPercent,
  } as React.CSSProperties;
  const contentStyle = {
    transform: `translateX(-${scrollLeft}px)`,
    width: `${timelineWidthPercent}%`,
  };

  return (
    <div className="oa-waveform-editor">
      <div
        className="oa-wave-overview"
        onMouseDown={(event) => {
          const pointerPercent = overviewPercentFromPointer(event);
          changeVisibleWindow(pointerPercent - visibleWidthPercent / 2, visibleWidthPercent);
        }}
        ref={overviewRef}
      >
        {bars.map((height, index) => (
          <span key={index} style={{ height: `${12 + height * 28}px` }} />
        ))}
        <div
          aria-hidden="true"
          className="oa-wave-overview-window"
          onMouseDown={(event) => startOverviewDrag(event, "move")}
          style={overviewStyle}
        >
          <span
            aria-hidden="true"
            className="oa-overview-handle start"
            onMouseDown={(event) => startOverviewDrag(event, "start")}
          />
          <span
            aria-hidden="true"
            className="oa-overview-handle end"
            onMouseDown={(event) => startOverviewDrag(event, "end")}
          />
        </div>
      </div>
      <TimelineRuler
        durationSeconds={70}
        scrollLeft={scrollLeft}
        timelineWidthPercent={timelineWidthPercent}
        zoomLevel={3}
      />
      <div className="oa-wave-grid" onMouseDown={startPlayheadDrag} ref={viewportRef}>
        <div className="oa-wave-grid-content" ref={contentRef} style={contentStyle}>
          <div
            aria-hidden="true"
            className="oa-wave-playhead"
            onMouseDown={startPlayheadDrag}
            style={{ left: `${playheadPercent}%` }}
          />
          <div className="oa-fade-handle" />
          <div className="oa-floating-gain">▥ ◯ +0 dB ↗</div>
          <div className="oa-wave-channel">
            {bars.map((height, index) => (
              <span key={index} style={{ height: `${12 + height * 92}%` }} />
            ))}
          </div>
          <div className="oa-channel-divider" />
          <div className="oa-wave-channel bottom">
            {bars.map((height, index) => (
              <span key={index} style={{ height: `${16 + height * 104}%` }} />
            ))}
          </div>
          <div className="oa-db-scale">
            <span>dB</span>
            <span>-3</span>
            <span>-6</span>
            <span>-12</span>
            <span>-∞</span>
          </div>
        </div>
      </div>
    </div>
  );
}
