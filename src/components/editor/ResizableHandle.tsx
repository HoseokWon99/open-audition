import type React from "react";

interface ResizableHandleProps {
  axis: "x" | "y";
  label: string;
  onResize: (delta: number) => void;
}

export function ResizableHandle({ axis, label, onResize }: ResizableHandleProps) {
  function startResize(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();

    let lastPosition = axis === "x" ? event.clientX : event.clientY;

    function handleMove(moveEvent: MouseEvent) {
      const nextPosition = axis === "x" ? moveEvent.clientX : moveEvent.clientY;
      onResize(nextPosition - lastPosition);
      lastPosition = nextPosition;
    }

    function stopResize() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopResize);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopResize);
  }

  return (
    <div
      aria-label={label}
      className={`oa-resizer oa-resizer-${axis}`}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 24 : 8;

        if (axis === "x" && event.key === "ArrowLeft") {
          event.preventDefault();
          onResize(-step);
        }

        if (axis === "x" && event.key === "ArrowRight") {
          event.preventDefault();
          onResize(step);
        }

        if (axis === "y" && event.key === "ArrowUp") {
          event.preventDefault();
          onResize(-step);
        }

        if (axis === "y" && event.key === "ArrowDown") {
          event.preventDefault();
          onResize(step);
        }
      }}
      onMouseDown={startResize}
      role="separator"
      tabIndex={0}
    />
  );
}
