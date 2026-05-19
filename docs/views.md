# View Organization

Open Audition is organized as a small set of page-level views with supporting panels and dialogs. The app should feel like a focused desktop editing workspace, not a website with many routes.

## Page-Level Views

### Home Page

Entry point when the app launches.

Primary responsibilities:

- Show recent project folders.
- Create a new project.
- Open an existing project.
- Show missing-file states for recent projects whose paths no longer exist.

Recent project items should include:

- Project name.
- Project folder path.
- Last opened time.
- Optional project metadata later, such as sample rate or duration.

Recent project items should not be sessions, waveforms, or imported media files. Sessions
and waveforms belong inside an opened project.

The Home Page should not remain as a permanent editor sidebar destination. Once a project is open, recent projects belong under app-level actions such as `File > Open Recent`.

### Multitrack Editor Page

Primary editing workspace and the most important page in the app.

Primary responsibilities:

- Display the multitrack timeline.
- Manage tracks, clips, waveform lanes, clip movement, trimming, fades, and crossfades.
- Provide transport controls.
- Support timeline zoom, snapping, selection, and editing tools.
- Expose clip gain and clip keyframes.
- Host editor panels such as Media Browser, Inspector, Effects, and Track Controls.

This page should prioritize reliable theatrical sound editing workflows over music-production DAW patterns.

### Waveform Editor Page

Single-file precision editing workspace.

Primary responsibilities:

- Display a detailed waveform for one audio file.
- Support range selection and precise trim/edit operations.
- Apply file-level operations such as gain, normalize, fade in, fade out, repair, and noise reduction.
- Show file-level metadata and operation settings through an inspector or contextual panel.

The Waveform Editor can be opened from the Media Browser or from a selected clip when deeper file editing is needed.

### Settings Page

Application and project preference workspace.

Primary responsibilities:

- Audio device settings.
- Editing defaults.
- Theme settings.
- Keyboard shortcuts.

## Editor Panels

These are not standalone pages. They are docked or contextual areas inside editor pages.
Default editor panels should be resizable with desktop-style splitters so users can adjust the File Browser, Inspector, timeline, track headers, and transport area without leaving the editor.

### Media Browser

Shows imported audio files and project assets. Users should be able to preview audio and drag files into the multitrack timeline.

Initial tabs:

- Files.
- History.

Do not add a Recent tab here. Recent projects live on the launch page and app-level open actions.

### Inspector

The inspector is docked below the Media Browser in the default editor layout. Its first implementation should show only the selected clip.

Later it can expand to show properties for the selected track, file, or range.

Typical fields:

- Start time.
- End time.
- Duration.
- Gain.
- Fade settings.
- Effect settings.
- Keyframes.
- File metadata.

### Effects Panel

Initially this can live inside the Inspector. If effect chains become complex, it can become a dedicated docked panel.

Supported effect areas:

- Gain.
- EQ.
- Filter.
- Reverb.
- Delay.
- Pitch shift.
- Time stretching.
- Noise reduction.
- Normalization.

### Track Controls

Track controls should stay focused on editing and playback, not full music-production mixing.

Initial controls:

- Track name.
- Volume.
- Mute.
- Solo.
- Basic pan if needed.
- Track-level effects later.

## Dialogs

Dialogs should be used for bounded tasks that do not need a full page.

Initial dialogs:

- New Project.
- Open Project.
- Export.
- Project Settings.
- Effect Settings when a small focused editor is enough.

Export should remain a dialog in early versions. Promote it to a page only if export becomes complex enough to need batch export, multiple formats, stems, XML export options, or a render queue.

## Explicit Non-Goals

- No Cue View.
- No marker/cue-management page.
- No music-production DAW-style mixer as a primary page.
- No separate pages for Media Browser, Inspector, Effects, or Track Controls.

## Navigation Model

High-level flow:

```text
Launch
  -> Home Page
      -> New Project
      -> Open Existing Project
      -> Open Recent Project
          -> Multitrack Editor Page
              -> Waveform Editor Page when precision file editing is needed
```

Main navigation should remain minimal:

- Home, only when no project is open or when explicitly returning to project selection.
- Multitrack Editor.
- Waveform Editor.
- Settings.
