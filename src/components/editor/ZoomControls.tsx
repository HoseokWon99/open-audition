interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut }: ZoomControlsProps) {
  const controls = [
    { label: "Increase track height", icon: "vertical-in", disabled: true },
    { label: "Decrease track height", icon: "vertical-out", disabled: true },
    { label: "Zoom in horizontally", icon: "horizontal-in", onClick: onZoomIn },
    { label: "Zoom out horizontally", icon: "horizontal-out", onClick: onZoomOut },
    { label: "Zoom to fit", icon: "fit", disabled: true },
    { label: "Zoom to playhead", icon: "target", disabled: true },
    { label: "Zoom selection in", icon: "selection-in", disabled: true },
    { label: "Zoom selection out", icon: "selection-out", disabled: true },
    { label: "Reset zoom", icon: "reset", disabled: true },
  ];

  return (
    <div className="oa-zoom">
      {controls.map((control, index) => (
        <button
          aria-label={control.label}
          className={index === 2 || index === 5 ? "has-divider" : undefined}
          disabled={control.disabled}
          key={control.icon}
          onClick={control.onClick}
          type="button"
        >
          <span className={`oa-zoom-icon ${control.icon}`} />
        </button>
      ))}
    </div>
  );
}
