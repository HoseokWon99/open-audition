# Concrete Audio Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add concrete runtime Web Audio effects for delay and convolution reverb that can be inserted into the existing `AudioChain`.

**Architecture:** Keep serializable project/XML effect data separate from live `AudioNode` objects. Add focused runtime effect classes that implement `AudioEffect`, wire their own internal Web Audio subgraphs during `activate(manager)`, and expose only public `input`/`output` nodes to `AudioChain`. Add a small factory that converts `src/types/audio.ts` `Effect` records into runtime effects, including parameter defaults, clamping, enabled/bypassed mapping, and missing impulse-response errors for reverb.

**Tech Stack:** TypeScript, Web Audio API DOM types, neverthrow, Vitest, pnpm.

---

## File Structure

- Create: `src/libs/audio/effects/effectParams.ts`
  - Reads typed values from `EffectParam[]`.
  - Applies numeric clamping for theatre-safe defaults.
- Create: `src/libs/audio/effects/delayEffect.ts`
  - Implements a compound delay effect with dry/wet mix and feedback.
  - Graph: `input -> dryGain -> output`, `input -> delay -> wetGain -> output`, `delay -> feedbackGain -> delay`.
- Create: `src/libs/audio/effects/reverbEffect.ts`
  - Implements a convolution reverb effect with dry/wet mix.
  - Graph: `input -> dryGain -> output`, `input -> convolver -> wetGain -> output`.
- Create: `src/libs/audio/effects/effectFactory.ts`
  - Converts serializable `Effect` models into runtime `AudioEffect` instances.
  - Supports `Delay` and `Reverb`; returns a typed `OpenAuditionError` for unsupported realtime effects or missing reverb impulse responses.
- Create: `src/libs/audio/effects/delayEffect.test.ts`
  - Verifies delay parameters and internal graph wiring.
- Create: `src/libs/audio/effects/reverbEffect.test.ts`
  - Verifies reverb parameters, impulse buffer assignment, and internal graph wiring.
- Create: `src/libs/audio/effects/effectFactory.test.ts`
  - Verifies conversion from `Effect`, enabled-to-bypass behavior, clamping, and errors.
- Modify: `src/libs/audio/core/index.ts`
  - Export concrete effects and factory helpers.

## Task 1: Add Shared Effect Parameter Helpers

**Files:**
- Create: `src/libs/audio/effects/effectParams.ts`
- Test through: `src/libs/audio/effects/effectFactory.test.ts`

- [ ] **Step 1: Create the parameter helper**

Create `src/libs/audio/effects/effectParams.ts`:

```ts
import type { EffectParam, EffectParamValue } from "../../../types/audio";

export function getNumberParam(params: EffectParam[], name: string, fallback: number): number {
  const value = getParamValue(params, name);

  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getStringParam(params: EffectParam[], name: string, fallback: string): string {
  const value = getParamValue(params, name);

  return typeof value === "string" ? value : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getParamValue(params: EffectParam[], name: string): EffectParamValue | undefined {
  return params.find((param) => param.name === name)?.value;
}
```

- [ ] **Step 2: Run TypeScript build**

Run:

```bash
pnpm build
```

Expected: PASS. This helper is not exported yet, but it should type-check.

- [ ] **Step 3: Commit**

```bash
git add src/libs/audio/effects/effectParams.ts
git commit -m "feat: add audio effect param helpers"
```

## Task 2: Add DelayEffect

**Files:**
- Create: `src/libs/audio/effects/delayEffect.ts`
- Test: `src/libs/audio/effects/delayEffect.test.ts`

- [ ] **Step 1: Write the failing delay tests**

