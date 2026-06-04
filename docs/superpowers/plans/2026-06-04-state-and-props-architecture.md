# State And Props Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define and implement a clear state ownership model for Open Audition so Zustand owns shared editor/session workflow state, while props remain focused component contracts.

**Architecture:** Split frontend state into document state, editor UI state, transport runtime state, settings state, and local component-only state. Store document and shared workflow state in Zustand slices with narrow selectors; keep heavy audio data, XML parsing, waveform rendering, and media analysis in Tauri/Rust APIs or audio engine objects. Components should receive props only for presentational data, local callbacks, injected runtime objects, and leaf-specific render contracts.

**Tech Stack:** React 19, TypeScript, Zustand 5, Tauri commands, neverthrow, Vitest.

---

## State Ownership Rules

### Zustand State

Use Zustand for state that is shared, long-lived, or part of the editor workflow:

- Current app route/view: `Home`, `Multitrack`, `Waveform`, `Settings`.
- Current project/session identity: selected project id, loaded session path, dirty flag.
- Multitrack document data currently edited in React: tracks, clips, selected media file id.
- Editor selection: selected track id, selected clip ids, selected file id.
- Editor viewport: active media tab, timeline zoom/window, track heights, track header width, dock/transport/inspector sizes.
- Transport UI state: playhead seconds, transport state, active transport scope.
- Settings selection: selected settings section.
- Undoable editing operations once undo/redo is introduced.

### Props

Use props for leaf component contracts and dependency injection:

- Display-only values needed by a pure component.
- Event callbacks from a container to a leaf component.
- Runtime instances that should not live in serializable Zustand state, such as `AudioTransportEngine` and `WaveSurferController`.
- Component-local measurements and refs.

### Local React State

Use `useState` inside a component for state that is private to that component and has no document meaning:

- Context menu position.
- Drag gesture temporary values.
- Open/closed state for a menu or popover.
- A transient controller object owned by a component.
- Hover/focus affordances.

### Not Frontend State

Do not store these in Zustand:

- `AudioBuffer`, `Float32Array`, peak arrays, rendered audio bytes.
- Parsed raw XML trees.
- Long-lived media cache internals.
- Expensive waveform analysis results.
- Tauri command implementation state.

Store ids, paths, durations, metadata, cache keys, and command status instead.

---

## File Structure

- Create: `src/store/appStore.ts`
  - Owns active view, previous editor view, selected project id, and navigation actions.
- Create: `src/store/sessionStore.ts`
  - Owns session/project data that is currently mocked in `App.tsx`: tracks, clips, files, dirty flag, and editing actions.
- Create: `src/store/editorStore.ts`
  - Owns editor-only workflow state: selected ids, media tab, timeline viewport, panel sizes, track heights.
- Create: `src/store/transportStore.ts`
  - Owns transport UI state: playhead seconds, transport state, waveform playhead, waveform duration.
- Create: `src/store/settingsStore.ts`
  - Owns selected settings section.
- Create: `src/store/selectors.ts`
  - Exposes stable selectors and derived selectors used by pages/components.
- Create: `src/store/storeTestUtils.ts`
  - Provides reset helpers for Vitest without leaking state across tests.
- Modify: `src/App.tsx`
  - Replace lifted app/editor state with Zustand selectors and actions.
- Modify: `src/pages/EditorPage.tsx`
  - Convert from broad prop drilling to store-backed container behavior.
- Modify: `src/components/editor/MultitrackTimeline.tsx`
  - Keep drag/context-menu temporary state local; move clip level keyframes into document state when they represent clip automation.
- Modify: `src/types/audio.ts`
  - Keep current UI-facing timeline types until they are replaced by `.oasx` session DTOs.
- Test: `src/store/sessionStore.test.ts`
- Test: `src/store/editorStore.test.ts`
- Test: `src/store/transportStore.test.ts`

---

## Target Store Shapes

```ts
// src/store/appStore.ts
export type AppView = "Home" | "Multitrack" | "Waveform" | "Settings";

interface AppStore {
  activeView: AppView;
  previousEditorView: "Multitrack" | "Waveform";
  selectedProjectId: string;
  navigate: (view: AppView) => void;
  openProject: (projectId: string) => void;
  openSettings: () => void;
  restoreEditor: () => void;
}
```

