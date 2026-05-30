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
        {
          id: "gain",
          input: gain,
          output: gain,
          activate: vi.fn((manager: AudioNodeManager) => manager.register(gain)),
        },
        {
          id: "filter",
          input: filter,
          output: filter,
          activate: vi.fn((manager: AudioNodeManager) => manager.register(filter)),
        },
      ],
    });

    expect(chain.isOk()).toBe(true);
    expect(input.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(filter);
    expect(filter.connect).toHaveBeenCalledWith(output);
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
        {
          id: "old",
          input: oldEffect,
          output: oldEffect,
          activate: vi.fn((manager: AudioNodeManager) => manager.register(oldEffect)),
        },
      ],
    })._unsafeUnwrap();

    const result = chain.replaceEffects([
      {
        id: "new",
        input: newEffect,
        output: newEffect,
        activate: vi.fn((manager: AudioNodeManager) => manager.register(newEffect)),
      },
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
        {
          id: "effect",
          input: effect,
          output: effect,
          activate: vi.fn((manager: AudioNodeManager) => manager.register(effect)),
        },
      ],
    })._unsafeUnwrap();

    chain.connectTo(destination);

    expect(chain.dispose().isOk()).toBe(true);

    expect(input.disconnect).toHaveBeenCalledWith(effect);
    expect(effect.disconnect).toHaveBeenCalledWith(output);
    expect(output.disconnect).toHaveBeenCalledWith(destination);
  });
});
