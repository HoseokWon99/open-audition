# Wavesurfer Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Wavesurfer.js as the reliable waveform rendering and single-file playback surface for Open Audition, using local theatre sound files during development.

**Architecture:** Keep Wavesurfer isolated behind hooks and small adapters so React components do not own raw Wavesurfer lifecycle details. The first integration path is the Waveform editor, then clip previews in the Multitrack editor after file loading, duration, playhead, and cleanup behavior are stable.

**Tech Stack:** React 19, TypeScript, Vitest, Tauri `convertFileSrc`, Wavesurfer.js v7, existing `neverthrow` error style where recoverable failures are surfaced outside pure UI code.

---

## Current State

- `wavesurfer.js` is already installed in `package.json`.
- `src/hooks/useWaveSurferRenderer.ts` creates a Wavesurfer instance, loads `resolveAudioSourceUrl(file)`, and falls back to synthetic peaks.
- `src/components/editor/WaveformCanvas.tsx` is visually complete but hard-codes duration to `70` seconds and keeps playhead/selection as percentages.
- `src/pages/EditorPage.tsx` owns the global transport bar. Its `RealtimeTransportEngine` is currently a clock only; it does not play selected audio files.
- `src/libs/audio/waveform/audioSource.ts` already converts local file paths through Tauri, and tests cover placeholder paths.
- Sample audio exists at `/Users/hoseok/Desktop/music`, including:
  - `/Users/hoseok/Desktop/music/mola mola.mp3`
  - `/Users/hoseok/Desktop/music/영차영차.wav`
  - `/Users/hoseok/Desktop/music/오프닝.mp3`
  - `/Users/hoseok/Desktop/music/엔딩.mp3`

## File Structure

- Modify `src/types/audio.ts`
  - Add optional numeric metadata to `MediaFile`: `durationSeconds`, `sampleRateHz`, `channelCount`.
  - Replace persisted named clip/track color unions with hex color strings.
- Modify `src/data/mockData.ts`
  - Point development media entries at real sample files in `/Users/hoseok/Desktop/music`.
  - Keep display strings for the existing UI, but add numeric metadata for timeline math.
  - Store clip and track colors as hex strings.
- Modify `src/libs/audio/waveform/audioSource.ts`
  - Keep URL conversion pure and tested.
  - Add file-extension guards for unsupported media paths.
- Modify `src/libs/audio/waveform/audioSource.test.ts`
  - Cover absolute local sample paths, unsupported extensions, URL inputs, and placeholder paths.
- Replace `src/hooks/useWaveSurferRenderer.ts` with `src/hooks/useWaveSurfer.ts`
  - Own Wavesurfer lifecycle, status, duration, error, play/pause/stop/seek controls, and current-time polling.
- Modify `src/components/editor/WaveformCanvas.tsx`
  - Accept `durationSeconds`, `playheadSeconds`, and waveform callbacks from `EditorPage`.
  - Render Wavesurfer through the hook and convert pointer percentages to seconds.
- Modify `src/pages/EditorPage.tsx`
  - Route transport controls to Wavesurfer while in `Waveform` view.
  - Keep `RealtimeTransportEngine` for `Multitrack` view until multitrack playback is implemented.
- Create `src/components/editor/WaveformCanvas.test.tsx`
  - Test percentage-to-second seeking, file switching, and callback wiring with a mocked Wavesurfer module.
- Later modify `src/components/editor/MultitrackTimeline.tsx`
  - Replace decorative clip wave lines with cached Wavesurfer peaks or a lightweight canvas preview once single-file behavior is stable.

---

### Task 1: Add Real Sample Metadata and Hex Colors

**Files:**
- Modify: `src/types/audio.ts`
- Modify: `src/data/mockData.ts`
- Test: `src/libs/audio/waveform/audioSource.test.ts`

- [ ] **Step 1: Add a persisted hex color type**

In `src/types/audio.ts`, add:

