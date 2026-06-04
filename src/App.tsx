import { useEffect, useMemo } from "react";
import "./App.css";
import { recentProjects } from "./data/mockData";
import { RealtimeTransportEngine } from "./libs/audio/engine";
import { EditorPage } from "./pages/EditorPage";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import { useAppStore } from "./store/appStore";
import { useSettingsStore } from "./store/settingsStore";

function App() {
  const activeView = useAppStore((state) => state.activeView);
  const openProject = useAppStore((state) => state.openProject);
  const openSettings = useAppStore((state) => state.openSettings);
  const restoreEditor = useAppStore((state) => state.restoreEditor);
  const selectProject = useAppStore((state) => state.selectProject);
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  const selectedSettingsSection = useSettingsStore((state) => state.selectedSection);
  const selectSettingsSection = useSettingsStore((state) => state.selectSection);
  const audioEngine = useMemo(() => new RealtimeTransportEngine(), []);

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

  if (activeView === "Home") {
    return (
      <HomePage
        onOpenProject={openProject}
        onOpenSettings={openSettings}
        onSelectProject={selectProject}
        projects={recentProjects}
        selectedProjectId={selectedProjectId}
      />
    );
  }

  if (activeView === "Settings") {
    return (
      <SettingsPage
        onBackToEditor={restoreEditor}
        onSelectSection={selectSettingsSection}
        selectedSection={selectedSettingsSection}
      />
    );
  }

  if (activeView === "Waveform" || activeView === "Multitrack") {
    return <EditorPage audioEngine={audioEngine} editorView={activeView} />;
  }

  return null;
}

export default App;
