import { useState } from "react";
import type React from "react";
import { LeftDock } from "../components/editor/LeftDock";
import { ResizableHandle } from "../components/editor/ResizableHandle";
import { TopBar } from "../components/editor/TopBar";
import { TransportBar } from "../components/editor/TransportBar";
import { WaveformCanvas } from "../components/editor/WaveformCanvas";
import type { Clip, MediaFile, MediaTab, ProjectSummary, Track } from "../types";

interface WaveformEditorPageProps {
  activeMediaTab: MediaTab;
  clips: Clip[];
  files: MediaFile[];
  project: ProjectSummary;
  selectedClipId: string;
  selectedFileId: string;
  tracks: Track[];
  onGoHome: () => void;
  onOpenFile: (fileId: string) => void;
  onOpenSettings: () => void;
  onSelectFile: (fileId: string) => void;
  onTabChange: (tab: MediaTab) => void;
}

export function WaveformEditorPage({
  activeMediaTab,
  clips,
  files,
  project,
  selectedClipId,
  selectedFileId,
  tracks,
  onGoHome,
  onOpenFile,
  onOpenSettings,
  onSelectFile,
  onTabChange,
}: WaveformEditorPageProps) {
  const selectedFile = files.find((file) => file.id === selectedFileId);
  const [leftDockWidth, setLeftDockWidth] = useState(318);
  const [inspectorHeight, setInspectorHeight] = useState(172);
  const [transportHeight, setTransportHeight] = useState(48);

  const layoutStyle = {
    "--left-dock-width": `${leftDockWidth}px`,
    "--inspector-height": `${inspectorHeight}px`,
    "--transport-height": `${transportHeight}px`,
  } as React.CSSProperties;

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  return (
    <main className="oa-shell" style={layoutStyle}>
      <TopBar
        onGoHome={onGoHome}
        onOpenSettings={onOpenSettings}
        title={`${project.name} / ${selectedFile?.name ?? "Waveform"}`}
      />
      <div className="oa-workspace">
        <LeftDock
          activeTab={activeMediaTab}
          clips={clips}
          files={files}
          onOpenFile={onOpenFile}
          onResizeInspector={(delta) =>
            setInspectorHeight((currentHeight) => clamp(currentHeight + delta, 112, 360))
          }
          onSelectFile={onSelectFile}
          onTabChange={onTabChange}
          selectedClipId={selectedClipId}
          selectedFileId={selectedFileId}
          tracks={tracks}
        />
        <ResizableHandle
          axis="x"
          label="Resize left dock and editor"
          onResize={(delta) =>
            setLeftDockWidth((currentWidth) => clamp(currentWidth + delta, 240, 520))
          }
        />
        <section className="oa-main">
          <WaveformCanvas />
          <ResizableHandle
            axis="y"
            label="Resize waveform and transport"
            onResize={(delta) =>
              setTransportHeight((currentHeight) => clamp(currentHeight - delta, 42, 90))
            }
          />
          <TransportBar currentTime="0:00.000" />
        </section>
      </div>
    </main>
  );
}