```ts
// src/store/sessionStore.ts
interface SessionStore {
  clips: TimelineClip[];
  files: MediaFile[];
  tracks: TimelineTrack[];
  dirty: boolean;
  changeClipTiming: (clipId: string, startPercent: number, widthPercent: number) => void;
  changeTrackGain: (trackId: string, gainDb: number) => void;
  changeTrackPan: (trackId: string, pan: number) => void;
  loadMockSession: () => void;
}
```

```ts
// src/store/editorStore.ts
interface EditorStore {
  activeMediaTab: MediaTab;
  selectedClipId: string | null;
  selectedFileId: string | null;
  selectedTrackId: string | null;
  leftDockWidth: number;
  inspectorHeight: number;
  trackHeadWidth: number;
  trackHeights: Record<string, number>;
  transportHeight: number;
  visibleStartPercent: number;
  visibleWidthPercent: number;
  selectClip: (clipId: string) => void;
  selectFile: (fileId: string) => void;
  selectTrack: (trackId: string) => void;
  setMediaTab: (tab: MediaTab) => void;
  resizeLeftDock: (delta: number) => void;
  resizeInspector: (delta: number) => void;
  resizeTrackHead: (delta: number) => void;
  resizeTrackPair: (trackId: string, nextTrackId: string, delta: number) => void;
  resizeTransport: (delta: number) => void;
  setVisibleWindow: (startPercent: number, widthPercent: number) => void;
}
```

```ts
// src/store/transportStore.ts
interface TransportStore {
  timelineDurationSeconds: number;
  timelinePlayheadSeconds: number;
  waveformDurationSeconds: number;
  waveformPlayheadSeconds: number;
  transportState: TransportState;
  setTimelinePlayhead: (seconds: number) => void;
  setWaveformDuration: (seconds: number) => void;
  setWaveformPlayhead: (seconds: number) => void;
  setTransportState: (state: TransportState) => void;
  stopTimeline: () => void;
  stopWaveform: () => void;
}
```

```ts
// src/store/settingsStore.ts
interface SettingsStore {
  selectedSection: SettingsSection;
  selectSection: (section: SettingsSection) => void;
}
```

---

## Component Prop Policy

### `App.tsx`

`App` should select only:

- `activeView`
- navigation actions

It should not hold tracks, clips, selections, media tab, settings section, or editor panel sizes in `useState`.

### `EditorPage.tsx`

`EditorPage` should act as the editor container. It may use multiple stores directly and pass focused props down to editor leaf components.

Keep as props:

- `audioEngine`
- `editorView`
- top-level navigation callbacks if they come from `App`

Move to stores:

- `activeMediaTab`
- `clips`
- `files`
- `tracks`
- all selected ids
- panel sizes
- timeline viewport
- track heights
- transport/playhead state

### `MultitrackTimeline.tsx`

Keep as props:

- `clips`
- `tracks`
- `durationSeconds`
- `playheadPercent`
- `timelineWidthPercent`
- `selectedClipId`
- `selectedTrackId`
- `getClipFile`
- edit callbacks

Keep local:

- refs
- pointer drag handlers
- context menu position
- temporary scroll measurements

Move to session/document state later:

- clip level keyframes, because they are automation data and must eventually serialize into `.oasx`.

### Leaf Components

`TopBar`, `TransportBar`, `TrackHeader`, `MediaBrowser`, `Inspector`, `TimelineRuler`, and `ZoomControls` should remain mostly prop-driven. They should not import stores unless prop drilling becomes more than one container deep.

---

## Tasks

### Task 1: Add Store Test Helpers

**Files:**
- Create: `src/store/storeTestUtils.ts`

- [ ] **Step 1: Create reset helper**

```ts
import type { StoreApi, UseBoundStore } from "zustand";

export function resetStore<TState>(
  store: UseBoundStore<StoreApi<TState>>,
  initialState: TState,
) {
  store.setState(initialState, true);
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm build`

Expected: PASS.

---

### Task 2: Add Session Store

