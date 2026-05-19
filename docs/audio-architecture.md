# Audio Processing Architecture

Open Audition uses the Web Audio API as the primary audio engine for real-time preview, nondestructive multitrack playback, clip effects, fades, and offline project rendering. The architecture favors deterministic theatre sound editing over music-production DAW behavior.

## Goals

- Keep editing nondestructive by default.
- Make multitrack playback reliable and sample-accurate enough for theatre sound design.
- Support clip gain, fades, crossfades, keyframes, and essential effects without coupling audio processing to React rendering.
- Use the same project model for real-time playback and offline export.
- Keep destructive waveform edits separate from multitrack playback.
- Save project state as structured XML without serializing browser-only audio node state.

## Non-Goals

- No plugin-host architecture in the initial engine.
- No MIDI, instrument tracks, tempo grid, beat snapping, or DAW-style mixer routing.
- No real-time collaboration.
- No attempt to make WaveSurfer the audio engine. WaveSurfer is for visualization and interaction.

## High-Level Shape

```text
React UI / Timeline / Inspector
        |
        v
Zustand Project Store
        |
        v
Audio Engine Facade
        |
        +--> Realtime Playback Engine
        |       uses AudioContext
        |
        +--> Offline Render Engine
        |       uses OfflineAudioContext
        |
        +--> Single Waveform Edit Engine
                uses OfflineAudioContext and dedicated processors
```

The project store owns the editable document. The audio engine reads a snapshot of that document and builds Web Audio graphs from it. React components never hold `AudioNode` references.

## Core Modules

### Project Model

The project model is serializable and independent from Web Audio objects.

Recommended source layout:

```text
src/audio/
  engine/
    AudioEngine.ts
    RealtimePlaybackEngine.ts
    OfflineRenderEngine.ts
    AudioGraphBuilder.ts
    AudioBufferCache.ts
    TransportClock.ts
  model/
    project.ts
    timeline.ts
    effects.ts
    automation.ts
  waveform/
    WaveformEditSession.ts
    WaveformOperations.ts
    PeakCache.ts
  xml/
    projectXml.ts
```

Core model structure:

```text
MultitrackProject
  -> Track[]
      -> Clip[]
          -> keyframes
          -> fades
          -> effects

WaveformEditSession
  -> fades
  -> effects
```

Core model types:

```ts
type Seconds = number;
type Decibels = number;

type MultitrackProject = {
  id: string;
  name: string;
  sampleRate: number;
  tracks: AudioTrack[];
  media: MediaAsset[];
};

type MediaAsset = {
  id: string;
  name: string;
  path: string;
  duration: Seconds;
  sampleRate: number;
  channelCount: number;
};

type AudioTrack = {
  id: string;
  name: string;
  muted: boolean;
  solo: boolean;
  gainDb: Decibels;
  pan: number;
  clips: AudioClip[];
};

type AudioClip = {
  id: string;
  assetId: string;
  trackId: string;
  timelineStart: Seconds;
  sourceStart: Seconds;
  duration: Seconds;
  gainDb: Decibels;
  fades: ClipFades;
  keyframes: ClipKeyframeLane[];
  effects: EffectInstance[];
};

type WaveformEdit = {
  assetId: string;
  selection: TimeRange | null;
  fades: WaveformFade[];
  effects: EffectInstance[];
};
```

This keeps the document easy to save as XML and easy to replay through either an `AudioContext` or `OfflineAudioContext`.

### Audio Engine Facade

The UI talks to one facade:

```ts
type AudioEngine = {
  initialize(): Promise<void>;
  loadProject(project: MultitrackProject): Promise<void>;
  play(fromSeconds?: number): Promise<void>;
  pause(): void;
  stop(): void;
  seek(seconds: number): void;
  setPreviewRange(range: TimeRange | null): void;
  updateProject(project: MultitrackProject): void;
  renderProject(request: RenderRequest): Promise<RenderedAudio>;
  dispose(): void;
};
```

The facade hides graph rebuilding, cache management, transport state, and browser audio-context lifecycle rules.

## Realtime Playback Engine

Realtime playback uses `AudioContext`. Every playback start builds a fresh scheduled graph for the audible timeline range.

```text
AudioBufferSourceNode per active clip
  -> clip trim/fade/gain/automation nodes
  -> clip effect chain
  -> track summing GainNode
  -> track gain/pan nodes
  -> master GainNode
  -> destination
```

Important rule: `AudioBufferSourceNode` is one-shot. The engine should not try to pause and resume nodes. On play, seek, clip move, or graph-changing edit, it stops the current scheduled sources and schedules a new graph from the current transport position.

### Scheduling Model

The transport clock tracks:

- `state`: stopped, playing, paused
- `timelinePosition`
- `audioContextStartTime`
- `timelineStartAtPlay`

