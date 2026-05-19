interface TopBarProps {
  title: string;
  onGoHome: () => void;
  onOpenSettings: () => void;
}

export function TopBar({ title, onGoHome, onOpenSettings }: TopBarProps) {
  return (
    <div className="oa-topbar">
      <button className="oa-app-title" onClick={onGoHome} type="button">
        {title}
      </button>
      <div className="oa-top-actions">
        <button type="button">Import</button>
        <button type="button">Save</button>
        <button type="button">Export</button>
        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
      </div>
    </div>
  );
}
