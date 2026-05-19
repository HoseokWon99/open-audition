import { useMemo, useState } from "react";
import "./App.css";
import { clips as mockClips, mediaFiles, recentProjects, tracks as mockTracks } from "./data/mockData";
import { EditorPage } from "./pages/EditorPage";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import type { AppView, MediaTab, SettingsSection } from "./types";

function viewFromHash(): AppView {
  const hash = window.location.hash.replace("#", "");

  if (hash === "multitrack" || hash === "waveform" || hash === "settings") {
    return hash;
  }

  return "home";
}

function App() {
  const [activeView, setActiveView] = useState<AppView>(viewFromHash);
  const [previousEditorView, setPreviousEditorView] = useState<AppView>("multitrack");
  const [selectedProjectId, setSelectedProjectId] = useState(recentProjects[0].id);
  const [activeMediaTab, setActiveMediaTab] = useState<MediaTab>("files");
  const [clips, setClips] = useState(mockClips);
  const [selectedFileId, setSelectedFileId] = useState("session");
  const [tracks, setTracks] = useState(mockTracks);
  const [selectedTrackId, setSelectedTrackId] = useState("track-3");
  const [selectedClipId, setSelectedClipId] = useState("clip-mola");
  const [selectedSettingsSection, setSelectedSettingsSection] =
    useState<SettingsSection>("device");

  const selectedProject = useMemo(
    () => recentProjects.find((project) => project.id === selectedProjectId) ?? recentProjects[0],
    [selectedProjectId],
  );

  function navigate(view: AppView) {
    window.location.hash = view === "home" ? "" : view;
    setActiveView(view);
  }

  function openProject(projectId: string) {
    setSelectedProjectId(projectId);
    navigate("multitrack");
    setPreviousEditorView("multitrack");
  }

  function openSettings() {
    setPreviousEditorView(activeView === "waveform" ? "waveform" : "multitrack");
    navigate("settings");
  }

  function openFile(fileId: string) {
    const file = mediaFiles.find((candidate) => candidate.id === fileId);

    setSelectedFileId(fileId);

    if (file?.mediaType === "Multitrack") {
      navigate("multitrack");
      setPreviousEditorView("multitrack");
      return;
    }

    navigate("waveform");
    setPreviousEditorView("waveform");
  }

  function openClip(clipId: string) {
    const clip = clips.find((candidate) => candidate.id === clipId);
    setSelectedClipId(clipId);
    if (clip) {
      setSelectedFileId(clip.sourceFileId);
    }
    navigate("waveform");
    setPreviousEditorView("waveform");
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

  if (activeView === "home") {
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

  if (activeView === "settings") {
    return (
      <SettingsPage
        onBackToEditor={() => navigate(previousEditorView)}
        onSelectSection={setSelectedSettingsSection}
        selectedSection={selectedSettingsSection}
      />
    );
  }

  if (activeView === "waveform" || activeView === "multitrack") {
    return (
      <EditorPage
        activeMediaTab={activeMediaTab}
        clips={clips}
        editorView={activeView}
        files={mediaFiles}
        onChangeClipTiming={updateClipTiming}
        onChangeTrackGain={updateTrackGain}
        onChangeTrackPan={updateTrackPan}
        onGoHome={() => navigate("home")}
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
