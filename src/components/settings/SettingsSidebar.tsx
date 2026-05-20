import type { SettingsSection } from "../../types/settings";

interface SettingsSidebarProps {
  selectedSection: SettingsSection;
  onSelectSection: (section: SettingsSection) => void;
}

export function SettingsSidebar({ selectedSection, onSelectSection }: SettingsSidebarProps) {
  return (
    <aside className="oa-settings-sidebar">
      <div className="oa-sidebar-title">Preferences</div>
      <button
        className={`oa-category ${selectedSection === "Device" ? "is-active" : ""}`}
        onClick={() => onSelectSection("Device")}
        type="button"
      >
        <span className="mark">●</span>
        <span>Device</span>
      </button>
      <button
        className={`oa-category ${selectedSection === "Editing" ? "is-active" : ""}`}
        onClick={() => onSelectSection("Editing")}
        type="button"
      >
        <span />
        <span>Editing</span>
      </button>
      <button
        className={`oa-subcategory ${selectedSection === "Multitrack" ? "is-active" : ""}`}
        onClick={() => onSelectSection("Multitrack")}
        type="button"
      >
        <span>Multitrack</span>
      </button>
      <button
        className={`oa-subcategory ${selectedSection === "Waveform" ? "is-active" : ""}`}
        onClick={() => onSelectSection("Waveform")}
        type="button"
      >
        <span>Waveform</span>
      </button>
      <button
        className={`oa-category ${selectedSection === "Appearance" ? "is-active" : ""}`}
        onClick={() => onSelectSection("Appearance")}
        type="button"
      >
        <span />
        <span>Appearance</span>
      </button>
      <button
        className={`oa-category ${selectedSection === "Shortcuts" ? "is-active" : ""}`}
        onClick={() => onSelectSection("Shortcuts")}
        type="button"
      >
        <span />
        <span>Keyboard Shortcuts</span>
      </button>
    </aside>
  );
}
