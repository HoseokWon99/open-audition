# Open Audition Design Preferences

Open Audition should feel like a focused desktop audio editor for theatre sound work. The interface should be dense, precise, and utilitarian, closer to a native production tool than a website or music-production DAW.

## Overall Style

- Prefer dark editor surfaces with restrained contrast.
- Use compact controls, small type, and tight spacing where users repeatedly scan/edit.
- Keep panels and menus visually quiet; avoid oversized cards, marketing-style sections, and decorative gradients.
- Use color to communicate editing state, selection, focus, playback, and waveform data.
- Prioritize reliable theatre editing workflows over music-production decoration.

## Color And Surfaces

- Base workspace surfaces should stay near black/dark grey.
- Editor panels should use subtle borders and separators.
- Active accents may use cyan/blue for selected commands and teal/green for waveform/audio content.
- Selection in the waveform editor should be a bright, high-contrast light band over the dark waveform grid.
- The red vertical playhead should remain a single thin guide line.

## Context Menus

Context menus should use the accepted Open Audition menu style:

- Slim translucent light surface.
- Rounded corners around `14px`.
- Compact row height around `26px`.
- Menu item text around `13px`.
- Dark readable text on the light menu surface.
- Muted shortcut/chevron column on the right.
- Blue active/hover row for the currently targeted command.
- Submenus float to the right of the parent menu.
- Submenus open when the cursor is placed over the parent row, not by click.
- Keep horizontal width slim; avoid wide menu panels unless labels require it.

Waveform selected-area context menu command order:

1. Copy
2. CopyToNew
3. Cut
4. Delete
5. Paste
6. Effects submenu
7. Insert into multitrack submenu

Effects submenu should include:

- Gain
- EQ
- Filter
- Reverb
- Delay
- Pitch Shift
- Time Stretch
- Noise Reduction
- Normalize

Insert into multitrack submenu should include imported multitrack sessions and a `Create New` command.

## Waveform Editor

- Dragging across the waveform selects a time range.
- The selected range should appear in both the overview strip and main waveform grid.
- The selected main range should look like a bright editing selection, with grid lines still visible.
- Right-clicking inside the selected range opens the selected-area context menu.
- The floating gain control should stay centered over the selected range.

## Interaction

- Prefer desktop editing interactions: drag selection, right-click menus, hover submenus, resizable panels.
- Menus should close on outside click or Escape.
- Click-sized waveform drags may move the playhead instead of creating a range.
- Context menus are UI affordances first; command implementations can be wired later to audio/project logic.
