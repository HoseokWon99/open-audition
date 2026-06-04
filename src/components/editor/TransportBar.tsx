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
  const playbackControl =
    state === "Playing"
      ? { key: "playback", label: "Pause", icon: "pause", onClick: onPause, pressed: true }
      : {
          key: "playback",
          label: "Play",
          icon: "play",
          onClick: onPlay,
          pressed: state === "Paused",
        };
  const controls = [
    { key: "stop", label: "Stop", icon: "stop", onClick: onStop, pressed: state === "Stopped" },
    playbackControl,
    { key: "skip-start", label: "Go to start", icon: "skip-start", onClick: onSeekStart, pressed: false },
    { key: "rewind", label: "Rewind", icon: "rewind", onClick: onRewind, pressed: false },
    { key: "fast-forward", label: "Fast forward", icon: "fast-forward", onClick: onFastForward, pressed: false },
    { key: "skip-end", label: "Go to end", icon: "skip-end", onClick: onSeekEnd, pressed: false },
  ];

  return (
    <div className="oa-bottom">
      <div className="oa-time-readout">{currentTime}</div>
      <div className="oa-transport">
        {controls.map((control) => (
          <button
            aria-label={control.label}
            aria-pressed={control.pressed}
            key={control.key}
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