Create `src/libs/audio/effects/delayEffect.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { AudioNodeManager } from "../core/audioNodeManager";
import { createDelayEffect } from "./delayEffect";

interface FakeAudioParam {
  value: number;
}

interface FakeAudioNode extends AudioNode {
  delayTime?: FakeAudioParam;
  gain?: FakeAudioParam;
}

function createFakeAudioNode(context: BaseAudioContext): FakeAudioNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as FakeAudioNode;
}

function createFakeGain(context: BaseAudioContext): GainNode {
  return {
    ...createFakeAudioNode(context),
    gain: { value: 1 },
  } as unknown as GainNode;
}

function createFakeDelay(context: BaseAudioContext): DelayNode {
  return {
    ...createFakeAudioNode(context),
    delayTime: { value: 0 },
  } as unknown as DelayNode;
}

describe("DelayEffect", () => {
  it("sets clamped delay, feedback, and mix parameters", () => {
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
      createDelay: vi.fn(() => createFakeDelay(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;

    const effect = createDelayEffect({
      context,
      id: "delay-1",
      bypassed: false,
      delaySeconds: 12,
      feedback: 2,
      mix: -1,
    });

    expect(effect.delay.delayTime.value).toBe(5);
    expect(effect.feedback.gain.value).toBe(0.95);
    expect(effect.dryGain.gain.value).toBe(1);
    expect(effect.wetGain.gain.value).toBe(0);
  });

  it("registers and wires its internal delay graph", () => {
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
      createDelay: vi.fn(() => createFakeDelay(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const effect = createDelayEffect({
      context,
      id: "delay-1",
      bypassed: false,
      delaySeconds: 0.25,
      feedback: 0.4,
      mix: 0.35,
    });

    const result = effect.activate(manager);

    expect(result.isOk()).toBe(true);
    expect(effect.input.connect).toHaveBeenCalledWith(effect.dryGain);
    expect(effect.dryGain.connect).toHaveBeenCalledWith(effect.output);
    expect(effect.input.connect).toHaveBeenCalledWith(effect.delay);
    expect(effect.delay.connect).toHaveBeenCalledWith(effect.wetGain);
    expect(effect.wetGain.connect).toHaveBeenCalledWith(effect.output);
    expect(effect.delay.connect).toHaveBeenCalledWith(effect.feedback);
    expect(effect.feedback.connect).toHaveBeenCalledWith(effect.delay);
  });
});
```

- [ ] **Step 2: Run the delay tests to verify failure**

Run:

```bash
pnpm test src/libs/audio/effects/delayEffect.test.ts
```

Expected: FAIL because `src/libs/audio/effects/delayEffect.ts` does not exist.

- [ ] **Step 3: Implement DelayEffect**

Create `src/libs/audio/effects/delayEffect.ts`:

```ts
import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioEffect } from "../core/audioEffect";
import type { AudioNodeManager } from "../core/audioNodeManager";
import { clamp } from "./effectParams";

const MAX_DELAY_SECONDS = 5;
const MAX_FEEDBACK = 0.95;

export interface DelayEffect extends AudioEffect {
  readonly input: GainNode;
  readonly output: GainNode;
  readonly dryGain: GainNode;
  readonly wetGain: GainNode;
  readonly delay: DelayNode;
  readonly feedback: GainNode;
}

interface DelayEffectOptions {
  context: BaseAudioContext;
  id: string;
  bypassed: boolean;
  delaySeconds: number;
  feedback: number;
  mix: number;
}

export function createDelayEffect(options: DelayEffectOptions): DelayEffect {
  const input = options.context.createGain();
  const output = options.context.createGain();
  const dryGain = options.context.createGain();
  const wetGain = options.context.createGain();
  const delay = options.context.createDelay(MAX_DELAY_SECONDS);
  const feedback = options.context.createGain();
  const mix = clamp(options.mix, 0, 1);

  delay.delayTime.value = clamp(options.delaySeconds, 0, MAX_DELAY_SECONDS);
  feedback.gain.value = clamp(options.feedback, 0, MAX_FEEDBACK);
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  return {
    id: options.id,
    input,
    output,
    dryGain,
    wetGain,
    delay,
    feedback,
    bypassed: options.bypassed,
    activate: (manager) => activateDelayEffect(manager, input, output, dryGain, wetGain, delay, feedback),
  };
}

function activateDelayEffect(
  manager: AudioNodeManager,
  input: GainNode,
  output: GainNode,
  dryGain: GainNode,
  wetGain: GainNode,
  delay: DelayNode,
  feedback: GainNode,
): Result<void, OpenAuditionError> {
  const nodes = [input, output, dryGain, wetGain, delay, feedback];

  for (const node of nodes) {
    const registerResult = manager.register(node);

    if (registerResult.isErr()) {
      return err(registerResult.error);
    }
  }

  const edges: Array<[AudioNode, AudioNode]> = [
    [input, dryGain],
    [dryGain, output],
    [input, delay],
    [delay, wetGain],
    [wetGain, output],
    [delay, feedback],
    [feedback, delay],
  ];

  for (const [from, to] of edges) {
    const connectResult = manager.connect(from, to);

    if (connectResult.isErr()) {
      return err(connectResult.error);
    }
  }

  return ok(undefined);
}
```

- [ ] **Step 4: Run the delay tests**

Run:

