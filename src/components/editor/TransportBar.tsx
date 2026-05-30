import type { TransportState } from "../../libs/audio/engine";

interface TransportBarProps {
  currentTime: string;
  state: TransportState;
  onFastForward: () => void;
  onPause: () => void;
  onPlay: () => void;
  onRewind: () => void;
  onSeekEnd: () => void;
  onSeekStart: () => void;
  onStop: () => void;
}

export function TransportBar({
  currentTime,
  state,
  onFastForward,
  onPause,
  onPlay,
  onRewind,
  onSeekEnd,
  onSeekStart,
  onStop,
}: TransportBarProps) {
  const controls = [
    { label: "Stop", icon: "stop", onClick: onStop, pressed: state === "Stopped" },
    { label: "Play", icon: "play", onClick: onPlay, pressed: state === "Playing" },
    { label: "Pause", icon: "pause", onClick: onPause, pressed: state === "Paused" },
    { label: "Go to start", icon: "skip-start", onClick: onSeekStart, pressed: false },
    { label: "Rewind", icon: "rewind", onClick: onRewind, pressed: false },
    { label: "Fast forward", icon: "fast-forward", onClick: onFastForward, pressed: false },
    { label: "Go to end", icon: "skip-end", onClick: onSeekEnd, pressed: false },
  ];

  return (
    <div className="oa-bottom">
      <div className="oa-time-readout">{currentTime}</div>
      <div className="oa-transport">
        {controls.map((control) => (
          <button
            aria-label={control.label}
            aria-pressed={control.pressed}
            key={control.icon}
            onClick={control.onClick}
            type="button"
          >
            <span className={`oa-transport-icon ${control.icon}`} />
          </button>
        ))}
        <button aria-label="Record" className="oa-record" type="button">
          <span className="oa-transport-icon record" />
        </button>
      </div>
    </div>
  );
}
