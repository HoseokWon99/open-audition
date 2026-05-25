# Audio Node Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `AudioNodeManager` on top of `AudioGraph` that tracks `AudioNode` signal-flow edges and owns the actual Web Audio `connect` / `disconnect` calls.

**Architecture:** `AudioGraph` is an audio-node-specific directed graph that owns signal-flow edges and Web Audio connection calls. `AudioNodeManager` owns registered node membership with `WeakSet<AudioNode>`, context validation, lifecycle guards, and a private `AudioGraph`; callers never handle ids or access the graph directly. Recoverable failures are returned as `Result<..., OpenAuditionError>` through `neverthrow`.

**Tech Stack:** TypeScript, Web Audio API DOM types, Vitest, pnpm.

---

## Implemented Files

- `src/libs/audio/core/audioGraph.ts`
  - Directed graph specialized to `AudioNode`.
  - Stores outgoing and incoming adjacency.
  - Calls `from.connect(to)` when adding a new edge.
  - Calls `from.disconnect(to)` when removing an existing edge.
  - Returns `Result` instead of throwing for recoverable failures.
- `src/libs/audio/core/audioNodeManager.ts`
  - Public node manager.
  - Owns private `AudioGraph`.
  - Stores registered `AudioNode` membership with `WeakSet<AudioNode>` so disconnected nodes are not strongly retained by registration alone.
  - Validates audio context ownership.
  - Delegates edge connection state to `AudioGraph`.
  - Returns `Result<void, OpenAuditionError>` from operational methods.
- `src/libs/audio/core/index.ts`
  - Public barrel. Exports only `AudioNodeManager`.
- `src/libs/audio/core/audioGraph.test.ts`
  - Tests graph edges and bound Web Audio connection calls.
- `src/libs/audio/core/audioNodeManager.test.ts`
  - Tests registration, context validation, connection, isolation, cleanup, and disposal.

## Public API

```ts
import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";

export class AudioNodeManager {
  constructor(context: BaseAudioContext);

  register(node: AudioNode): Result<void, OpenAuditionError>;
  unregister(node: AudioNode): Result<void, OpenAuditionError>;

  connect(from: AudioNode, to: AudioNode): Result<void, OpenAuditionError>;
  disconnect(from: AudioNode, to: AudioNode): Result<void, OpenAuditionError>;

  isolate(node: AudioNode): Result<void, OpenAuditionError>;
  disconnectAll(): Result<void, OpenAuditionError>;
  dispose(): Result<void, OpenAuditionError>;
}
```

No public `id`, `has`, `getId`, or `getNode` API.

## Internal API

```ts
import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";

export type AudioEdge = [AudioNode, AudioNode];

export class AudioGraph {
  removeNode(node: AudioNode): Result<void, OpenAuditionError>;

  connect(from: AudioNode, to: AudioNode): Result<void, OpenAuditionError>;
  disconnect(from: AudioNode, to: AudioNode): Result<void, OpenAuditionError>;

  successors(node: AudioNode): Result<AudioNode[], OpenAuditionError>;
  predecessors(node: AudioNode): Result<AudioNode[], OpenAuditionError>;
  edges(): Result<AudioEdge[], OpenAuditionError>;
  disconnectAll(): Result<void, OpenAuditionError>;
  clear(): void;
}
```

## Verification

```bash
pnpm test src/libs/audio/core/audioGraph.test.ts src/libs/audio/core/audioNodeManager.test.ts
pnpm test
pnpm build
```

All commands pass.

## Deferred Work

- `AudioParam` targets are deferred. Current edges are `AudioNode -> AudioNode`.
- Source lifecycle helpers such as `registerSource()` and `stopAllSources()` are deferred until playback scheduling exists.
- Graph visualization/debug export is deferred until graph builder debugging needs it.