**Files:**
- Create: `src/store/sessionStore.ts`
- Test: `src/store/sessionStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { clips as mockClips, mediaFiles, tracks as mockTracks } from "../data/mockData";
import { useSessionStore, sessionInitialState } from "./sessionStore";
import { resetStore } from "./storeTestUtils";

describe("sessionStore", () => {
  beforeEach(() => resetStore(useSessionStore, sessionInitialState));

  it("loads the mock session", () => {
    useSessionStore.getState().loadMockSession();

    expect(useSessionStore.getState().clips).toEqual(mockClips);
    expect(useSessionStore.getState().files).toEqual(mediaFiles);
    expect(useSessionStore.getState().tracks).toEqual(mockTracks);
    expect(useSessionStore.getState().dirty).toBe(false);
  });

  it("updates clip timing and marks the session dirty", () => {
    useSessionStore.getState().changeClipTiming("clip-mola", 10, 20);

    const clip = useSessionStore.getState().clips.find((candidate) => candidate.id === "clip-mola");

    expect(clip?.startPercent).toBe(10);
    expect(clip?.widthPercent).toBe(20);
    expect(useSessionStore.getState().dirty).toBe(true);
  });

  it("updates track gain and pan", () => {
    useSessionStore.getState().changeTrackGain("track-3", -6);
    useSessionStore.getState().changeTrackPan("track-3", 0.25);

    const track = useSessionStore.getState().tracks.find((candidate) => candidate.id === "track-3");

    expect(track?.gainDb).toBe(-6);
    expect(track?.pan).toBe(0.25);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/store/sessionStore.test.ts`

Expected: FAIL because `sessionStore.ts` does not exist yet.

- [ ] **Step 3: Implement session store**

```ts
import { create } from "zustand";
import { clips as mockClips, mediaFiles, tracks as mockTracks } from "../data/mockData";
import type { MediaFile, TimelineClip, TimelineTrack } from "../types/audio";

interface SessionStore {
  clips: TimelineClip[];
  files: MediaFile[];
  tracks: TimelineTrack[];
  dirty: boolean;
  changeClipTiming: (clipId: string, startPercent: number, widthPercent: number) => void;
  changeTrackGain: (trackId: string, gainDb: number) => void;
  changeTrackPan: (trackId: string, pan: number) => void;
  loadMockSession: () => void;
}

export const sessionInitialState = {
  clips: mockClips,
  files: mediaFiles,
  tracks: mockTracks,
  dirty: false,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...sessionInitialState,
  changeClipTiming: (clipId, startPercent, widthPercent) =>
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === clipId ? { ...clip, startPercent, widthPercent } : clip,
      ),
      dirty: true,
    })),
  changeTrackGain: (trackId, gainDb) =>
    set((state) => ({
      tracks: state.tracks.map((track) => (track.id === trackId ? { ...track, gainDb } : track)),
      dirty: true,
    })),
  changeTrackPan: (trackId, pan) =>
    set((state) => ({
      tracks: state.tracks.map((track) => (track.id === trackId ? { ...track, pan } : track)),
      dirty: true,
    })),
  loadMockSession: () => set(sessionInitialState, true),
}));
```

- [ ] **Step 4: Run test**

Run: `pnpm test src/store/sessionStore.test.ts`

Expected: PASS.

---

### Task 3: Add Editor Store

**Files:**
- Create: `src/store/editorStore.ts`
- Test: `src/store/editorStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore, editorInitialState } from "./editorStore";
import { resetStore } from "./storeTestUtils";

describe("editorStore", () => {
  beforeEach(() => resetStore(useEditorStore, editorInitialState));

  it("stores selected ids and active media tab", () => {
    useEditorStore.getState().selectClip("clip-opening");
    useEditorStore.getState().selectFile("opening");
    useEditorStore.getState().selectTrack("track-1");
    useEditorStore.getState().setMediaTab("History");

    expect(useEditorStore.getState().selectedClipId).toBe("clip-opening");
    expect(useEditorStore.getState().selectedFileId).toBe("opening");
    expect(useEditorStore.getState().selectedTrackId).toBe("track-1");
    expect(useEditorStore.getState().activeMediaTab).toBe("History");
  });

  it("clamps panel and viewport resizing", () => {
    useEditorStore.getState().resizeLeftDock(1000);
    useEditorStore.getState().resizeInspector(-1000);
    useEditorStore.getState().resizeTrackHead(1000);
    useEditorStore.getState().resizeTransport(-1000);
    useEditorStore.getState().setVisibleWindow(95, 2);

    expect(useEditorStore.getState().leftDockWidth).toBe(520);
    expect(useEditorStore.getState().inspectorHeight).toBe(112);
    expect(useEditorStore.getState().trackHeadWidth).toBe(430);
    expect(useEditorStore.getState().transportHeight).toBe(90);
    expect(useEditorStore.getState().visibleStartPercent).toBe(90);
    expect(useEditorStore.getState().visibleWidthPercent).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/store/editorStore.test.ts`