```ts
export type HexColor = `#${string}`;
```

- [ ] **Step 2: Extend `MediaFile` with numeric metadata**

In `src/types/audio.ts`, update `MediaFile`:

```ts
export interface MediaFile {
  id: string;
  name: string;
  duration: string;
  durationSeconds?: number;
  sampleRate: string;
  sampleRateHz?: number;
  channels: string;
  channelCount?: number;
  sourceFormat: string;
  mediaType: "Audio" | "Multitrack";
  filepath: string;
}
```

- [ ] **Step 3: Store clip and track colors as hex strings**

In `src/types/audio.ts`, update `TimelineClip` and `TimelineTrack`:

```ts
export interface TimelineClip {
  id: string;
  name: string;
  trackId: string;
  startPercent: number;
  widthPercent: number;
  color: HexColor;
  sourceFileId: string;
  gainDb: number;
  fadeIn: string;
  fadeOut: string;
  duration: string;
}

export interface TimelineTrack {
  id: string;
  name: string;
  color: HexColor;
  gainDb: number;
  pan: number;
  input: string;
  output: string;
}
```

- [ ] **Step 4: Point audio mock data at local sample files**

In `src/data/mockData.ts`, update audio entries to use real paths during development:

```ts
{
  id: "mola",
  name: "mola mola.mp3",
  duration: "3:02.531",
  durationSeconds: 182.531,
  sampleRate: "48000 Hz",
  sampleRateHz: 48000,
  channels: "Stereo",
  channelCount: 2,
  sourceFormat: "MP3 192 Kbps",
  mediaType: "Audio",
  filepath: "/Users/hoseok/Desktop/music/mola mola.mp3",
}
```

Apply the same pattern for `opening`, `ending`, and the WAV sample. Keep the multitrack `.sesx` entry as a placeholder until XML loading is wired.

- [ ] **Step 5: Convert mock clip and track colors to hex**

Use stable theatre-editor palette values:

```ts
export const tracks: TimelineTrack[] = [
  {
    id: "track-1",
    name: "Track 1",
    color: "#20c997",
    gainDb: 0,
    pan: 0,
    input: "Default Stereo Input",
    output: "Mix",
  },
];

export const clips: TimelineClip[] = [
  {
    id: "clip-opening",
    name: "opening",
    trackId: "track-1",
    startPercent: 0,
    widthPercent: 48,
    color: "#20c997",
    sourceFileId: "opening",
    gainDb: 0,
    fadeIn: "0:00.250",
    fadeOut: "0:01.000",
    duration: "1:10.171",
  },
];
```

Update rendering code in a later task to use `style={{ "--clip-color": clip.color }}` rather than named `color-green` classes.

- [ ] **Step 6: Run existing waveform source tests**

Run:

```bash
pnpm test src/libs/audio/waveform/audioSource.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types/audio.ts src/data/mockData.ts src/libs/audio/waveform/audioSource.test.ts
git commit -m "feat: add sample audio metadata and hex colors"
```

---

### Task 2: Harden Audio Source Resolution

**Files:**
- Modify: `src/libs/audio/waveform/audioSource.ts`
- Modify: `src/libs/audio/waveform/audioSource.test.ts`

- [ ] **Step 1: Add failing tests for accepted and rejected paths**

Add tests:

```ts
it("converts local mp3 and wav sample paths", () => {
  expect(
    resolveAudioSourceUrl(
      { ...audioFile, filepath: "/Users/hoseok/Desktop/music/mola mola.mp3" },
      (path) => `asset://${path}`,
    ),
  ).toBe("asset:///Users/hoseok/Desktop/music/mola mola.mp3");

  expect(
    resolveAudioSourceUrl(
      { ...audioFile, filepath: "/Users/hoseok/Desktop/music/영차영차.wav" },
      (path) => `asset://${path}`,
    ),
  ).toBe("asset:///Users/hoseok/Desktop/music/영차영차.wav");
});

