# Audio Chain Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable ordered audio-chain layer for `Clip Chain -> Track Chain -> Master Chain -> Output`.

**Architecture:** Keep `AudioNodeManager` as the low-level owner of registered nodes and Web Audio connections. Add a higher-level `AudioChain` abstraction that owns an input node, output node, and an ordered list of `AudioEffect` objects, then compose clip, track, and master chains from that primitive. Each effect exposes `activate(manager)` so simple effects can register one node and compound effects can register and wire private internal nodes before the outer chain connects them. Chain topology is rebuilt from serializable project/effect state; no `AudioNode` references enter React or XML state.

**Tech Stack:** TypeScript, Web Audio API DOM types, neverthrow, Vitest, pnpm.

---

## File Structure

- Delete: `src/libs/audio/core/audioProcessor.ts`
  - Removes the old incomplete abstract processor shape.
- Create: `src/libs/audio/core/audioEffect.ts`
  - Defines the chain-facing `AudioEffect` runtime contract.
- Create: `src/libs/audio/core/audioChain.ts`
  - Defines `AudioChain` and a `createAudioChain` helper.
  - Owns ordered chain topology: `input -> effects[] -> output`.
  - Supports activate, replace, bypass, connect, disconnect, and dispose through `AudioNodeManager`.
- Create: `src/libs/audio/core/audioChain.test.ts`
  - Tests empty chains, ordered effects, replacement, bypass, connection to destination, and disposal.
- Create: `src/libs/audio/core/mixChains.ts`
  - Defines `ClipChain`, `TrackChain`, and `MasterChain` factory helpers.
  - Keeps theatre-editing defaults explicit: clip gain/fade/keyframe stage, track gain/pan stage, master gain/meter stage.
- Create: `src/libs/audio/core/mixChains.test.ts`
  - Tests the graph shape for clip, track, and master chain composition.
- Modify: `src/libs/audio/core/index.ts`
  - Exports chain types and factories alongside `AudioNodeManager`.

## Task 1: Add Ordered AudioChain

**Files:**
- Delete: `src/libs/audio/core/audioProcessor.ts`
- Create: `src/libs/audio/core/audioEffect.ts`
- Create: `src/libs/audio/core/audioChain.ts`
- Test: `src/libs/audio/core/audioChain.test.ts`

- [ ] **Step 1: Write the failing chain tests**