Current position while playing:

```ts
position = timelineStartAtPlay + (audioContext.currentTime - audioContextStartTime)
```

On play, the engine finds clips intersecting the playback window and schedules each clip:

```ts
const when = audioContext.currentTime + Math.max(0, clip.timelineStart - playhead);
const offset = clip.sourceStart + Math.max(0, playhead - clip.timelineStart);
const duration = clip.duration - Math.max(0, playhead - clip.timelineStart);
source.start(when, offset, duration);
```

Use a small lookahead window for long sessions. Initial implementation can schedule all active clips for simplicity, then move to rolling scheduling when projects become large.

### Clip Fades And Crossfades

Clip fades are `GainNode.gain` automation:

- Fade in: gain ramps from 0 to clip gain.
- Fade out: gain ramps from clip gain to 0.
- Curve type is stored in the project model, not inferred from nodes.

Crossfades are represented as overlapping clips with complementary fade curves. There is no special crossfade audio node in the first version.

### Gain And Keyframes

Convert dB to linear gain at graph build time:

```ts
linearGain = 10 ** (gainDb / 20)
```

Clip gain, track gain, and keyframes are separate automation layers. The graph builder combines them by scheduling automation onto gain parameters in this order:

1. clip base gain
2. clip fade curve
3. clip gain keyframes
4. track gain
5. master gain

## Effects

Effects are project data plus graph factories.

```ts
type EffectInstance = {
  id: string;
  type: EffectType;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
};
```

Initial effect mapping:

| Effect | Web Audio Strategy |
| --- | --- |
| Gain | `GainNode` |
| EQ | chained `BiquadFilterNode`s |
| Filter | `BiquadFilterNode` |
| Delay | `DelayNode` + feedback `GainNode` |
| Reverb | `ConvolverNode` |
| Pan | `StereoPannerNode` |
| Normalize | offline waveform operation |
| Time stretch | offline waveform operation |
| Pitch shift | offline waveform operation or later AudioWorklet |
| Noise reduction | offline waveform operation, likely Rust or WASM later |

Keep pitch shift, time stretching, and noise reduction out of the first real-time effect chain. They are complex enough to deserve separate processors.

## Offline Render Engine

Offline rendering uses `OfflineAudioContext` and the same graph builder with an offline destination.

Inputs:

- project snapshot
- render range
- output sample rate
- channel count
- optional selected tracks or stems

Outputs:

- rendered `AudioBuffer`
- encoded file from Tauri/Rust or browser-side encoder
- render diagnostics, including clipped peaks and duration

The offline renderer should be the authority for export. Do not record from realtime playback for final output.

## Waveform Editing

The Waveform Editor is a first-class single-file editing mode. It works on one media asset, or a bounded range inside one media asset, and produces either a new asset revision or a direct replacement depending on the user action.

This mode is for precise file-level work that does not need the multitrack graph:

- cleaning a recorded line
- trimming silence from a source file
- normalizing one sound effect
- repairing a click or noise burst
- applying a permanent fade to a file
- preparing a source before placing it into the multitrack timeline

### Waveform Edit Session

Opening an asset in the Waveform Editor creates a `WaveformEditSession`.

```ts
type WaveformEditSession = {
  id: string;
  assetId: string;
  sourcePath: string;
  workingBufferId: string;
  selection: TimeRange | null;
  fades: WaveformFade[];
  effects: EffectInstance[];
  dirty: boolean;
  history: WaveformEditOperation[];
};

type WaveformEditOperation =
  | { type: "trim"; range: TimeRange }
  | { type: "gain"; range: TimeRange; gainDb: Decibels }
  | { type: "normalize"; range: TimeRange; targetPeakDb: Decibels }
  | { type: "fade-in"; range: TimeRange; curve: FadeCurve }
  | { type: "fade-out"; range: TimeRange; curve: FadeCurve }
  | { type: "repair"; range: TimeRange }
  | { type: "noise-reduction"; range: TimeRange; amount: number };
```

The session owns temporary edit state. The project model is updated only when the user commits the edit.

### Preview Graph

Waveform preview uses a simpler graph than multitrack playback:

```text
AudioBufferSourceNode for working buffer
  -> selection/range gain if previewing a bounded region
  -> preview effect node when auditioning an operation
  -> master preview GainNode
  -> destination
```

The Waveform Editor can audition simple operations in real time when practical, but committed edits are rendered offline so the saved result matches export behavior.

### Commit Model

Waveform edits should use explicit commit choices:

- `Save as new revision`: writes a new audio file and updates selected clips or future uses to the new asset.
- `Replace asset`: writes a new audio file and updates the media asset path while preserving the asset id.
- `Cancel`: drops the edit session and leaves the project unchanged.

The default should be `Save as new revision` because it is safer for theatre projects where the same source may be reused in multiple cues or clips.