it("ignores unsupported local file extensions", () => {
  expect(resolveAudioSourceUrl({ ...audioFile, filepath: "/Users/test/opening.pkf" })).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/libs/audio/waveform/audioSource.test.ts
```

Expected: FAIL on unsupported extension behavior.

- [ ] **Step 3: Implement supported audio extension guard**

In `src/libs/audio/waveform/audioSource.ts`:

```ts
const supportedAudioExtensions = [".mp3", ".wav", ".aiff", ".aif", ".flac", ".ogg", ".m4a"];

export function resolveAudioSourceUrl(
  file: MediaFile | undefined,
  convertLocalFilePath: LocalFileConverter = safeConvertFileSrc,
): string | null {
  if (!file || file.mediaType !== "Audio" || file.filepath.includes("...")) {
    return null;
  }

  if (isBrowserReadableUrl(file.filepath)) {
    return file.filepath;
  }

  if (!hasSupportedAudioExtension(file.filepath)) {
    return null;
  }

  return convertLocalFilePath(file.filepath);
}

function hasSupportedAudioExtension(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return supportedAudioExtensions.some((extension) => lowerPath.endsWith(extension));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test src/libs/audio/waveform/audioSource.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/libs/audio/waveform/audioSource.ts src/libs/audio/waveform/audioSource.test.ts
git commit -m "fix: guard waveform audio sources"
```

---

### Task 3: Replace Renderer Hook With Wavesurfer Controller Hook

**Files:**
- Rename: `src/hooks/useWaveSurferRenderer.ts` to `src/hooks/useWaveSurfer.ts`
- Modify: `src/hooks/useWaveSurfer.ts`

- [ ] **Step 1: Define the hook API**

The hook should return a stable UI-facing controller:

```ts
export type WaveSurferStatus = "Idle" | "Loading" | "Ready" | "Error";

export interface WaveSurferController {
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentTimeSeconds: number;
  durationSeconds: number;
  errorMessage: string | null;
  isPlaying: boolean;
  status: WaveSurferStatus;
  pause: () => Promise<void>;
  play: () => Promise<void>;
  seek: (seconds: number) => void;
  stop: () => void;
}
```

- [ ] **Step 2: Implement lifecycle and events**

Use Wavesurfer events:

```ts
waveSurfer.on("ready", (duration) => {
  setDurationSeconds(duration);
  setStatus("Ready");
});

waveSurfer.on("error", (error) => {
  setErrorMessage(error instanceof Error ? error.message : String(error));
  setStatus("Error");
});

waveSurfer.on("play", () => setIsPlaying(true));
waveSurfer.on("pause", () => setIsPlaying(false));
waveSurfer.on("timeupdate", (seconds) => setCurrentTimeSeconds(seconds));
```

Create/destroy the Wavesurfer instance inside `useEffect`, and destroy the old instance whenever `file` changes.

- [ ] **Step 3: Keep fallback peaks only for placeholder files**

If `resolveAudioSourceUrl(file)` returns `null`, create the instance with `peaks` and `duration: file?.durationSeconds ?? 70`. If it returns a URL, call `waveSurfer.load(audioSourceUrl)`.

- [ ] **Step 4: Run build**

Run:

```bash
pnpm build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useWaveSurfer.ts src/hooks/useWaveSurferRenderer.ts
git commit -m "feat: add wavesurfer controller hook"
```

---

### Task 4: Drive Waveform View From Real Duration and Transport State

**Files:**
- Modify: `src/components/editor/WaveformCanvas.tsx`
- Modify: `src/pages/EditorPage.tsx`
- Create: `src/components/editor/WaveformCanvas.test.tsx`

- [ ] **Step 1: Change `WaveformCanvas` props**

```ts
interface WaveformCanvasProps {
  file?: MediaFile;
  playheadSeconds: number;
  onReady: (durationSeconds: number) => void;
  onSeek: (seconds: number) => void;
  onTimeUpdate: (seconds: number) => void;
}
```

- [ ] **Step 2: Convert waveform percentages to seconds**

Use:

```ts
const durationSeconds = controller.durationSeconds || file?.durationSeconds || 70;
const playheadPercent = durationSeconds <= 0 ? 0 : (playheadSeconds / durationSeconds) * 100;

function secondsFromPercent(percent: number) {
  return (durationSeconds * clamp(percent, 0, 100)) / 100;
}
```

Keep `useWaveformSelection` as percentage-based for now, but call `onSeek(secondsFromPercent(percent))` when users drag or click the waveform playhead.

- [ ] **Step 3: Wire ready and time updates**

In `WaveformCanvas`, call:

```ts
useEffect(() => {
  if (controller.status === "Ready") {
    onReady(controller.durationSeconds);
  }
}, [controller.durationSeconds, controller.status, onReady]);

useEffect(() => {
  onTimeUpdate(controller.currentTimeSeconds);
}, [controller.currentTimeSeconds, onTimeUpdate]);
```

- [ ] **Step 4: Route waveform transport through the controller**

In `EditorPage`, keep `RealtimeTransportEngine` behavior for multitrack. For waveform, track `waveformDurationSeconds`, `waveformPlayheadSeconds`, and callbacks from `WaveformCanvas`. The transport bar should show waveform time while `editorView === "Waveform"`.

- [ ] **Step 5: Add component tests with mocked Wavesurfer**

Test expectations:

```ts
it("reports real duration when wavesurfer becomes ready", async () => {
  render(<WaveformCanvas file={file} playheadSeconds={0} onReady={onReady} onSeek={vi.fn()} onTimeUpdate={vi.fn()} />);
  emitWaveSurferReady(182.531);
  expect(onReady).toHaveBeenCalledWith(182.531);
});

it("converts a playhead drag to seconds", async () => {
  render(<WaveformCanvas file={{ ...file, durationSeconds: 100 }} playheadSeconds={0} onReady={vi.fn()} onSeek={onSeek} onTimeUpdate={vi.fn()} />);
  dragPlayheadToPercent(25);
  expect(onSeek).toHaveBeenCalledWith(25);
});
```

- [ ] **Step 6: Run focused tests and build**

Run:

```bash
pnpm test src/components/editor/WaveformCanvas.test.tsx src/libs/audio/waveform/audioSource.test.ts
pnpm build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/editor/WaveformCanvas.tsx src/components/editor/WaveformCanvas.test.tsx src/pages/EditorPage.tsx
git commit -m "feat: sync waveform view with wavesurfer"
```

---

### Task 5: Connect Transport Buttons to Single-File Playback

**Files:**
- Modify: `src/hooks/useWaveSurfer.ts`
- Modify: `src/components/editor/WaveformCanvas.tsx`
- Modify: `src/pages/EditorPage.tsx`

- [ ] **Step 1: Expose controller commands upward**

Add a prop:

```ts
interface WaveformCanvasProps {
  file?: MediaFile;
  playheadSeconds: number;
  onControllerChange: (controller: WaveSurferController | null) => void;
  onReady: (durationSeconds: number) => void;
  onSeek: (seconds: number) => void;
  onTimeUpdate: (seconds: number) => void;
}
```

Call `onControllerChange(controller)` while mounted and `onControllerChange(null)` on cleanup.

- [ ] **Step 2: Use Wavesurfer for waveform transport buttons**

In `EditorPage`, hold:

```ts
const [waveformController, setWaveformController] = useState<WaveSurferController | null>(null);
```

When `editorView === "Waveform"`:

```ts
const play = useCallback(() => {
  if (editorView === "Waveform") {
    void waveformController?.play();
    return;
  }

  void audioEngine.play(playheadSeconds).then(/* existing result handling */);
}, [audioEngine, editorView, playheadSeconds, waveformController, reportAudioError]);
```

Apply the same split for `pause`, `stop`, rewind, fast-forward, start, and end.

- [ ] **Step 3: Preserve multitrack behavior**

Confirm `Multitrack` still calls `RealtimeTransportEngine` and uses `timelineDurationSeconds = 140`.

- [ ] **Step 4: Verify manually with sample files**

Run:

```bash
pnpm dev
```

Open `http://localhost:1420/#waveform`, select `mola mola.mp3`, and verify:

- Waveform renders from the real file.
- Play starts audible playback.
- Pause freezes the playhead.
- Stop returns to `0:00.000`.
- Rewind and fast-forward move by five seconds.
- Switching to `오프닝.mp3` destroys the previous Wavesurfer instance and loads the new waveform.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useWaveSurfer.ts src/components/editor/WaveformCanvas.tsx src/pages/EditorPage.tsx
git commit -m "feat: play waveform audio with wavesurfer"
```

---

### Task 6: Add Multitrack Clip Waveform Previews

**Files:**
- Create: `src/components/editor/ClipWaveformPreview.tsx`
- Modify: `src/components/editor/MultitrackTimeline.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Create non-interactive preview component**

```tsx
interface ClipWaveformPreviewProps {
  file?: MediaFile;
}

export function ClipWaveformPreview({ file }: ClipWaveformPreviewProps) {
  const controller = useWaveSurfer(file, {
    height: 28,
    interact: false,
    cursorWidth: 0,
    normalize: true,
  });

  return <span aria-hidden="true" className="oa-clip-waveform" ref={controller.containerRef} />;
}
```

- [ ] **Step 2: Replace named clip color classes and decorative clip lines**

In `MultitrackTimeline`, pass `files` or a `getClipFile` callback from `EditorPage`, then render:

```tsx
<button
  className={`oa-clip ${clip.id === selectedClipId ? "is-selected" : ""}`}
  style={{
    "--clip-color": clip.color,
  } as React.CSSProperties}
  type="button"
>
  <span className="oa-clip-name">{clip.name}</span>
  <ClipWaveformPreview file={getClipFile(clip)} />
</button>
```

inside each clip button instead of named `color-green` / `color-yellow` classes and `oa-wave-line` spans.

- [ ] **Step 3: Style hex-based clips and previews to avoid layout shift**

In `src/App.css`:

```css
.oa-clip {
  background: color-mix(in srgb, var(--clip-color) 34%, #202020);
  border-color: color-mix(in srgb, var(--clip-color) 68%, #ffffff);
}

.oa-clip.is-selected {
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--clip-color) 80%, #ffffff),
    0 0 0 1px rgba(255, 255, 255, 0.42);
}

.oa-clip-waveform {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 8px;
  height: 28px;
  pointer-events: none;
  opacity: 0.78;
}
```

- [ ] **Step 4: Verify performance before expanding**

Start with selected/visible clips only. If multiple clips cause slow loading, defer full multitrack previews and introduce a shared peak cache before rendering all tracks.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/ClipWaveformPreview.tsx src/components/editor/MultitrackTimeline.tsx src/pages/EditorPage.tsx src/App.css
git commit -m "feat: render clip waveform previews"
```

---

## Verification

- Run unit tests:

```bash
pnpm test
```

- Run production build:

```bash
pnpm build
```

- Run Tauri frontend:

```bash
pnpm dev
```

- Manual waveform checks:
  - `mola mola.mp3` renders and plays.
  - `영차영차.wav` renders and plays.
  - Placeholder `.sesx` opens multitrack and does not try to load as audio.
  - `.pkf` is ignored as waveform input.

## Risks and Decisions

- Do not use Wavesurfer Regions for first-pass selection. Existing selection UI already models theatre editing gestures; Regions can be evaluated after transport and source loading are stable.
- Do not make Wavesurfer the multitrack playback engine yet. Multitrack playback will need scheduling, gain/pan/effects chains, clip offsets, and crossfades through the Web Audio graph.
- Loading many Wavesurfer instances in multitrack can become expensive. Clip previews should start selected/visible-only, then move to cached peaks.
- Tauri file access must be verified in both Vite browser mode and `pnpm tauri dev`; `convertFileSrc` can behave differently outside the desktop shell.

## Self-Review

- Spec coverage: Covers sample audio usage, file-source resolution, waveform rendering, transport playback, and multitrack preview expansion.
- Placeholder scan: No task depends on an undefined future module without defining its file and API.
- Type consistency: `MediaFile.durationSeconds`, `WaveSurferController`, and waveform callbacks are named consistently across tasks.
