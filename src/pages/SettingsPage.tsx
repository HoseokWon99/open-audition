import { SettingsContent } from "../components/settings/SettingsContent";
import { SettingsSidebar } from "../components/settings/SettingsSidebar";
import type { SettingsSection } from "../types/settings";

interface SettingsPageProps {
  selectedSection: SettingsSection;
  onBackToEditor: () => void;
  onSelectSection: (section: SettingsSection) => void;
}

export function SettingsPage({
  selectedSection,
  onBackToEditor,
  onSelectSection,
}: SettingsPageProps) {
  return (
    <main className="oa-settings">
      <div className="oa-titlebar">
        <div className="oa-title">Open Audition</div>
        <div className="oa-subtitle">Settings</div>
      </div>
      <div className="oa-settings-body">
        <SettingsSidebar onSelectSection={onSelectSection} selectedSection={selectedSection} />
        <section className="oa-settings-panel">
          <div className="oa-settings-content">
            <SettingsContent selectedSection={selectedSection} />
          </div>
          <div className="oa-settings-footer">
            <button type="button">Reset</button>
            <button type="button" onClick={onBackToEditor}>
              Cancel
            </button>
            <button type="button">Apply</button>
            <button className="is-primary" type="button" onClick={onBackToEditor}>
              OK
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
