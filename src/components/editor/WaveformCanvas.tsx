import { TimelineRuler } from "./TimelineRuler";
import { useWaveformSelection } from "../../hooks/useWaveformSelection";
import { useWaveformViewport } from "../../hooks/useWaveformViewport";
import { useWaveSurferRenderer } from "../../hooks/useWaveSurferRenderer";
import type { MediaFile } from "../../types/audio";
import { clamp } from "../../utils/math";

const bars = Array.from({ length: 180 }, (_, index) => {
  const rise = Math.min(1, index / 40);
  const fall = index > 118 ? Math.max(0.18, 1 - (index - 118) / 72) : 1;
  const variance = 0.62 + Math.sin(index * 0.33) * 0.22 + Math.sin(index * 1.7) * 0.13;
  return clamp(rise * fall * variance, 0.08, 1);
});

const fallbackWaveformPeaks = [
  bars,
  bars.map((height, index) => clamp(height * (0.88 + Math.sin(index * 0.21) * 0.12), 0.08, 1)),
];

interface WaveformCanvasProps {
  file?: MediaFile;
}

export function WaveformCanvas({ file }: WaveformCanvasProps) {
  const waveformRef = useWaveSurferRenderer(file, fallbackWaveformPeaks);
  const {
    contentStyle,
    changeVisibleWindow,
    overviewRef,
    overviewStyle,
    overviewPercentFromPointer,
    scrollLeft,
    startOverviewDrag,
    timelineWidthPercent,
    viewportRef,
    visibleWidthPercent,
  } = useWaveformViewport();
  const {
    activeSubmenu,
    closeSubmenu,
    collapseSubmenu,
    collapsedSubmenu,
    contentRef,
    openSelectionMenu,
    openSubmenu,
    playheadPercent,
    selection,
    selectionMenu,
    selectionStyle,
    startPlayheadDrag,
    startSelectionDrag,
  } = useWaveformSelection();

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
          <div aria-label="Rendered waveform" className="oa-wavesurfer-waveform" ref={waveformRef} />
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
