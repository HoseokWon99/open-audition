import type React from "react";
import { formatTimelineTimestamp } from "../../utils/time";

interface TimelineRulerProps {
  durationSeconds: number;
  scrollLeft?: number;
  timelineWidthPercent: number;
  zoomLevel?: number;
}

const labelSteps = [60, 30, 10, 5, 1, 0.5, 0.1, 0.05, 0.01];

function decimalPlaces(value: number) {
  const decimal = value.toString().split(".")[1];

  return decimal?.length ?? 0;
}

function subtickStepForLabelStep(labelStep: number) {
  const normalizedStep = Number(labelStep.toExponential(12).split("e")[0]);

  if (Math.abs(Math.abs(normalizedStep) - 5) < 0.001) {
    return labelStep / 5;
  }

  return labelStep / 2;
}

export function TimelineRuler({
  durationSeconds,
  scrollLeft = 0,
  timelineWidthPercent,
}: TimelineRulerProps) {
  const visibleDurationSeconds = durationSeconds / (timelineWidthPercent / 100);
  const targetVisibleLabels = 8;
  const rawLabelStep = visibleDurationSeconds / targetVisibleLabels;
  const labelStep =
    labelSteps.find((candidate) => candidate <= rawLabelStep) ??
    labelSteps[labelSteps.length - 1];
  const tickStep = subtickStepForLabelStep(labelStep);
  const precision = Math.min(3, decimalPlaces(labelStep));
  const tickCount = Math.floor(durationSeconds / tickStep) + 1;
  const ticks = Array.from({ length: tickCount }, (_, index) =>
    Number((index * tickStep).toFixed(3)),
  );

  return (
    <div className="oa-ruler">
      <div
        className="oa-ruler-content"
        style={
          {
            transform: `translateX(-${scrollLeft}px)`,
            width: `${timelineWidthPercent}%`,
          } as React.CSSProperties
        }
      >
        <span className="oa-ruler-unit">hms</span>
        {ticks.map((seconds) => {
          const isLabelTick =
            seconds > 0 &&
            Math.abs(seconds / labelStep - Math.round(seconds / labelStep)) < 0.001;

          return (
            <span
              className={isLabelTick ? "oa-ruler-major" : "oa-ruler-minor"}
              key={seconds}
              style={{ left: `${(seconds / durationSeconds) * 100}%` }}
            >
              {isLabelTick ? formatTimelineTimestamp(seconds, precision) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
