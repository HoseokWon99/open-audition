import type React from "react";
import type { Track } from "../../types/audio";
import { clamp } from "../../utils/math";

interface TrackHeaderProps {
  isSelected: boolean;
  onChangeGain: (gainDb: number) => void;
  onChangePan: (pan: number) => void;
  onSelect: () => void;
  style?: React.CSSProperties;
  track: Track;
}

const MIN_ANGLE = -135;
const MAX_ANGLE = 135;

function valueToAngle(value: number, min: number, max: number) {
  const ratio = (value - min) / (max - min);
  return MIN_ANGLE + ratio * (MAX_ANGLE - MIN_ANGLE);
}

function valueFromPointer(
  event: React.PointerEvent<HTMLSpanElement>,
  min: number,
  max: number,
) {
  const rect = event.currentTarget.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radians = Math.atan2(event.clientY - centerY, event.clientX - centerX);
  let degrees = (radians * 180) / Math.PI + 90;

  if (degrees > 180) {
    degrees -= 360;
  }

  const clampedDegrees = clamp(degrees, MIN_ANGLE, MAX_ANGLE);
  const ratio = (clampedDegrees - MIN_ANGLE) / (MAX_ANGLE - MIN_ANGLE);

  return Math.round(min + ratio * (max - min));
}

export function TrackHeader({
  isSelected,
  onChangeGain,
  onChangePan,
  onSelect,
  style,
  track,
}: TrackHeaderProps) {
  function updateGain(event: React.PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onChangeGain(valueFromPointer(event, -24, 12));
  }

  function updatePan(event: React.PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onChangePan(valueFromPointer(event, -100, 100));
  }

  return (
    <button
      className={`oa-track-head color-${track.color} ${isSelected ? "is-selected" : ""}`}
      onClick={onSelect}
      style={style}
      type="button"
    >
      <span className="oa-track-name">⌁ {track.name}</span>
      <span className="oa-track-buttons">
        <span>M</span>
        <span>S</span>
      </span>
      <span className="oa-knobs">
        <span className="oa-knob-group">
          <span
            className="oa-knob"
            onPointerDown={updateGain}
            onPointerMove={(event) => {
              if (event.buttons === 1) updateGain(event);
            }}
            role="slider"
            style={{ "--knob-angle": `${valueToAngle(track.gainDb, -24, 12)}deg` } as React.CSSProperties}
            tabIndex={0}
            aria-label={`${track.name} gain`}
            aria-valuemin={-24}
            aria-valuemax={12}
            aria-valuenow={track.gainDb}
          />
          <span className="oa-knob-value">
            {track.gainDb >= 0 ? `+${track.gainDb}` : track.gainDb}
          </span>
        </span>
        <span className="oa-knob-group">
          <span
            className="oa-knob"
            onPointerDown={updatePan}
            onPointerMove={(event) => {
              if (event.buttons === 1) updatePan(event);
            }}
            role="slider"
            style={{ "--knob-angle": `${valueToAngle(track.pan, -100, 100)}deg` } as React.CSSProperties}
            tabIndex={0}
            aria-label={`${track.name} pan`}
            aria-valuemin={-100}
            aria-valuemax={100}
            aria-valuenow={track.pan}
          />
          <span className="oa-knob-value">{track.pan}</span>
        </span>
      </span>
      <span className="oa-route">
        <span className="oa-route-arrow">→</span>
        <span>{track.input} ›</span>
      </span>
      <span className="oa-route">
        <span className="oa-route-arrow">←</span>
        <span>{track.output} ›</span>
      </span>
    </button>
  );
}
