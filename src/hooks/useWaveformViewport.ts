import { useEffect, useRef, useState } from "react";
import type React from "react";
import { clamp } from "../utils/math";

type OverviewDragMode = "Move" | "Start" | "End";

export function useWaveformViewport() {
  const overviewRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
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

  function overviewPercentFromPointer(event: MouseEvent | React.MouseEvent<HTMLElement>) {
    const rect = overviewRef.current?.getBoundingClientRect();

    if (!rect) {
      return visibleStartPercent;
    }

    return clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
  }

  function startOverviewDrag(event: React.MouseEvent<HTMLElement>, mode: OverviewDragMode) {
    event.preventDefault();
    event.stopPropagation();

    const initialPointerPercent = overviewPercentFromPointer(event);
    const initialStartPercent = visibleStartPercent;
    const initialWidthPercent = visibleWidthPercent;

    function handleMove(moveEvent: MouseEvent) {
      const deltaPercent = overviewPercentFromPointer(moveEvent) - initialPointerPercent;

      if (mode === "Move") {
        changeVisibleWindow(initialStartPercent + deltaPercent, initialWidthPercent);
        return;
      }

      if (mode === "Start") {
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

  return {
    contentStyle: {
      transform: `translateX(-${scrollLeft}px)`,
      width: `${timelineWidthPercent}%`,
    },
    changeVisibleWindow,
    overviewRef,
    overviewStyle: {
      "--overview-start": visibleStartPercent,
      "--overview-width": visibleWidthPercent,
    } as React.CSSProperties,
    overviewPercentFromPointer,
    scrollLeft,
    startOverviewDrag,
    timelineWidthPercent,
    viewportRef,
    visibleWidthPercent,
  };
}