```bash
pnpm test src/libs/audio/effects/delayEffect.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/libs/audio/effects/delayEffect.ts src/libs/audio/effects/delayEffect.test.ts
git commit -m "feat: add runtime delay effect"
```

## Task 3: Add ReverbEffect

**Files:**
- Create: `src/libs/audio/effects/reverbEffect.ts`
- Test: `src/libs/audio/effects/reverbEffect.test.ts`

- [ ] **Step 1: Write the failing reverb tests**

Create `src/libs/audio/effects/reverbEffect.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { AudioNodeManager } from "../core/audioNodeManager";
import { createReverbEffect } from "./reverbEffect";

interface FakeAudioParam {
  value: number;
}

interface FakeAudioNode extends AudioNode {
  buffer?: AudioBuffer | null;
  gain?: FakeAudioParam;
}

function createFakeAudioNode(context: BaseAudioContext): FakeAudioNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as FakeAudioNode;
}

function createFakeGain(context: BaseAudioContext): GainNode {
  return {
    ...createFakeAudioNode(context),
    gain: { value: 1 },
  } as unknown as GainNode;
}

function createFakeConvolver(context: BaseAudioContext): ConvolverNode {
  return {
    ...createFakeAudioNode(context),
    buffer: null,
  } as unknown as ConvolverNode;
}

describe("ReverbEffect", () => {
  it("sets impulse response and clamped mix parameters", () => {
    const impulseBuffer = {} as AudioBuffer;
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
      createConvolver: vi.fn(() => createFakeConvolver(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;

    const effect = createReverbEffect({
      context,
      id: "reverb-1",
      bypassed: false,
      impulseBuffer,
      mix: 2,
    });

    expect(effect.convolver.buffer).toBe(impulseBuffer);
    expect(effect.dryGain.gain.value).toBe(0);
    expect(effect.wetGain.gain.value).toBe(1);
  });

  it("registers and wires its internal convolution graph", () => {
    const impulseBuffer = {} as AudioBuffer;
    const context = {
      createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
      createConvolver: vi.fn(() => createFakeConvolver(context as unknown as BaseAudioContext)),
    } as unknown as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const effect = createReverbEffect({
      context,
      id: "reverb-1",
      bypassed: false,
      impulseBuffer,
      mix: 0.25,
    });

    const result = effect.activate(manager);

    expect(result.isOk()).toBe(true);
    expect(effect.input.connect).toHaveBeenCalledWith(effect.dryGain);
    expect(effect.dryGain.connect).toHaveBeenCalledWith(effect.output);
    expect(effect.input.connect).toHaveBeenCalledWith(effect.convolver);
    expect(effect.convolver.connect).toHaveBeenCalledWith(effect.wetGain);
    expect(effect.wetGain.connect).toHaveBeenCalledWith(effect.output);
  });
});
```

- [ ] **Step 2: Run the reverb tests to verify failure**

Run:

```bash
pnpm test src/libs/audio/effects/reverbEffect.test.ts
```

Expected: FAIL because `src/libs/audio/effects/reverbEffect.ts` does not exist.

- [ ] **Step 3: Implement ReverbEffect**

Create `src/libs/audio/effects/reverbEffect.ts`:

```ts
import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioEffect } from "../core/audioEffect";
import type { AudioNodeManager } from "../core/audioNodeManager";
import { clamp } from "./effectParams";

export interface ReverbEffect extends AudioEffect {
  readonly input: GainNode;
  readonly output: GainNode;
  readonly dryGain: GainNode;
  readonly wetGain: GainNode;
  readonly convolver: ConvolverNode;
}

interface ReverbEffectOptions {
  context: BaseAudioContext;
  id: string;
  bypassed: boolean;
  impulseBuffer: AudioBuffer;
  mix: number;
}

export function createReverbEffect(options: ReverbEffectOptions): ReverbEffect {
  const input = options.context.createGain();
  const output = options.context.createGain();
  const dryGain = options.context.createGain();
  const wetGain = options.context.createGain();
  const convolver = options.context.createConvolver();
  const mix = clamp(options.mix, 0, 1);

  convolver.buffer = options.impulseBuffer;
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  return {
    id: options.id,
    input,
    output,
    dryGain,
    wetGain,
    convolver,
    bypassed: options.bypassed,
    activate: (manager) => activateReverbEffect(manager, input, output, dryGain, wetGain, convolver),
  };
}

function activateReverbEffect(
  manager: AudioNodeManager,
  input: GainNode,
  output: GainNode,
  dryGain: GainNode,
  wetGain: GainNode,
  convolver: ConvolverNode,
): Result<void, OpenAuditionError> {
  const nodes = [input, output, dryGain, wetGain, convolver];

  for (const node of nodes) {
    const registerResult = manager.register(node);

    if (registerResult.isErr()) {
      return err(registerResult.error);
    }
  }

  const edges: Array<[AudioNode, AudioNode]> = [
    [input, dryGain],
    [dryGain, output],
    [input, convolver],
    [convolver, wetGain],
    [wetGain, output],
  ];

  for (const [from, to] of edges) {
    const connectResult = manager.connect(from, to);

    if (connectResult.isErr()) {
      return err(connectResult.error);
    }
  }

  return ok(undefined);
}
```