Expected: FAIL because `editorStore.ts` does not exist yet.

- [ ] **Step 3: Implement editor store**

```ts
import { create } from "zustand";
import type { MediaTab } from "../types/audio";
import { clamp } from "../utils/math";

interface EditorStore {
  activeMediaTab: MediaTab;
  selectedClipId: string | null;
  selectedFileId: string | null;
  selectedTrackId: string | null;
  leftDockWidth: number;
  inspectorHeight: number;
  trackHeadWidth: number;
  trackHeights: Record<string, number>;
  transportHeight: number;
  visibleStartPercent: number;
  visibleWidthPercent: number;
  selectClip: (clipId: string) => void;
  selectFile: (fileId: string) => void;
  selectTrack: (trackId: string) => void;
  setMediaTab: (tab: MediaTab) => void;
  resizeLeftDock: (delta: number) => void;
  resizeInspector: (delta: number) => void;
  resizeTrackHead: (delta: number) => void;
  resizeTrackPair: (trackId: string, nextTrackId: string, delta: number) => void;
  resizeTransport: (delta: number) => void;
  setVisibleWindow: (startPercent: number, widthPercent: number) => void;
}

export const editorInitialState = {
  activeMediaTab: "Files" as MediaTab,
  selectedClipId: "clip-mola",
  selectedFileId: "opening",
  selectedTrackId: "track-3",
  leftDockWidth: 318,
  inspectorHeight: 172,
  trackHeadWidth: 318,
  trackHeights: {},
  transportHeight: 48,
  visibleStartPercent: 0,
  visibleWidthPercent: 100,
};

export const useEditorStore = create<EditorStore>((set) => ({
  ...editorInitialState,
  selectClip: (clipId) => set({ selectedClipId: clipId }),
  selectFile: (fileId) => set({ selectedFileId: fileId }),
  selectTrack: (trackId) => set({ selectedTrackId: trackId }),
  setMediaTab: (tab) => set({ activeMediaTab: tab }),
  resizeLeftDock: (delta) =>
    set((state) => ({ leftDockWidth: clamp(state.leftDockWidth + delta, 240, 520) })),
  resizeInspector: (delta) =>
    set((state) => ({ inspectorHeight: clamp(state.inspectorHeight + delta, 112, 360) })),
  resizeTrackHead: (delta) =>
    set((state) => ({ trackHeadWidth: clamp(state.trackHeadWidth + delta, 250, 430) })),
  resizeTrackPair: (trackId, nextTrackId, delta) =>
    set((state) => {
      const currentTrackHeight = state.trackHeights[trackId] ?? 1;
      const nextTrackHeight = state.trackHeights[nextTrackId] ?? 1;
      const totalPairHeight = currentTrackHeight + nextTrackHeight;
      const nextCurrentTrackHeight = clamp(
        currentTrackHeight + delta / 120,
        0.55,
        totalPairHeight - 0.55,
      );

      return {
        trackHeights: {
          ...state.trackHeights,
          [trackId]: nextCurrentTrackHeight,
          [nextTrackId]: totalPairHeight - nextCurrentTrackHeight,
        },
      };
    }),
  resizeTransport: (delta) =>
    set((state) => ({ transportHeight: clamp(state.transportHeight - delta, 42, 90) })),
  setVisibleWindow: (startPercent, widthPercent) => {
    const nextWidthPercent = clamp(widthPercent, 10, 100);

    set({
      visibleWidthPercent: nextWidthPercent,
      visibleStartPercent: clamp(startPercent, 0, 100 - nextWidthPercent),
    });
  },
}));
```

