import { err, ok, Result } from "neverthrow";
import { OpenAuditionError } from "../../../types/error";

export type AudioEdge = [AudioNode, AudioNode];

export class AudioGraph {
  private readonly outgoing = new Map<AudioNode, Set<AudioNode>>();
  private readonly incoming = new Map<AudioNode, Set<AudioNode>>();

  removeNode(node: AudioNode): Result<void, OpenAuditionError> {
    const predecessorsResult = this.predecessors(node);

    if (predecessorsResult.isErr()) {
      return err(predecessorsResult.error);
    }

    const successorsResult = this.successors(node);

    if (successorsResult.isErr()) {
      return err(successorsResult.error);
    }

    const edges: AudioEdge[] = [
      ...predecessorsResult.value.map((predecessor): AudioEdge => [predecessor, node]),
      ...successorsResult.value.map((successor): AudioEdge => [node, successor]),
    ];

    for (const [from, to] of edges) {
      const disconnectResult = this.disconnect(from, to);

      if (disconnectResult.isErr()) {
        return err(disconnectResult.error);
      }
    }

    this.outgoing.delete(node);
    this.incoming.delete(node);

    return ok(undefined);
  }

  connect(from: AudioNode, to: AudioNode): Result<void, OpenAuditionError> {
    const successors = this.outgoing.get(from) ?? new Set<AudioNode>();

    if (successors.has(to)) {
      return ok(undefined);
    }

    try {
      from.connect(to);
    } catch (error) {
      return err(toAudioGraphError("AudioGraphConnectFailed", "Failed to connect audio nodes", error));
    }

    successors.add(to);
    this.outgoing.set(from, successors);

    const predecessors = this.incoming.get(to) ?? new Set<AudioNode>();

    predecessors.add(from);
    this.incoming.set(to, predecessors);

    return ok(undefined);
  }

  disconnect(from: AudioNode, to: AudioNode): Result<void, OpenAuditionError> {
    const successors = this.outgoing.get(from);

    if (!successors?.has(to)) {
      return ok(undefined);
    }

    try {
      from.disconnect(to);
    } catch (error) {
      return err(toAudioGraphError("AudioGraphDisconnectFailed", "Failed to disconnect audio nodes", error));
    }

    successors.delete(to);
    this.incoming.get(to)?.delete(from);

    if (successors.size === 0) {
      this.outgoing.delete(from);
    }

    if (this.incoming.get(to)?.size === 0) {
      this.incoming.delete(to);
    }

    return ok(undefined);
  }

  successors(node: AudioNode): Result<AudioNode[], OpenAuditionError> {
    return ok([...(this.outgoing.get(node) ?? [])]);
  }

  predecessors(node: AudioNode): Result<AudioNode[], OpenAuditionError> {
    return ok([...(this.incoming.get(node) ?? [])]);
  }

  edges(): Result<AudioEdge[], OpenAuditionError> {
    return ok(
      [...this.outgoing.entries()].flatMap(([from, successors]) =>
        [...successors].map((to): AudioEdge => [from, to]),
      ),
    );
  }

  clear(): void {
    this.outgoing.clear();
    this.incoming.clear();
  }

  disconnectAll(): Result<void, OpenAuditionError> {
    const edgesResult = this.edges();

    if (edgesResult.isErr()) {
      return err(edgesResult.error);
    }

    for (const [from, to] of edgesResult.value) {
      const disconnectResult = this.disconnect(from, to);

      if (disconnectResult.isErr()) {
        return err(disconnectResult.error);
      }
    }

    return ok(undefined);
  }
}

function toAudioGraphError(type: string, message: string, error: unknown): OpenAuditionError {
  return {
    type,
    message,
    data: error,
  };
}