- [ ] **Step 4: Run the reverb tests**

Run:

```bash
pnpm test src/libs/audio/effects/reverbEffect.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/libs/audio/effects/reverbEffect.ts src/libs/audio/effects/reverbEffect.test.ts
git commit -m "feat: add runtime reverb effect"
```

## Task 4: Add Serializable Effect Factory

**Files:**
- Create: `src/libs/audio/effects/effectFactory.ts`
- Test: `src/libs/audio/effects/effectFactory.test.ts`

- [ ] **Step 1: Write the failing factory tests**

Create `src/libs/audio/effects/effectFactory.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { Effect } from "../../../types/audio";
import { createRuntimeEffect } from "./effectFactory";

function createFakeGain(context: BaseAudioContext): GainNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 },
  } as unknown as GainNode;
}

function createFakeDelay(context: BaseAudioContext): DelayNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
    delayTime: { value: 0 },
  } as unknown as DelayNode;
}

function createFakeConvolver(context: BaseAudioContext): ConvolverNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
    buffer: null,
  } as unknown as ConvolverNode;
}

function createFakeContext(): BaseAudioContext {
  const context = {
    createGain: vi.fn(() => createFakeGain(context as unknown as BaseAudioContext)),
    createDelay: vi.fn(() => createFakeDelay(context as unknown as BaseAudioContext)),
    createConvolver: vi.fn(() => createFakeConvolver(context as unknown as BaseAudioContext)),
  };

  return context as unknown as BaseAudioContext;
}

describe("createRuntimeEffect", () => {
  it("creates a delay effect from serializable effect params", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 0,
      type: "Delay",
      enabled: true,
      params: [
        { name: "delaySeconds", type: "Number", value: 0.35 },
        { name: "feedback", type: "Number", value: 0.45 },
        { name: "mix", type: "Number", value: 0.4 },
      ],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isOk()).toBe(true);
    const runtimeEffect = result._unsafeUnwrap();
    expect(runtimeEffect.id).toBe("effect-0-delay");
    expect(runtimeEffect.bypassed).toBe(false);
  });

  it("maps disabled serializable effects to bypassed runtime effects", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 2,
      type: "Delay",
      enabled: false,
      params: [],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().bypassed).toBe(true);
  });

  it("creates a reverb effect when the impulse response exists", () => {
    const context = createFakeContext();
    const impulseBuffer = {} as AudioBuffer;
    const effect: Effect = {
      index: 1,
      type: "Reverb",
      enabled: true,
      params: [
        { name: "impulseId", type: "String", value: "small-hall" },
        { name: "mix", type: "Number", value: 0.2 },
      ],
    };

    const result = createRuntimeEffect({
      context,
      effect,
      impulseResponses: new Map([["small-hall", impulseBuffer]]),
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().id).toBe("effect-1-reverb");
  });

  it("returns an error when a reverb impulse response is missing", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 1,
      type: "Reverb",
      enabled: true,
      params: [{ name: "impulseId", type: "String", value: "missing-room" }],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("AudioEffectImpulseMissing");
  });

  it("returns an error for realtime-unsupported effects", () => {
    const context = createFakeContext();
    const effect: Effect = {
      index: 3,
      type: "NoiseReduction",
      enabled: true,
      params: [],
    };

    const result = createRuntimeEffect({ context, effect, impulseResponses: new Map() });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("AudioEffectUnsupported");
  });
});
```

- [ ] **Step 2: Run the factory tests to verify failure**

Run:

```bash
pnpm test src/libs/audio/effects/effectFactory.test.ts
```

Expected: FAIL because `src/libs/audio/effects/effectFactory.ts` does not exist.

- [ ] **Step 3: Implement the factory**

Create `src/libs/audio/effects/effectFactory.ts`:

