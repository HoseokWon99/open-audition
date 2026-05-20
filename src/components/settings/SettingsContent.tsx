import { shortcuts } from "../../data/mockData";
import type { SettingsSection } from "../../types/settings";

interface SettingsContentProps {
  selectedSection: SettingsSection;
}

export function SettingsContent({ selectedSection }: SettingsContentProps) {
  if (selectedSection === "Shortcuts") {
    return (
      <div className="oa-settings-section">
        <div className="oa-settings-section-title">Keyboard Shortcuts</div>
        {shortcuts.map((shortcut) => (
          <div className="oa-settings-row" key={shortcut.command}>
            <span className="oa-label">{shortcut.command}</span>
            <span className="oa-control">{shortcut.keys}</span>
            <span className="oa-help">Editable later</span>
          </div>
        ))}
      </div>
    );
  }

  if (selectedSection === "Multitrack") {
    return (
      <div className="oa-settings-section">
        <div className="oa-settings-section-title">Multitrack</div>
        <div className="oa-settings-row">
          <span className="oa-label">Default Track Height</span>
          <span className="oa-control">Compact</span>
          <span className="oa-help">Editor default</span>
        </div>
        <div className="oa-settings-row">
          <span className="oa-label">Clip Edge Snapping</span>
          <span className="oa-check">■ Enabled</span>
          <span className="oa-help">Timeline editing</span>
        </div>
      </div>
    );
  }

  if (selectedSection === "Waveform") {
    return (
      <div className="oa-settings-section">
        <div className="oa-settings-section-title">Waveform</div>
        <div className="oa-settings-row">
          <span className="oa-label">Default View</span>
          <span className="oa-control">Waveform</span>
          <span className="oa-help">File editor</span>
        </div>
        <div className="oa-settings-row">
          <span className="oa-label">Show dB Scale</span>
          <span className="oa-check">■ Enabled</span>
          <span className="oa-help">Precision edits</span>
        </div>
      </div>
    );
  }

  if (selectedSection === "Appearance") {
    return (
      <div className="oa-settings-section">
        <div className="oa-settings-section-title">Appearance</div>
        <div className="oa-settings-row">
          <span className="oa-label">Theme</span>
          <span className="oa-control">Audition Dark</span>
          <span className="oa-help">Application</span>
        </div>
      </div>
    );
  }

  if (selectedSection === "Editing") {
    return (
      <div className="oa-settings-section">
        <div className="oa-settings-section-title">Editing</div>
        <div className="oa-settings-row">
          <span className="oa-label">Time Display</span>
          <span className="oa-control">hms</span>
          <span className="oa-help">Default ruler</span>
        </div>
      </div>
    );
  }

  return (
    <div className="oa-settings-section">
      <div className="oa-settings-section-title">Device</div>
      <div className="oa-settings-row">
        <span className="oa-label">Output Device</span>
        <span className="oa-control">Built-in Output ˅</span>
        <span className="oa-help">System default</span>
      </div>
      <div className="oa-settings-row">
        <span className="oa-label">Input Device</span>
        <span className="oa-control">Built-in Microphone ˅</span>
        <span className="oa-help">2 channels</span>
      </div>
      <div className="oa-settings-row">
        <span className="oa-label">Sample Rate</span>
        <span className="oa-control small">48000 Hz ˅</span>
        <span className="oa-help">Device setting</span>
      </div>
      <div className="oa-settings-row">
        <span className="oa-label">Buffer Size</span>
        <span className="oa-control small">256 samples ˅</span>
        <span className="oa-help">~5.3 ms</span>
      </div>
    </div>
  );
}
