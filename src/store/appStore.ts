import { create } from "zustand";
import { recentProjects } from "../data/mockData";

export type AppView = "Home" | "Multitrack" | "Waveform" | "Settings";
type EditorView = "Multitrack" | "Waveform";

interface AppStore {
  activeView: AppView;
  previousEditorView: EditorView;
  selectedProjectId: string;
  navigate: (view: AppView) => void;
  openProject: (projectId: string) => void;
  openSettings: () => void;
  restoreEditor: () => void;
  selectProject: (projectId: string) => void;
}

export const appInitialState = {
  activeView: viewFromHash(),
  previousEditorView: "Multitrack" as EditorView,
  selectedProjectId: recentProjects[0].id,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...appInitialState,
  navigate: (view) => {
    window.location.hash = view === "Home" ? "" : view.toLowerCase();
    set({ activeView: view });
  },
  openProject: (projectId) => {
    window.location.hash = "multitrack";
    set({
      selectedProjectId: projectId,
      activeView: "Multitrack",
      previousEditorView: "Multitrack",
    });
  },
  openSettings: () => {
    const activeView = get().activeView;

    window.location.hash = "settings";
    set({
      activeView: "Settings",
      previousEditorView: activeView === "Waveform" ? "Waveform" : "Multitrack",
    });
  },
  restoreEditor: () => get().navigate(get().previousEditorView),
  selectProject: (projectId) => set({ selectedProjectId: projectId }),
}));

function viewFromHash(): AppView {
  const hash = window.location.hash.replace("#", "").toLowerCase();

  if (hash === "multitrack" || hash === "waveform" || hash === "settings") {
    return (hash.charAt(0).toUpperCase() + hash.slice(1)) as AppView;
  }

  return "Home";
}