Create `src/libs/audio/core/audioChain.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { AudioNodeManager } from "./audioNodeManager";
import { createAudioChain } from "./audioChain";

function createFakeAudioNode(context: BaseAudioContext): AudioNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as AudioNode;
}

describe("AudioChain", () => {
  it("connects input directly to output when there are no effects", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const input = createFakeAudioNode(context);
    const output = createFakeAudioNode(context);

    const chain = createAudioChain({ manager, input, output });

    expect(chain.isOk()).toBe(true);
    expect(input.connect).toHaveBeenCalledWith(output);
  });

  it("connects effects in declared order", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const input = createFakeAudioNode(context);
    const gain = createFakeAudioNode(context);
    const filter = createFakeAudioNode(context);
    const output = createFakeAudioNode(context);

    const chain = createAudioChain({
      manager,
      input,
      output,
      effects: [
        { id: "gain", input: gain, output: gain, bypassed: false, activate: vi.fn((manager: AudioNodeManager) => manager.register(gain)) },
        { id: "filter", input: filter, output: filter, bypassed: false, activate: vi.fn((manager: AudioNodeManager) => manager.register(filter)) },
      ],
    });

    expect(chain.isOk()).toBe(true);
    expect(input.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(filter);
    expect(filter.connect).toHaveBeenCalledWith(output);
  });

  it("skips bypassed effects without unregistering them", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const input = createFakeAudioNode(context);
    const bypassed = createFakeAudioNode(context);
    const active = createFakeAudioNode(context);
    const output = createFakeAudioNode(context);

    const chain = createAudioChain({
      manager,
      input,
      output,
      effects: [
        { id: "bypassed", input: bypassed, output: bypassed, bypassed: true, activate: vi.fn((manager: AudioNodeManager) => manager.register(bypassed)) },
        { id: "active", input: active, output: active, bypassed: false, activate: vi.fn((manager: AudioNodeManager) => manager.register(active)) },
      ],
    });

    expect(chain.isOk()).toBe(true);
    expect(input.connect).toHaveBeenCalledWith(active);
    expect(active.connect).toHaveBeenCalledWith(output);
    expect(bypassed.connect).not.toHaveBeenCalled();
  });

  it("does not directly connect compound effect input to output", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const input = createFakeAudioNode(context);
    const effectInput = createFakeAudioNode(context);
    const effectOutput = createFakeAudioNode(context);
    const output = createFakeAudioNode(context);

    const chain = createAudioChain({
      manager,
      input,
      output,
      effects: [
        {
          id: "compound",
          input: effectInput,
          output: effectOutput,
          bypassed: false,
          activate: vi.fn((manager: AudioNodeManager) =>
            manager.register(effectInput).andThen(() => manager.register(effectOutput)),
          ),
        },
      ],
    });

    expect(chain.isOk()).toBe(true);
    expect(input.connect).toHaveBeenCalledWith(effectInput);
    expect(effectOutput.connect).toHaveBeenCalledWith(output);
    expect(effectInput.connect).not.toHaveBeenCalledWith(effectOutput);
  });

  it("replaces effects by rebuilding chain connections", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const input = createFakeAudioNode(context);
    const oldEffect = createFakeAudioNode(context);
    const newEffect = createFakeAudioNode(context);
    const output = createFakeAudioNode(context);
    const chain = createAudioChain({
      manager,
      input,
      output,
      effects: [
        { id: "old", input: oldEffect, output: oldEffect, bypassed: false, activate: vi.fn((manager: AudioNodeManager) => manager.register(oldEffect)) },
      ],
    })._unsafeUnwrap();

    const result = chain.replaceEffects([
      { id: "new", input: newEffect, output: newEffect, bypassed: false, activate: vi.fn((manager: AudioNodeManager) => manager.register(newEffect)) },
    ]);

    expect(result.isOk()).toBe(true);
    expect(input.disconnect).toHaveBeenCalledWith(oldEffect);
    expect(oldEffect.disconnect).toHaveBeenCalledWith(output);
    expect(input.connect).toHaveBeenCalledWith(newEffect);
    expect(newEffect.connect).toHaveBeenCalledWith(output);
  });

  it("connects chain output to an external destination", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const input = createFakeAudioNode(context);
    const output = createFakeAudioNode(context);
    const destination = createFakeAudioNode(context);
    const chain = createAudioChain({ manager, input, output })._unsafeUnwrap();

    expect(chain.connectTo(destination).isOk()).toBe(true);

    expect(output.connect).toHaveBeenCalledWith(destination);
  });

  it("disconnects internal and external edges during dispose", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const input = createFakeAudioNode(context);
    const effect = createFakeAudioNode(context);
    const output = createFakeAudioNode(context);
    const destination = createFakeAudioNode(context);
    const chain = createAudioChain({
      manager,
      input,
      output,
      effects: [
        { id: "effect", input: effect, output: effect, bypassed: false, activate: vi.fn((manager: AudioNodeManager) => manager.register(effect)) },
      ],
    })._unsafeUnwrap();

    chain.connectTo(destination);

    expect(chain.dispose().isOk()).toBe(true);

    expect(input.disconnect).toHaveBeenCalledWith(effect);
    expect(effect.disconnect).toHaveBeenCalledWith(output);
    expect(output.disconnect).toHaveBeenCalledWith(destination);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm test src/libs/audio/core/audioChain.test.ts
```

Expected: FAIL because `src/libs/audio/core/audioChain.ts` does not exist.

- [ ] **Step 3: Define the AudioEffect contract**

Delete `src/libs/audio/core/audioProcessor.ts`, then create `src/libs/audio/core/audioEffect.ts`:

```ts
import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioNodeManager } from "./audioNodeManager";

export interface AudioEffect {
  id: string;
  input: AudioNode;
  output: AudioNode;
  bypassed: boolean;
  activate(manager: AudioNodeManager): Result<void, OpenAuditionError>;
}
```

- [ ] **Step 4: Implement the minimal ordered chain**

Create `src/libs/audio/core/audioChain.ts`:

```ts
import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioNodeManager } from "./audioNodeManager";
import type { AudioEffect } from "./audioEffect";

export interface AudioChain {
  readonly input: AudioNode;
  readonly output: AudioNode;

  replaceEffects(effects: AudioEffect[]): Result<void, OpenAuditionError>;
  connectTo(node: AudioNode): Result<void, OpenAuditionError>;
  disconnectFrom(node: AudioNode): Result<void, OpenAuditionError>;
  dispose(): Result<void, OpenAuditionError>;
}

interface AudioChainOptions {
  manager: AudioNodeManager;
  input: AudioNode;
  output: AudioNode;
  effects?: AudioEffect[];
}

export function createAudioChain(options: AudioChainOptions): Result<AudioChain, OpenAuditionError> {
  const chain = new ManagedAudioChain(options.manager, options.input, options.output);

  return chain.initialize(options.effects ?? []).map(() => chain);
}

class ManagedAudioChain implements AudioChain {
  private effects: AudioEffect[] = [];
  private internalEdges: Array<[AudioNode, AudioNode]> = [];
  private readonly externalConnections = new Set<AudioNode>();

  constructor(
    private readonly manager: AudioNodeManager,
    readonly input: AudioNode,
    readonly output: AudioNode,
  ) {}

  initialize(effects: AudioEffect[]): Result<void, OpenAuditionError> {
    return this.registerEndpoints()
      .andThen(() => this.activateEffects(effects))
      .andThen(() => {
        this.effects = effects;

        return this.rebuildInternalConnections();
      });
  }

  replaceEffects(effects: AudioEffect[]): Result<void, OpenAuditionError> {
    return this.disconnectInternalConnections()
      .andThen(() => this.activateEffects(effects))
      .andThen(() => {
        this.effects = effects;

        return this.rebuildInternalConnections();
      });
  }

  connectTo(node: AudioNode): Result<void, OpenAuditionError> {
    return this.manager.register(node).andThen(() =>
      this.manager.connect(this.output, node).map(() => {
        this.externalConnections.add(node);
      }),
    );
  }

  disconnectFrom(node: AudioNode): Result<void, OpenAuditionError> {
    return this.manager.disconnect(this.output, node).map(() => {
      this.externalConnections.delete(node);
    });
  }

  dispose(): Result<void, OpenAuditionError> {
    return this.disconnectInternalConnections().andThen(() => {
      for (const node of this.externalConnections) {
        const disconnectResult = this.manager.disconnect(this.output, node);

        if (disconnectResult.isErr()) {
          return err(disconnectResult.error);
        }
      }

      this.externalConnections.clear();

      return ok(undefined);
    });
  }

  private registerEndpoints(): Result<void, OpenAuditionError> {
    return this.manager.register(this.input).andThen(() => this.manager.register(this.output));
  }

  private activateEffects(effects: AudioEffect[]): Result<void, OpenAuditionError> {
    for (const effect of effects) {
      const activateResult = effect.activate(this.manager);

      if (activateResult.isErr()) {
        return err(activateResult.error);
      }
    }

    return ok(undefined);
  }

  private rebuildInternalConnections(): Result<void, OpenAuditionError> {
    const activeEffects = this.effects.filter((effect) => !effect.bypassed);
    let previousNode = this.input;

    for (const effect of activeEffects) {
      const connectResult = this.connectInternalEdge(previousNode, effect.input);

      if (connectResult.isErr()) {
        return err(connectResult.error);
      }

      previousNode = effect.output;
    }

    return this.connectInternalEdge(previousNode, this.output);
  }

  private connectInternalEdge(from: AudioNode, to: AudioNode): Result<void, OpenAuditionError> {
    const connectResult = this.manager.connect(from, to);

    if (connectResult.isErr()) {
      return err(connectResult.error);
    }

    this.internalEdges.push([from, to]);

    return ok(undefined);
  }

  private disconnectInternalConnections(): Result<void, OpenAuditionError> {
    for (const [from, to] of this.internalEdges) {
      const disconnectResult = this.manager.disconnect(from, to);

      if (disconnectResult.isErr()) {
        return err(disconnectResult.error);
      }
    }

    this.internalEdges = [];

    return ok(undefined);
  }
}
```