- [ ] **Step 4: Run test**

Run: `pnpm test src/store/editorStore.test.ts`

Expected: PASS.

---

### Task 4: Add Transport Store

**Files:**
- Create: `src/store/transportStore.ts`
- Test: `src/store/transportStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { transportInitialState, useTransportStore } from "./transportStore";
import { resetStore } from "./storeTestUtils";

describe("transportStore", () => {
  beforeEach(() => resetStore(useTransportStore, transportInitialState));

  it("clamps timeline playhead", () => {
    useTransportStore.getState().setTimelinePlayhead(999);

    expect(useTransportStore.getState().timelinePlayheadSeconds).toBe(140);
  });

  it("tracks waveform duration and playhead", () => {
    useTransportStore.getState().setWaveformDuration(70.2);
    useTransportStore.getState().setWaveformPlayhead(100);

    expect(useTransportStore.getState().waveformDurationSeconds).toBe(70.2);
    expect(useTransportStore.getState().waveformPlayheadSeconds).toBe(70.2);
  });

  it("stops timeline and waveform scopes", () => {
    useTransportStore.getState().setTransportState("Playing");
    useTransportStore.getState().setTimelinePlayhead(10);
    useTransportStore.getState().setWaveformPlayhead(10);
    useTransportStore.getState().stopTimeline();
    useTransportStore.getState().stopWaveform();

    expect(useTransportStore.getState().transportState).toBe("Stopped");
    expect(useTransportStore.getState().timelinePlayheadSeconds).toBe(0);
    expect(useTransportStore.getState().waveformPlayheadSeconds).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/store/transportStore.test.ts`

Expected: FAIL because `transportStore.ts` does not exist yet.

- [ ] **Step 3: Implement transport store**

```ts
import { create } from "zustand";
import type { TransportState } from "../libs/audio/engine";
import { clamp } from "../utils/math";

interface TransportStore {
  timelineDurationSeconds: number;
  timelinePlayheadSeconds: number;
  waveformDurationSeconds: number;
  waveformPlayheadSeconds: number;
  transportState: TransportState;
  setTimelinePlayhead: (seconds: number) => void;
  setWaveformDuration: (seconds: number) => void;
  setWaveformPlayhead: (seconds: number) => void;
  setTransportState: (state: TransportState) => void;
  stopTimeline: () => void;
  stopWaveform: () => void;
}

export const transportInitialState = {
  timelineDurationSeconds: 140,
  timelinePlayheadSeconds: 73.091,
  waveformDurationSeconds: 70,
  waveformPlayheadSeconds: 0,
  transportState: "Stopped" as TransportState,
};

export const useTransportStore = create<TransportStore>((set, get) => ({
  ...transportInitialState,
  setTimelinePlayhead: (seconds) =>
    set((state) => ({
      timelinePlayheadSeconds: clamp(seconds, 0, state.timelineDurationSeconds),
    })),
  setWaveformDuration: (seconds) =>
    set((state) => ({
      waveformDurationSeconds: Math.max(0, seconds),
      waveformPlayheadSeconds: clamp(state.waveformPlayheadSeconds, 0, Math.max(0, seconds)),
    })),
  setWaveformPlayhead: (seconds) =>
    set((state) => ({
      waveformPlayheadSeconds: clamp(seconds, 0, state.waveformDurationSeconds),
    })),
  setTransportState: (state) => set({ transportState: state }),
  stopTimeline: () => set({ timelinePlayheadSeconds: 0, transportState: "Stopped" }),
  stopWaveform: () => set({ waveformPlayheadSeconds: 0 }),
}));
```

- [ ] **Step 4: Run test**

Run: `pnpm test src/store/transportStore.test.ts`

Expected: PASS.

---

### Task 5: Add App And Settings Stores

**Files:**
- Create: `src/store/appStore.ts`
- Create: `src/store/settingsStore.ts`

- [ ] **Step 1: Implement app store**

