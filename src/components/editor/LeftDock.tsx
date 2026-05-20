import { Inspector } from "./Inspector";
import { MediaBrowser } from "./MediaBrowser";
import { ResizableHandle } from "./ResizableHandle";
import type { Clip, MediaFile, MediaTab, Track } from "../../types";

interface LeftDockProps {
  activeTab: MediaTab;
  clips: Clip[];
  files: MediaFile[];
  selectedClipId: string;
  selectedFileId: string;
  tracks: Track[];
  onResizeInspector: (delta: number) => void;
  onOpenFile: (fileId: string) => void;
  onSelectFile: (fileId: string) => void;
  onTabChange: (tab: MediaTab) => void;
}

export function LeftDock({
  activeTab,
  clips,
  files,
  selectedClipId,
  selectedFileId,
  tracks,
  onResizeInspector,
  onOpenFile,
  onSelectFile,
  onTabChange,
}: LeftDockProps) {
  const selectedClip = clips.find((clip) => clip.id === selectedClipId);
  const selectedSource = files.find((file) => file.id === selectedClip?.sourceFileId);
  const selectedTrack = tracks.find((track) => track.id === selectedClip?.trackId);

  return (
    <aside className="oa-left-dock">
      <MediaBrowser
        activeTab={activeTab}
        files={files}
        onOpenFile={onOpenFile}
        onSelectFile={onSelectFile}
        onTabChange={onTabChange}
        selectedFileId={selectedFileId}
      />
      <ResizableHandle
        axis="Y"
        label="Resize file browser and inspector"
        onResize={(delta) => onResizeInspector(-delta)}
      />
      <Inspector clip={selectedClip} sourceFile={selectedSource} track={selectedTrack} />
    </aside>
  );
}