- [ ] **Step 5: Run the chain test**

Run:

```bash
pnpm test src/libs/audio/core/audioChain.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/libs/audio/core/audioProcessor.ts src/libs/audio/core/audioEffect.ts src/libs/audio/core/audioChain.ts src/libs/audio/core/audioChain.test.ts
git commit -m "feat: add ordered audio chain"
```

## Task 2: Add Clip, Track, And Master Chain Factories

**Files:**
- Create: `src/libs/audio/core/mixChains.ts`
- Test: `src/libs/audio/core/mixChains.test.ts`

- [ ] **Step 1: Write the failing mix-chain tests**

Create `src/libs/audio/core/mixChains.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { AudioNodeManager } from "./audioNodeManager";
import { createClipChain, createMasterChain, createTrackChain } from "./mixChains";

function createFakeAudioNode(context: BaseAudioContext): AudioNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as AudioNode;
}

function createFakeContext(): BaseAudioContext {
  return {
    createGain: vi.fn(),
    createStereoPanner: vi.fn(),
  } as unknown as BaseAudioContext;
}

describe("mix chain factories", () => {
  it("creates clip chain as source stage into clip effects output", () => {
    const context = createFakeContext();
    const manager = new AudioNodeManager(context);
    const source = createFakeAudioNode(context);
    const clipGain = createFakeAudioNode(context);
    const clipEffectsOutput = createFakeAudioNode(context);

    const chain = createClipChain({
      manager,
      source,
      clipGain,
      clipEffectsOutput,
      effects: [],
    });

    expect(chain.isOk()).toBe(true);
    expect(source.connect).toHaveBeenCalledWith(clipGain);
    expect(clipGain.connect).toHaveBeenCalledWith(clipEffectsOutput);
  });

  it("creates track chain as input bus through gain and pan into track effects output", () => {
    const context = createFakeContext();
    const manager = new AudioNodeManager(context);
    const trackInput = createFakeAudioNode(context);
    const trackGain = createFakeAudioNode(context);
    const trackPan = createFakeAudioNode(context);
    const trackEffectsOutput = createFakeAudioNode(context);

    const chain = createTrackChain({
      manager,
      trackInput,
      trackGain,
      trackPan,
      trackEffectsOutput,
      effects: [],
    });

    expect(chain.isOk()).toBe(true);
    expect(trackInput.connect).toHaveBeenCalledWith(trackGain);
    expect(trackGain.connect).toHaveBeenCalledWith(trackPan);
    expect(trackPan.connect).toHaveBeenCalledWith(trackEffectsOutput);
  });

  it("creates master chain as master input through gain and meter into destination output", () => {
    const context = createFakeContext();
    const manager = new AudioNodeManager(context);
    const masterInput = createFakeAudioNode(context);
    const masterGain = createFakeAudioNode(context);
    const meter = createFakeAudioNode(context);
    const destination = createFakeAudioNode(context);

    const chain = createMasterChain({
      manager,
      masterInput,
      masterGain,
      meter,
      destination,
      effects: [],
    });

    expect(chain.isOk()).toBe(true);
    expect(masterInput.connect).toHaveBeenCalledWith(masterGain);
    expect(masterGain.connect).toHaveBeenCalledWith(meter);
    expect(meter.connect).toHaveBeenCalledWith(destination);
  });

  it("connects clip chain to track chain, then track chain to master chain", () => {
    const context = createFakeContext();
    const manager = new AudioNodeManager(context);
    const source = createFakeAudioNode(context);
    const clipGain = createFakeAudioNode(context);
    const clipOutput = createFakeAudioNode(context);
    const trackInput = createFakeAudioNode(context);
    const trackGain = createFakeAudioNode(context);
    const trackPan = createFakeAudioNode(context);
    const trackOutput = createFakeAudioNode(context);
    const masterInput = createFakeAudioNode(context);
    const masterGain = createFakeAudioNode(context);
    const meter = createFakeAudioNode(context);
    const destination = createFakeAudioNode(context);

    const clipChain = createClipChain({ manager, source, clipGain, clipEffectsOutput: clipOutput, effects: [] })._unsafeUnwrap();
    const trackChain = createTrackChain({
      manager,
      trackInput,
      trackGain,
      trackPan,
      trackEffectsOutput: trackOutput,
      effects: [],
    })._unsafeUnwrap();
    const masterChain = createMasterChain({
      manager,
      masterInput,
      masterGain,
      meter,
      destination,
      effects: [],
    })._unsafeUnwrap();

    expect(clipChain.connectTo(trackChain.input).isOk()).toBe(true);
    expect(trackChain.connectTo(masterChain.input).isOk()).toBe(true);

    expect(clipOutput.connect).toHaveBeenCalledWith(trackInput);
    expect(trackOutput.connect).toHaveBeenCalledWith(masterInput);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm test src/libs/audio/core/mixChains.test.ts
```