```ts
import { create } from "zustand";
import { recentProjects } from "../data/mockData";

export type AppView = "Home" | "Multitrack" | "Waveform" | "Settings";
type EditorView = "Multitrack" | "Waveform";

function viewFromHash(): AppView {
  const hash = window.location.hash.replace("#", "").toLowerCase();

  if (hash === "multitrack" || hash === "waveform" || hash === "settings") {
    return (hash.charAt(0).toUpperCase() + hash.slice(1)) as AppView;
  }

  return "Home";
}

interface AppStore {
  activeView: AppView;
  previousEditorView: EditorView;
  selectedProjectId: string;
  navigate: (view: AppView) => void;
  openProject: (projectId: string) => void;
  openSettings: () => void;
  restoreEditor: () => void;
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
    set({ selectedProjectId: projectId, activeView: "Multitrack", previousEditorView: "Multitrack" });
  },
  openSettings: () => {
    const activeView = get().activeView;
    set({
      activeView: "Settings",
      previousEditorView: activeView === "Waveform" ? "Waveform" : "Multitrack",
    });
    window.location.hash = "settings";
  },
  restoreEditor: () => get().navigate(get().previousEditorView),
}));
```

- [ ] **Step 2: Implement settings store**

```ts
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
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm build`

Expected: PASS.

---

### Task 6: Add Selectors

**Files:**
- Create: `src/store/selectors.ts`

- [ ] **Step 1: Implement selectors**

```ts
import { recentProjects } from "../data/mockData";
import type { TimelineClip } from "../types/audio";
import { clamp } from "../utils/math";
import { useAppStore } from "./appStore";
import { useEditorStore } from "./editorStore";
import { useSessionStore } from "./sessionStore";
import { useTransportStore } from "./transportStore";

export function useSelectedProject() {
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);

  return recentProjects.find((project) => project.id === selectedProjectId) ?? recentProjects[0];
}

export function useSelectedFile() {
  const selectedFileId = useEditorStore((state) => state.selectedFileId);
  const files = useSessionStore((state) => state.files);

  return files.find((file) => file.id === selectedFileId);
}

export function useSelectedClip() {
  const selectedClipId = useEditorStore((state) => state.selectedClipId);
  const clips = useSessionStore((state) => state.clips);

  return clips.find((clip) => clip.id === selectedClipId);
}

export function useClipFileGetter() {
  const files = useSessionStore((state) => state.files);

  return (clip: TimelineClip) => files.find((file) => file.id === clip.sourceFileId);
}

export function useTimelineViewport() {
  const visibleWidthPercent = useEditorStore((state) => state.visibleWidthPercent);
  const visibleStartPercent = useEditorStore((state) => state.visibleStartPercent);
  const timelineWidthPercent = (100 / visibleWidthPercent) * 100;
  const zoomLevel = clamp(Math.round((100 - visibleWidthPercent) / 15), 0, 5);

  return { timelineWidthPercent, visibleStartPercent, visibleWidthPercent, zoomLevel };
}

export function useTimelinePlayheadPercent() {
  const playheadSeconds = useTransportStore((state) => state.timelinePlayheadSeconds);
  const durationSeconds = useTransportStore((state) => state.timelineDurationSeconds);

  return durationSeconds === 0 ? 0 : (playheadSeconds / durationSeconds) * 100;
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm build`

Expected: PASS.

---

### Task 7: Refactor `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace lifted state with store selectors**

`App.tsx` should no longer call `useState` for:

- `activeView`
- `previousEditorView`
- `selectedProjectId`
- `activeMediaTab`
- `clips`
- `selectedFileId`
- `tracks`
- `selectedTrackId`
- `selectedClipId`
- `selectedSettingsSection`

- [ ] **Step 2: Keep audio engine ownership in `App.tsx`**

Keep:

```ts
const audioEngine = useMemo(() => new RealtimeTransportEngine(), []);
```

Reason: `AudioTransportEngine` is a runtime service instance with async lifecycle. It should be dependency-injected, not serialized into Zustand.

- [ ] **Step 3: Render pages from stores**

`App.tsx` should pass only:

