import { describe, expect, it, vi } from "vitest";
import { AudioNodeManager } from "./audioNodeManager";

function createFakeAudioNode(context: BaseAudioContext): AudioNode {
  return {
    context,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as AudioNode;
}

describe("AudioNodeManager", () => {
  it("registers the same node only once", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const node = createFakeAudioNode(context);

    expect(manager.register(node).isOk()).toBe(true);
    expect(manager.register(node).isOk()).toBe(true);

    expect(manager.unregister(node).isOk()).toBe(true);
  });

  it("rejects nodes from a different audio context", () => {
    const context = {} as BaseAudioContext;
    const otherContext = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const node = createFakeAudioNode(otherContext);

    const result = manager.register(node);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("AudioNodeContextMismatch");
  });

  it("connects and disconnects registered nodes", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const source = createFakeAudioNode(context);
    const gain = createFakeAudioNode(context);

    manager.register(source);
    manager.register(gain);

    expect(manager.connect(source, gain).isOk()).toBe(true);
    expect(manager.disconnect(source, gain).isOk()).toBe(true);

    expect(source.connect).toHaveBeenCalledWith(gain);
    expect(source.disconnect).toHaveBeenCalledWith(gain);
  });

  it("isolates one node while keeping it registered", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const source = createFakeAudioNode(context);
    const gain = createFakeAudioNode(context);
    const destination = createFakeAudioNode(context);

    manager.register(source);
    manager.register(gain);
    manager.register(destination);
    manager.connect(source, gain);
    manager.connect(gain, destination);

    expect(manager.isolate(gain).isOk()).toBe(true);
    expect(manager.connect(gain, destination).isOk()).toBe(true);

    expect(source.disconnect).toHaveBeenCalledWith(gain);
    expect(gain.disconnect).toHaveBeenCalledWith(destination);
    expect(gain.connect).toHaveBeenCalledWith(destination);
  });

  it("disconnects all edges while keeping nodes registered", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const source = createFakeAudioNode(context);
    const gain = createFakeAudioNode(context);

    manager.register(source);
    manager.register(gain);
    manager.connect(source, gain);

    expect(manager.disconnectAll().isOk()).toBe(true);
    expect(manager.connect(source, gain).isOk()).toBe(true);

    expect(source.disconnect).toHaveBeenCalledWith(gain);
    expect(source.connect).toHaveBeenCalledTimes(2);
  });

  it("returns an error when connecting unregistered nodes", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const source = createFakeAudioNode(context);
    const gain = createFakeAudioNode(context);

    manager.register(source);

    const result = manager.connect(source, gain);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("AudioNodeNotRegistered");
  });

  it("makes the manager unusable after dispose", () => {
    const context = {} as BaseAudioContext;
    const manager = new AudioNodeManager(context);
    const source = createFakeAudioNode(context);
    const gain = createFakeAudioNode(context);

    manager.register(source);
    manager.register(gain);
    manager.connect(source, gain);

    expect(manager.dispose().isOk()).toBe(true);

    expect(source.disconnect).toHaveBeenCalledWith(gain);
    expect(manager.register(createFakeAudioNode(context))._unsafeUnwrapErr().type).toBe("AudioNodeManagerDisposed");
    expect(manager.connect(source, gain)._unsafeUnwrapErr().type).toBe("AudioNodeManagerDisposed");
  });
});