Expected: FAIL because `src/libs/audio/core/mixChains.ts` does not exist.

- [ ] **Step 3: Implement mix chain factories**

Create `src/libs/audio/core/mixChains.ts`:

```ts
import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import { createAudioChain } from "./audioChain";
import type { AudioChain } from "./audioChain";
import type { AudioNodeManager } from "./audioNodeManager";
import type { AudioEffect } from "./audioEffect";

export interface ClipChainOptions {
  manager: AudioNodeManager;
  source: AudioNode;
  clipGain: AudioNode;
  clipEffectsOutput: AudioNode;
  effects: AudioEffect[];
}

export interface TrackChainOptions {
  manager: AudioNodeManager;
  trackInput: AudioNode;
  trackGain: AudioNode;
  trackPan: AudioNode;
  trackEffectsOutput: AudioNode;
  effects: AudioEffect[];
}

export interface MasterChainOptions {
  manager: AudioNodeManager;
  masterInput: AudioNode;
  masterGain: AudioNode;
  meter: AudioNode;
  destination: AudioNode;
  effects: AudioEffect[];
}

export function createClipChain(options: ClipChainOptions): Result<AudioChain, OpenAuditionError> {
  return createAudioChain({
    manager: options.manager,
    input: options.source,
    output: options.clipEffectsOutput,
    effects: [
      {
        id: "clip-gain",
        input: options.clipGain,
        output: options.clipGain,
        bypassed: false,
        activate: (manager) => manager.register(options.clipGain),
      },
      ...options.effects,
    ],
  });
}

export function createTrackChain(options: TrackChainOptions): Result<AudioChain, OpenAuditionError> {
  return createAudioChain({
    manager: options.manager,
    input: options.trackInput,
    output: options.trackEffectsOutput,
    effects: [
      {
        id: "track-gain",
        input: options.trackGain,
        output: options.trackGain,
        bypassed: false,
        activate: (manager) => manager.register(options.trackGain),
      },
      {
        id: "track-pan",
        input: options.trackPan,
        output: options.trackPan,
        bypassed: false,
        activate: (manager) => manager.register(options.trackPan),
      },
      ...options.effects,
    ],
  });
}

export function createMasterChain(options: MasterChainOptions): Result<AudioChain, OpenAuditionError> {
  return createAudioChain({
    manager: options.manager,
    input: options.masterInput,
    output: options.destination,
    effects: [
      {
        id: "master-gain",
        input: options.masterGain,
        output: options.masterGain,
        bypassed: false,
        activate: (manager) => manager.register(options.masterGain),
      },
      ...options.effects,
      {
        id: "master-meter",
        input: options.meter,
        output: options.meter,
        bypassed: false,
        activate: (manager) => manager.register(options.meter),
      },
    ],
  });
}
```