```tsx
<EditorPage audioEngine={audioEngine} editorView={activeView} />
```

and route callbacks should be store actions or page-local store usage.

- [ ] **Step 4: Run build**

Run: `pnpm build`

Expected: PASS.

---

### Task 8: Refactor `EditorPage.tsx`

**Files:**
- Modify: `src/pages/EditorPage.tsx`

- [ ] **Step 1: Narrow props**

Use this prop interface:

```ts
interface EditorPageProps {
  editorView: "Multitrack" | "Waveform";
  audioEngine: AudioTransportEngine;
}
```

- [ ] **Step 2: Read shared state from stores**

Read clips, tracks, files, selected ids, editor layout, viewport, selected file, selected project, and transport state through store selectors and actions.

- [ ] **Step 3: Keep `WaveSurferController` local**

Keep:

```ts
const [waveformController, setWaveformController] = useState<WaveSurferController | null>(null);
```

Reason: it is a runtime object owned by `WaveformCanvas`, not application state.

- [ ] **Step 4: Move resize and viewport callbacks to editor store actions**

Replace inline state updates with:

```ts
resizeLeftDock(delta);
resizeInspector(delta);
resizeTrackHead(delta);
resizeTrackPair(trackId, nextTrackId, delta);
resizeTransport(delta);
setVisibleWindow(startPercent, widthPercent);
```

- [ ] **Step 5: Move session edits to session store actions**

Replace prop callbacks with:

```ts
changeClipTiming(clipId, startPercent, widthPercent);
changeTrackGain(trackId, gainDb);
changeTrackPan(trackId, pan);
```

- [ ] **Step 6: Run build**

Run: `pnpm build`

Expected: PASS.

---

### Task 9: Decide Clip Automation State Boundary

**Files:**
- Modify: `src/components/editor/MultitrackTimeline.tsx`
- Modify: `src/types/audio.ts`
- Modify: `src/store/sessionStore.ts`
- Test: `src/store/sessionStore.test.ts`

- [ ] **Step 1: Add UI-facing clip automation type**

```ts
export interface TimelineKeyframePoint {
  id: string;
  xPercent: number;
  yPercent: number;
}

export interface TimelineClipAutomation {
  gain: TimelineKeyframePoint[];
}
```

- [ ] **Step 2: Add automation to `TimelineClip`**

```ts
automation?: TimelineClipAutomation;
```

- [ ] **Step 3: Move persistent keyframe edits into session store**

Add these actions:

```ts
upsertClipGainKeyframe: (clipId: string, xPercent: number, yPercent: number) => void;
moveClipGainKeyframes: (clipId: string, deltaYPercent: number) => void;
```

- [ ] **Step 4: Keep context menu state local**

Keep this inside `MultitrackTimeline.tsx`:

```ts
const [clipLevelMenu, setClipLevelMenu] = useState<ClipLevelMenu | null>(null);
```

- [ ] **Step 5: Run tests and build**

Run: `pnpm test src/store/sessionStore.test.ts`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.

---

### Task 10: Final Verification

**Files:**
- All files changed above.

- [ ] **Step 1: Run store tests**

Run: `pnpm test src/store/sessionStore.test.ts src/store/editorStore.test.ts src/store/transportStore.test.ts`

Expected: PASS.

- [ ] **Step 2: Run existing tests**

Run: `pnpm test`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 4: Start dev server**

Run: `pnpm dev`

Expected: Vite serves at `http://localhost:1420/`.

- [ ] **Step 5: Manual smoke test**

Open `http://localhost:1420/` and verify:

- Home opens.
- Project opens to multitrack.
- File opens waveform view.
- Clip opens waveform view and selects source file.
- Settings back returns to previous editor view.
- Track gain/pan controls still update.
- Clip trim still updates timing.
- Timeline zoom/window, track resizing, and panel resizing still work.
- Transport play/pause/stop still updates visible state.

---

## Self-Review

- Spec coverage: covers Zustand boundaries, props boundaries, local state, non-frontend state, store files, page/component refactor, and tests.
- Placeholder scan: no `TBD`, unresolved edge handling, or generic test instructions remain.
- Type consistency: store names, action names, and props are consistent across tasks.
