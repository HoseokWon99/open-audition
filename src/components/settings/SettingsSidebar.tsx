import type { SettingsSection } from "../../types";

interface SettingsSidebarProps {
  selectedSection: SettingsSection;
  onSelectSection: (section: SettingsSection) => void;
}

export function SettingsSidebar({ selectedSection, onSelectSection }: SettingsSidebarProps) {
  return (
    <aside className="oa-settings-sidebar">
      <div className="oa-sidebar-title">Preferences</div>
      <button
        className={`oa-category ${selectedSection === "device" ? "is-active" : ""}`}
        onClick={() => onSelectSection("device")}
        type="button"
      >
        <span className="mark">●</span>
        <span>Device</span>
      </button>
      <button
        className={`oa-category ${selectedSection === "editing" ? "is-active" : ""}`}
        onClick={() => onSelectSection("editing")}
        type="button"
      >
        <span />
        <span>Editing</span>
      </button>
      <button
        className={`oa-subcategory ${selectedSection === "multitrack" ? "is-active" : ""}`}
        onClick={() => onSelectSection("multitrack")}
        type="button"
      >
        <span>Multitrack</span>
      </button>
      <button
        className={`oa-subcategory ${selectedSection === "waveform" ? "is-active" : ""}`}
        onClick={() => onSelectSection("waveform")}
        type="button"
      >
        <span>Waveform</span>
      </button>
      <button
        className={`oa-category ${selectedSection === "appearance" ? "is-active" : ""}`}
        onClick={() => onSelectSection("appearance")}
        type="button"
      >
        <span />
        <span>Appearance</span>
      </button>
      <button
        className={`oa-category ${selectedSection === "shortcuts" ? "is-active" : ""}`}
        onClick={() => onSelectSection("shortcuts")}
        type="button"
      >
        <span />
        <span>Keyboard Shortcuts</span>
      </button>
    </aside>
  );
}