- [ ] **Step 4: Run the mix-chain test**

Run:

```bash
pnpm test src/libs/audio/core/mixChains.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/libs/audio/core/mixChains.ts src/libs/audio/core/mixChains.test.ts
git commit -m "feat: add clip track master chain factories"
```

## Task 3: Export Chain APIs

**Files:**
- Modify: `src/libs/audio/core/index.ts`
- Test: `src/libs/audio/core/index.ts`

- [ ] **Step 1: Replace the audio core barrel exports**

Update `src/libs/audio/core/index.ts`:

```ts
export { AudioNodeManager } from "./audioNodeManager";
export { createAudioChain } from "./audioChain";
export type { AudioChain } from "./audioChain";
export type { AudioEffect } from "./audioEffect";
export { createClipChain, createMasterChain, createTrackChain } from "./mixChains";
export type { ClipChainOptions, MasterChainOptions, TrackChainOptions } from "./mixChains";
```

- [ ] **Step 2: Run focused audio core tests**

Run:

```bash
pnpm test src/libs/audio/core/audioGraph.test.ts src/libs/audio/core/audioNodeManager.test.ts src/libs/audio/core/audioChain.test.ts src/libs/audio/core/mixChains.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/libs/audio/core/index.ts
git commit -m "feat: export audio chain APIs"
```

## Task 4: Document The Chain Contract

**Files:**
- Modify: `docs/audio-architecture.md`

- [ ] **Step 1: Add the chain structure section**

Add this section after `Realtime Playback Engine`:

````md
### Audio Chain Structure

Realtime and offline playback use the same chain shape:

```text
Clip Chain -> Track Chain -> Master Chain -> Output
```

Clip chains start at an `AudioBufferSourceNode`, apply clip gain, fade automation, keyframe automation, and clip effects, then feed the owning track input bus.

Track chains receive one or more clip chains, apply track gain, pan, and track effects, then feed the master input bus.

The master chain receives the summed track output, applies final master gain, optional master effects, and peak/clipping metering, then connects to the realtime destination or offline render destination.

`AudioNodeManager` owns raw node registration and Web Audio connections. `AudioEffect.activate(manager)` registers simple effect nodes or registers and wires private internal nodes for compound effects. `AudioChain` owns ordered topology for one chain and only connects into each effect's public `input` and out from its public `output`. Project and XML state store effect intent and parameters only; they never store live `AudioNode` objects.
````

- [ ] **Step 2: Run documentation-safe verification**

Run:

```bash
pnpm test src/libs/audio/core/audioGraph.test.ts src/libs/audio/core/audioNodeManager.test.ts src/libs/audio/core/audioChain.test.ts src/libs/audio/core/mixChains.test.ts
pnpm build
```

Expected: both commands PASS.

- [ ] **Step 3: Commit**

```bash
git add docs/audio-architecture.md
git commit -m "docs: describe audio chain structure"
```

## Final Verification

Run:

```bash
pnpm test
pnpm build
```

Expected: both commands PASS.

## Self-Review

- Spec coverage: The plan implements the agreed `Clip Chain -> Track Chain -> Master Chain -> Output` structure, keeps `AudioNodeManager` low-level, adds reusable chain topology management, and defines `AudioEffect.activate(manager)` for simple and compound effects.
- Placeholder scan: No placeholder steps remain; all created files include concrete code.
- Type consistency: `AudioEffect`, `AudioChain`, and mix-chain option names are defined before use and match all exports.
- Scope check: This plan stops at chain topology. Effect factories, real transport scheduling, offline rendering, and XML serialization are intentionally separate follow-up plans.