```ts
import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { Effect } from "../../../types/audio";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioEffect } from "../core/audioEffect";
import { createDelayEffect } from "./delayEffect";
import { getNumberParam, getStringParam } from "./effectParams";
import { createReverbEffect } from "./reverbEffect";

interface CreateRuntimeEffectOptions {
  context: BaseAudioContext;
  effect: Effect;
  impulseResponses: ReadonlyMap<string, AudioBuffer>;
}

export function createRuntimeEffect(options: CreateRuntimeEffectOptions): Result<AudioEffect, OpenAuditionError> {
  const { context, effect, impulseResponses } = options;
  const id = `effect-${effect.index}-${effect.type.toLowerCase()}`;
  const bypassed = !effect.enabled;

  if (effect.type === "Delay") {
    return ok(
      createDelayEffect({
        context,
        id,
        bypassed,
        delaySeconds: getNumberParam(effect.params, "delaySeconds", 0.25),
        feedback: getNumberParam(effect.params, "feedback", 0.3),
        mix: getNumberParam(effect.params, "mix", 0.25),
      }),
    );
  }

  if (effect.type === "Reverb") {
    const impulseId = getStringParam(effect.params, "impulseId", "default");
    const impulseBuffer = impulseResponses.get(impulseId);

    if (impulseBuffer === undefined) {
      return err({
        type: "AudioEffectImpulseMissing",
        message: `Missing impulse response for reverb effect: ${impulseId}`,
        data: { impulseId, effect },
      });
    }

    return ok(
      createReverbEffect({
        context,
        id,
        bypassed,
        impulseBuffer,
        mix: getNumberParam(effect.params, "mix", 0.2),
      }),
    );
  }

  return err({
    type: "AudioEffectUnsupported",
    message: `Realtime effect is not supported: ${effect.type}`,
    data: { effect },
  });
}
```

- [ ] **Step 4: Run the factory tests**

Run:

```bash
pnpm test src/libs/audio/effects/effectFactory.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/libs/audio/effects/effectFactory.ts src/libs/audio/effects/effectFactory.test.ts
git commit -m "feat: create runtime audio effects from project effects"
```

## Task 5: Export Runtime Effects

**Files:**
- Modify: `src/libs/audio/core/index.ts`

- [ ] **Step 1: Add exports**

Modify `src/libs/audio/core/index.ts` so it includes:

```ts
export { AudioNodeManager } from "./audioNodeManager";
export { createAudioChain } from "./audioChain";
export type { AudioChain } from "./audioChain";
export type { AudioEffect } from "./audioEffect";
export { createClipChain, createMasterChain, createTrackChain } from "./mixChains";
export type { ClipChainOptions, MasterChainOptions, TrackChainOptions } from "./mixChains";
export { createDelayEffect } from "../effects/delayEffect";
export type { DelayEffect } from "../effects/delayEffect";
export { createReverbEffect } from "../effects/reverbEffect";
export type { ReverbEffect } from "../effects/reverbEffect";
export { createRuntimeEffect } from "../effects/effectFactory";
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
pnpm test src/libs/audio/effects/delayEffect.test.ts src/libs/audio/effects/reverbEffect.test.ts src/libs/audio/effects/effectFactory.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm test
pnpm build
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/libs/audio/core/index.ts
git commit -m "feat: export concrete audio effects"
```

## Integration Notes

- XML already supports `Delay` and `Reverb` through `src/types/audio.ts` and `src/libs/xml/multitrack/schema/enums.ts`; this plan does not change XML shape.
- Reverb needs decoded impulse responses before runtime graph creation. The first caller should pass a `Map<string, AudioBuffer>` keyed by the serialized `impulseId` param.
- This plan deliberately does not add UI controls. A later plan should add inspector controls for `Delay` params `delaySeconds`, `feedback`, `mix`, and `Reverb` params `impulseId`, `mix`.
- This plan deliberately does not implement pitch shift, time stretch, noise reduction, or normalize as realtime effects. Those stay offline/destructive or separate DSP work as described in `docs/audio-architecture.md`.

## Self-Review

- Spec coverage: The plan implements concrete runtime delay and reverb effects, respects the existing `AudioEffect`/`AudioChain` contract, and keeps live nodes out of XML/project state.
- Placeholder scan: No task relies on unspecified behavior. Missing reverb impulse responses return a concrete `AudioEffectImpulseMissing` error.
- Type consistency: Runtime factory consumes existing `Effect` models, returns existing `AudioEffect`, and uses `OpenAuditionError` for recoverable failures.
