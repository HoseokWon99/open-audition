import type { MediaFile, MediaTab } from "../../types";
import { historyEntries } from "../../data/mockData";

interface MediaBrowserProps {
  activeTab: MediaTab;
  files: MediaFile[];
  selectedFileId: string;
  onOpenFile: (fileId: string) => void;
  onSelectFile: (fileId: string) => void;
  onTabChange: (tab: MediaTab) => void;
}

export function MediaBrowser({
  activeTab,
  files,
  selectedFileId,
  onOpenFile,
  onSelectFile,
  onTabChange,
}: MediaBrowserProps) {
  return (
    <section className="oa-file-panel">
      <div className="oa-panel-tabs" role="tablist">
        <button
          className={activeTab === "Files" ? "is-active" : ""}
          onClick={() => onTabChange("Files")}
          type="button"
        >
          Files
        </button>
        <button
          className={activeTab === "History" ? "is-active" : ""}
          onClick={() => onTabChange("History")}
          type="button"
        >
          History
        </button>
      </div>
      <div className="oa-file-actions">
        <div className="oa-file-search">Filter media</div>
        <button className="oa-import" type="button">
          +
        </button>
      </div>
      {activeTab === "Files" ? (
        <div className="oa-file-list">
          <div className="oa-file-table">
            <div className="oa-file-header">
              <span>Name</span>
              <span>Duration</span>
              <span>Sample Rate</span>
              <span>Channels</span>
              <span>Media Type</span>
            </div>
            {files.map((file) => (
              <button
                className={`oa-file-row ${file.id === selectedFileId ? "is-active" : ""}`}
                key={file.id}
                onClick={() => {
                  onSelectFile(file.id);
                  onOpenFile(file.id);
                }}
                type="button"
              >
                <span>
                  <span className="oa-file-icon">{file.mediaType === "Audio" ? "⌁" : "▤"}</span>
                  {file.name}
                </span>
                <span>{file.duration}</span>
                <span>{file.sampleRate}</span>
                <span>{file.channels}</span>
                <span>{file.mediaType}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="oa-history-list">
          {historyEntries.map((entry) => (
            <div className="oa-history-row" key={entry}>
              {entry}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
