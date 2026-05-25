import { describe, expect, it, vi } from "vitest";
import { AudioGraph } from "./audioGraph";

function createFakeAudioNode(): AudioNode {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as AudioNode;
}

describe("AudioGraph", () => {
  it("stores directed edges and returns successors and predecessors", () => {
    const graph = new AudioGraph();
    const source = createFakeAudioNode();
    const gain = createFakeAudioNode();
    const destination = createFakeAudioNode();

    expect(graph.connect(source, gain).isOk()).toBe(true);
    expect(graph.connect(gain, destination).isOk()).toBe(true);

    expect(graph.successors(source)._unsafeUnwrap()).toEqual([gain]);
    expect(graph.predecessors(destination)._unsafeUnwrap()).toEqual([gain]);
    expect(graph.edges()._unsafeUnwrap()).toEqual([
      [source, gain],
      [gain, destination],
    ]);
    expect(source.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(destination);
  });

  it("removes incoming and outgoing edges when a node is removed", () => {
    const graph = new AudioGraph();
    const source = createFakeAudioNode();
    const gain = createFakeAudioNode();
    const destination = createFakeAudioNode();

    graph.connect(source, gain);
    graph.connect(gain, destination);

    expect(graph.removeNode(gain).isOk()).toBe(true);

    expect(graph.successors(source)._unsafeUnwrap()).toEqual([]);
    expect(graph.predecessors(destination)._unsafeUnwrap()).toEqual([]);
    expect(graph.edges()._unsafeUnwrap()).toEqual([]);
  });

  it("disconnects audio nodes when an edge is disconnected", () => {
    const graph = new AudioGraph();
    const source = createFakeAudioNode();
    const gain = createFakeAudioNode();

    graph.connect(source, gain);

    expect(graph.disconnect(source, gain).isOk()).toBe(true);

    expect(source.disconnect).toHaveBeenCalledWith(gain);
  });

  it("returns empty edges for unconnected nodes", () => {
    const graph = new AudioGraph();
    const source = createFakeAudioNode();

    expect(graph.successors(source)._unsafeUnwrap()).toEqual([]);
    expect(graph.predecessors(source)._unsafeUnwrap()).toEqual([]);
  });

  it("disconnects all edges while keeping nodes registered", () => {
    const graph = new AudioGraph();
    const source = createFakeAudioNode();
    const gain = createFakeAudioNode();

    graph.connect(source, gain);

    expect(graph.disconnectAll().isOk()).toBe(true);
    expect(graph.connect(source, gain).isOk()).toBe(true);

    expect(source.disconnect).toHaveBeenCalledWith(gain);
    expect(source.connect).toHaveBeenCalledTimes(2);
  });
});