When the edited asset is already used by clips, the app should ask whether to:

- update only the clip that opened the editor
- update all clips using the source asset
- add the edited file as a new media asset without changing existing clips

### Operation Pipeline

Committed waveform operations run through the offline operation pipeline:

```text
source file
  -> decode to AudioBuffer
  -> apply operation list to selected ranges
  -> produce edited AudioBuffer
  -> write audio file through Tauri
  -> generate or invalidate peak cache
  -> update project media references
```

Examples:

- normalize
- destructive gain
- fade in/out
- trim
- repair
- noise reduction
- time stretch
- pitch shift

Single waveform edits are destructive at the file-revision level, but reversible at the project level because the original media asset remains available unless the user explicitly replaces it.

### Relationship To Multitrack Clips

Opening the Waveform Editor from a multitrack clip should pass both `assetId` and `clipId`.

The editor still operates on the source asset, not on the full multitrack mix. If the user edits only the clip's visible range, the operation range maps to:

```ts
assetRange.start = clip.sourceStart + selectedClipRange.start;
assetRange.end = clip.sourceStart + selectedClipRange.end;
```

This keeps clip-level nondestructive editing and file-level destructive editing separate.

## Waveform Visualization

WaveSurfer should render peaks and provide selection/timeline interaction. It should not be the source of truth for playback state.

Recommended split:

- `PeakCache` stores precomputed peaks per media asset.
- Multitrack lanes render peaks from cache.
- Waveform Editor can use WaveSurfer for detailed waveform interaction.
- Engine transport events drive cursor position.

## State Flow

```text
User edits clip
  -> Zustand project action updates serializable model
  -> UI re-renders timeline
  -> AudioEngine.updateProject(project)
  -> if stopped: cache only
  -> if playing and edit affects audible graph: rebuild from current playhead
```

Transport state should be emitted from the audio engine to the UI as lightweight snapshots:

```ts
type TransportSnapshot = {
  state: "stopped" | "playing" | "paused";
  positionSeconds: number;
  sampleRate: number;
};
```

## Error Handling

Use `neverthrow` for recoverable audio operations:

```ts
type AudioEngineError =
  | { type: "decode-failed"; assetId: string; message: string }
  | { type: "missing-file"; assetId: string; path: string }
  | { type: "unsupported-format"; path: string }
  | { type: "render-failed"; message: string }
  | { type: "context-unavailable"; message: string };
```

Errors should be surfaced through the project store so the UI can show missing media, failed decode, and render failure states.

## Tauri Boundary

The frontend owns Web Audio graph execution. Tauri/Rust should handle file-system and native tasks:

- open audio file
- read binary data
- write rendered files
- manage project file paths
- optionally encode WAV/FLAC/MP3 later
- optionally host advanced DSP later

Do not send large decoded audio buffers repeatedly across the Tauri boundary. Decode and cache in the frontend unless a Rust DSP path is explicitly needed.

## XML Save Format

The XML project should serialize only stable project data:

- project metadata
- media asset references
- tracks
- clips
- fades
- keyframes
- effect instances and parameters
- editor settings required to restore the session

It should not serialize:

- `AudioNode` state
- decoded `AudioBuffer`s
- WaveSurfer state
- transient transport state

## Implementation Phases

### Phase 1: Real-Time Nondestructive Core

- Define serializable audio project model.
- Add audio buffer cache and media decoding.
- Build realtime graph for clips, tracks, gain, mute, solo, pan, and fades.
- Add transport facade: play, pause, stop, seek.
- Wire basic timeline playback to the engine.

### Phase 2: Offline Export

- Add `OfflineRenderEngine`.
- Reuse graph builder for realtime and offline contexts.
- Render full project or selected range.
- Write WAV output through Tauri.
- Add peak/clipping diagnostics.

### Phase 3: Waveform Operations

- Add `WaveformEditSession` for single-file editing state.
- Add single-file offline operations: trim, gain, normalize, fade.
- Add preview playback for one asset or selected range.
- Create new media revisions for destructive edits.
- Support commit choices: new revision, replace asset, or cancel.
- Integrate Waveform Editor range selection.

### Phase 4: Advanced Effects

- Add EQ, filter, delay, and convolution reverb.
- Add effect parameter automation where useful.
- Evaluate AudioWorklet, WASM, or Rust DSP for pitch shift, time stretch, and noise reduction.

## Design Decisions

- Nondestructive multitrack editing is the default.
- Offline render is separate from realtime playback but shares graph construction.
- Destructive waveform processing is separate from multitrack clip playback.
- Single waveform editing has its own session and commit model.
- Audio state is not stored in React components.
- Project XML represents intent, not Web Audio implementation details.
- WaveSurfer is visualization and interaction support, not the playback engine.
