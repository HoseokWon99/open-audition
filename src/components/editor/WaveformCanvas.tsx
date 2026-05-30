import { useEffect, useRef, useState } from "react";
import type React from "react";
import { TimelineRuler } from "./TimelineRuler";
import { createWaveformSelection } from "./waveformSelection";
import type { WaveformSelection } from "./waveformSelection";
import { clamp } from "../../utils/math";

const bars = Array.from({ length: 180 }, (_, index) => {
  const rise = Math.min(1, index / 40);
  const fall = index > 118 ? Math.max(0.18, 1 - (index - 118) / 72) : 1;
  const variance = 0.62 + Math.sin(index * 0.33) * 0.22 + Math.sin(index * 1.7) * 0.13;
  return clamp(rise * fall * variance, 0.08, 1);
});

type SelectionSubmenu = "Effects" | "InsertIntoMultitrack";

export function WaveformCanvas() {
  const overviewRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [playheadPercent, setPlayheadPercent] = useState(52);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [selection, setSelection] = useState<WaveformSelection | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<SelectionSubmenu | null>(null);
  const [collapsedSubmenu, setCollapsedSubmenu] = useState<SelectionSubmenu | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number } | null>(null);
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

  function startSelectionDrag(event: React.MouseEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    setSelectionMenu(null);
    setActiveSubmenu(null);
    setCollapsedSubmenu(null);

    const anchorPercent = contentPercentFromPointer(event);
    setSelection(null);

    function handleMove(moveEvent: MouseEvent) {
      setSelection(createWaveformSelection(anchorPercent, contentPercentFromPointer(moveEvent)));
    }

    function stopDrag(upEvent: MouseEvent) {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDrag);

      const nextSelection = createWaveformSelection(anchorPercent, contentPercentFromPointer(upEvent));

      if (!nextSelection) {
        setPlayheadPercent(contentPercentFromPointer(upEvent));
      }

      setSelection(nextSelection);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDrag);
  }

  function openSelectionMenu(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();

    if (!selection) {
      setSelectionMenu(null);
      return;
    }

    const pointerPercent = contentPercentFromPointer(event);

    if (pointerPercent < selection.startPercent || pointerPercent > selection.endPercent) {
      setSelectionMenu(null);
      return;
    }

    setSelectionMenu({ x: event.clientX, y: event.clientY });
    setActiveSubmenu(null);
    setCollapsedSubmenu(null);
  }

  function openSubmenu(name: SelectionSubmenu) {
    if (collapsedSubmenu !== name) {
      setActiveSubmenu(name);
    }
  }

  function closeSubmenu(name: SelectionSubmenu) {
    setActiveSubmenu((currentSubmenu) => (currentSubmenu === name ? null : currentSubmenu));
    setCollapsedSubmenu((currentSubmenu) => (currentSubmenu === name ? null : currentSubmenu));
  }

  function collapseSubmenu(name: SelectionSubmenu) {
    setActiveSubmenu((currentSubmenu) => (currentSubmenu === name ? null : currentSubmenu));
    setCollapsedSubmenu(name);
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

  useEffect(() => {
    function closeMenu() {
      setSelectionMenu(null);
      setActiveSubmenu(null);
      setCollapsedSubmenu(null);
    }

    function closeMenuWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeMenuWithEscape);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeMenuWithEscape);
    };
  }, []);

  const overviewStyle = {
    "--overview-start": visibleStartPercent,
    "--overview-width": visibleWidthPercent,
  } as React.CSSProperties;
  const contentStyle = {
    transform: `translateX(-${scrollLeft}px)`,
    width: `${timelineWidthPercent}%`,
  };
  const selectionStyle = selection
    ? ({
        "--selection-start": selection.startPercent,
        "--selection-width": selection.endPercent - selection.startPercent,
        "--selection-center": (selection.startPercent + selection.endPercent) / 2,
      } as React.CSSProperties)
    : undefined;

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
        {selection ? (
          <div aria-hidden="true" className="oa-wave-overview-selection" style={selectionStyle} />
        ) : null}
        <div
          aria-hidden="true"
          className="oa-wave-overview-window"
          onMouseDown={(event) => startOverviewDrag(event, "Move")}
          style={overviewStyle}
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
      <TimelineRuler
        durationSeconds={70}
        scrollLeft={scrollLeft}
        timelineWidthPercent={timelineWidthPercent}
        zoomLevel={3}
      />
      <div className="oa-wave-grid" onMouseDown={startSelectionDrag} ref={viewportRef}>
        <div
          className="oa-wave-grid-content"
          onContextMenu={openSelectionMenu}
          ref={contentRef}
          style={contentStyle}
        >
          {selection ? (
            <div
              aria-label="Selected waveform range"
              className="oa-wave-selection"
              data-testid="waveform-selection"
              style={selectionStyle}
            />
          ) : null}
          <div
            aria-hidden="true"
            className="oa-wave-playhead"
            onMouseDown={startPlayheadDrag}
            style={{ left: `${playheadPercent}%` }}
          />
          <div className="oa-fade-handle" />
          <div className="oa-floating-gain" style={selectionStyle}>
            ▥ ◯ +0 dB ↗
          </div>
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
        {selectionMenu ? (
          <div
            className="oa-wave-selection-menu"
            data-testid="waveform-selection-menu"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            style={{ left: selectionMenu.x, top: selectionMenu.y }}
          >
            <button className="oa-menu-item" type="button">
              <span>Copy</span>
              <span className="oa-menu-shortcut">⌘ C</span>
            </button>
            <button className="oa-menu-item" type="button">
              <span>CopyToNew</span>
              <span className="oa-menu-shortcut">⌥ ⇧ C</span>
            </button>
            <button className="oa-menu-item" type="button">
              <span>Cut</span>
              <span className="oa-menu-shortcut">⌘ X</span>
            </button>
            <button className="oa-menu-item" type="button">
              <span>Delete</span>
              <span className="oa-menu-shortcut">⌫</span>
            </button>
            <button className="oa-menu-item" type="button">
              <span>Paste</span>
              <span className="oa-menu-shortcut">⌘ V</span>
            </button>
            <div className="oa-menu-separator" />
            <div
              className={`oa-menu-submenu ${activeSubmenu === "Effects" ? "open" : ""} ${
                collapsedSubmenu === "Effects" ? "collapsed" : ""
              }`}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  closeSubmenu("Effects");
                }
              }}
              onFocus={() => openSubmenu("Effects")}
              onMouseEnter={() => openSubmenu("Effects")}
              onMouseLeave={() => closeSubmenu("Effects")}
            >
              <button
                aria-expanded={activeSubmenu === "Effects"}
                aria-haspopup="menu"
                className="oa-menu-item"
                onClick={(event) => {
                  event.stopPropagation();
                  collapseSubmenu("Effects");
                }}
                type="button"
              >
                <span>Effects</span>
                <span aria-hidden="true" className="oa-menu-chevron">›</span>
              </button>
              <div
                aria-hidden={activeSubmenu !== "Effects"}
                className="oa-menu-submenu-panel"
                data-testid="waveform-effects-submenu"
                role="menu"
              >
                <button className="oa-menu-item" role="menuitem" type="button">
                  <span>Gain</span>
                </button>
                <button className="oa-menu-item" role="menuitem" type="button">
                  <span>EQ</span>
                </button>
                <button className="oa-menu-item" role="menuitem" type="button">
                  <span>Filter</span>
                </button>
                <button className="oa-menu-item" role="menuitem" type="button">
                  <span>Reverb</span>
                </button>
                <button className="oa-menu-item" role="menuitem" type="button">
                  <span>Delay</span>
                </button>
                <button className="oa-menu-item" role="menuitem" type="button">
                  <span>Pitch Shift</span>
                </button>
                <button className="oa-menu-item" role="menuitem" type="button">
                  <span>Time Stretch</span>
                </button>
                <button className="oa-menu-item" role="menuitem" type="button">
                  <span>Noise Reduction</span>
                </button>
                <button className="oa-menu-item" role="menuitem" type="button">
                  <span>Normalize</span>
                </button>
              </div>
            </div>
            <div className="oa-menu-separator" />
            <div
              className={`oa-menu-submenu ${
                activeSubmenu === "InsertIntoMultitrack" ? "open" : ""
              } ${collapsedSubmenu === "InsertIntoMultitrack" ? "collapsed" : ""}`}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  closeSubmenu("InsertIntoMultitrack");
                }
              }}
              onFocus={() => openSubmenu("InsertIntoMultitrack")}
              onMouseEnter={() => openSubmenu("InsertIntoMultitrack")}
              onMouseLeave={() => closeSubmenu("InsertIntoMultitrack")}
            >
              <button
                aria-expanded={activeSubmenu === "InsertIntoMultitrack"}
                aria-haspopup="menu"
                className="oa-menu-item"
                onClick={(event) => {
                  event.stopPropagation();
                  collapseSubmenu("InsertIntoMultitrack");
                }}
                type="button"
              >
                <span>Insert into multitrack</span>
                <span className="oa-menu-chevron">›</span>
              </button>
              <div
                aria-hidden={activeSubmenu !== "InsertIntoMultitrack"}
                className="oa-menu-submenu-panel"
                data-testid="waveform-insert-submenu"
                role="menu"
              >
                <button className="oa-menu-item" role="menuitem" type="button">
                  <span>물안경.sesx</span>
                </button>
                <div className="oa-menu-separator" />
                <button className="oa-menu-item" role="menuitem" type="button">
                  <span>Create New</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
