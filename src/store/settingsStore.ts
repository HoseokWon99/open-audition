import { create } from "zustand";
import type { SettingsSection } from "../types/settings";

interface SettingsStore {
  selectedSection: SettingsSection;
  selectSection: (section: SettingsSection) => void;
}

export const settingsInitialState = {
  selectedSection: "Device" as SettingsSection,
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...settingsInitialState,
  selectSection: (section) => set({ selectedSection: section }),
}));
