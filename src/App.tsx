import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { clips as mockClips, mediaFiles, recentProjects, tracks as mockTracks } from "./data/mockData";
import { RealtimeTransportEngine } from "./libs/audio/engine";
import { EditorPage } from "./pages/EditorPage";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import type { MediaTab } from "./types/audio";
import type { SettingsSection } from "./types/settings";

type AppView = "Home" | "Multitrack" | "Waveform" | "Settings";

function viewFromHash(): AppView {
  const hash = window.location.hash.replace("#", "").toLowerCase();

  if (hash === "multitrack" || hash === "waveform" || hash === "settings") {
    return (hash.charAt(0).toUpperCase() + hash.slice(1)) as AppView;
  }

  return "Home";
}

function App() {
  const [activeView, setActiveView] = useState<AppView>(viewFromHash);
  const [previousEditorView, setPreviousEditorView] = useState<AppView>("Multitrack");
  const [selectedProjectId, setSelectedProjectId] = useState(recentProjects[0].id);
  const [activeMediaTab, setActiveMediaTab] = useState<MediaTab>("Files");
  const [clips, setClips] = useState(mockClips);
  const [selectedFileId, setSelectedFileId] = useState("session");
  const [tracks, setTracks] = useState(mockTracks);
  const [selectedTrackId, setSelectedTrackId] = useState("track-3");
  const [selectedClipId, setSelectedClipId] = useState("clip-mola");
  const [selectedSettingsSection, setSelectedSettingsSection] =
    useState<SettingsSection>("Device");
  const audioEngine = useMemo(() => new RealtimeTransportEngine(), []);

  const selectedProject = useMemo(
    () => recentProjects.find((project) => project.id === selectedProjectId) ?? recentProjects[0],
    [selectedProjectId],
  );

  useEffect(
    () => () => {
      void audioEngine.dispose().then((result) => {
        if (result.isErr()) {
          console.error(result.error.message);
        }
      });
    },
    [audioEngine],
  );

  function navigate(view: AppView) {
    window.location.hash = view === "Home" ? "" : view.toLowerCase();
    setActiveView(view);
  }

  function openProject(projectId: string) {
    setSelectedProjectId(projectId);
    navigate("Multitrack");
    setPreviousEditorView("Multitrack");
  }

  function openSettings() {
    setPreviousEditorView(activeView === "Waveform" ? "Waveform" : "Multitrack");
    navigate("Settings");
  }

  function openFile(fileId: string) {
    const file = mediaFiles.find((candidate) => candidate.id === fileId);

    setSelectedFileId(fileId);

    if (file?.mediaType === "Multitrack") {
      navigate("Multitrack");
      setPreviousEditorView("Multitrack");
      return;
    }

    navigate("Waveform");
    setPreviousEditorView("Waveform");
  }

  function openClip(clipId: string) {
    const clip = clips.find((candidate) => candidate.id === clipId);
    setSelectedClipId(clipId);
    if (clip) {
      setSelectedFileId(clip.sourceFileId);
    }
    navigate("Waveform");
    setPreviousEditorView("Waveform");
  }

  function updateTrackGain(trackId: string, gainDb: number) {
    setTracks((currentTracks) =>
      currentTracks.map((track) => (track.id === trackId ? { ...track, gainDb } : track)),
    );
  }

  function updateTrackPan(trackId: string, pan: number) {
    setTracks((currentTracks) =>
      currentTracks.map((track) => (track.id === trackId ? { ...track, pan } : track)),
    );
  }

  function updateClipTiming(clipId: string, startPercent: number, widthPercent: number) {
    setClips((currentClips) =>
      currentClips.map((clip) =>
        clip.id === clipId
          ? {
              ...clip,
              startPercent,
              widthPercent,
            }
          : clip,
      ),
    );
  }

  if (activeView === "Home") {
    return (
      <HomePage
        onOpenProject={openProject}
        onOpenSettings={openSettings}
        onSelectProject={setSelectedProjectId}
        projects={recentProjects}
        selectedProjectId={selectedProjectId}
      />
    );
  }

  if (activeView === "Settings") {
    return (
      <SettingsPage
        onBackToEditor={() => navigate(previousEditorView)}
        onSelectSection={setSelectedSettingsSection}
        selectedSection={selectedSettingsSection}
      />
    );
  }

  if (activeView === "Waveform" || activeView === "Multitrack") {
    return (
      <EditorPage
        activeMediaTab={activeMediaTab}
        audioEngine={audioEngine}
        clips={clips}
        editorView={activeView}
        files={mediaFiles}
        onChangeClipTiming={updateClipTiming}
        onChangeTrackGain={updateTrackGain}
        onChangeTrackPan={updateTrackPan}
        onGoHome={() => navigate("Home")}
        onOpenClip={openClip}
        onOpenFile={openFile}
        onOpenSettings={openSettings}
        onSelectClip={setSelectedClipId}
        onSelectFile={setSelectedFileId}
        onSelectTrack={setSelectedTrackId}
        onTabChange={setActiveMediaTab}
        project={selectedProject}
        selectedClipId={selectedClipId}
        selectedFileId={selectedFileId}
        selectedTrackId={selectedTrackId}
        tracks={tracks}
      />
    );
  }

  return null;
}

export default App;
