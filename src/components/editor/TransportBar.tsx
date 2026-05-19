interface TransportBarProps {
  currentTime: string;
}

export function TransportBar({ currentTime }: TransportBarProps) {
  const controls = [
    { label: "Stop", icon: "stop" },
    { label: "Play", icon: "play" },
    { label: "Pause", icon: "pause" },
    { label: "Go to start", icon: "skip-start" },
    { label: "Rewind", icon: "rewind" },
    { label: "Fast forward", icon: "fast-forward" },
    { label: "Go to end", icon: "skip-end" },
  ];

  return (
    <div className="oa-bottom">
      <div className="oa-time-readout">{currentTime}</div>
      <div className="oa-transport">
        {controls.map((control) => (
          <button aria-label={control.label} key={control.icon} type="button">
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
