import { err, ok, Result } from "neverthrow";
import { OpenAuditionError } from "../../../types/error";
import { AudioGraph } from "./audioGraph";

export class AudioNodeManager {
  private disposed = false;
  private readonly graph = new AudioGraph();
  private readonly nodes = new WeakSet<AudioNode>();

  constructor(private readonly context: BaseAudioContext) {}

  register(node: AudioNode): Result<void, OpenAuditionError> {
    return this.ensureUsable().andThen(() => {
      const contextResult = this.ensureSameContext(node);

      if (contextResult.isErr()) {
        return err(contextResult.error);
      }

      this.nodes.add(node);

      return ok(undefined);
    });
  }

  unregister(node: AudioNode): Result<void, OpenAuditionError> {
    return this.ensureUsable()
      .andThen(() => this.ensureRegistered(node))
      .andThen(() =>
        this.graph.removeNode(node).andThen(() => {
          try {
            node.disconnect();
          } catch (error) {
            return err(toAudioNodeManagerError("AudioNodeDisconnectFailed", "Failed to disconnect audio node", error));
          }

          this.nodes.delete(node);

          return ok(undefined);
        }),
      );
  }

  connect(from: AudioNode, to: AudioNode): Result<void, OpenAuditionError> {
    return this.ensureUsable()
      .andThen(() => this.ensureRegistered(from))
      .andThen(() => this.ensureRegistered(to))
      .andThen(() => this.ensureSameContext(from))
      .andThen(() => this.ensureSameContext(to))
      .andThen(() => this.graph.connect(from, to));
  }

  disconnect(from: AudioNode, to: AudioNode): Result<void, OpenAuditionError> {
    return this.ensureUsable()
      .andThen(() => this.ensureRegistered(from))
      .andThen(() => this.ensureRegistered(to))
      .andThen(() => this.graph.disconnect(from, to));
  }

  isolate(node: AudioNode): Result<void, OpenAuditionError> {
    return this.ensureUsable()
      .andThen(() => this.ensureRegistered(node))
      .andThen(() => {
        for (const predecessor of this.graph.predecessors(node)) {
          const disconnectResult = this.disconnect(predecessor, node);

          if (disconnectResult.isErr()) {
            return err(disconnectResult.error);
          }
        }

        for (const successor of this.graph.successors(node)) {
          const disconnectResult = this.disconnect(node, successor);

          if (disconnectResult.isErr()) {
            return err(disconnectResult.error);
          }
        }

        return ok(undefined);
      });
  }

  disconnectAll(): Result<void, OpenAuditionError> {
    return this.ensureUsable().andThen(() => this.graph.disconnectAll());
  }

  dispose(): Result<void, OpenAuditionError> {
    return this.ensureUsable().andThen(() => {
      const disconnectResult = this.graph.disconnectAll();

      if (disconnectResult.isErr()) {
        return err(disconnectResult.error);
      }

      this.graph.clear();
      this.disposed = true;

      return ok(undefined);
    });
  }

  private ensureUsable(): Result<void, OpenAuditionError> {
    if (this.disposed) {
      return err({
        type: "AudioNodeManagerDisposed",
        message: "Audio node manager is disposed",
      });
    }

    return ok(undefined);
  }

  private ensureRegistered(node: AudioNode): Result<void, OpenAuditionError> {
    if (!this.nodes.has(node)) {
      return err({
        type: "AudioNodeNotRegistered",
        message: "Audio node is not registered",
      });
    }

    return ok(undefined);
  }

  private ensureSameContext(node: AudioNode): Result<void, OpenAuditionError> {
    if (node.context !== this.context) {
      return err({
        type: "AudioNodeContextMismatch",
        message: "Audio node belongs to a different context",
      });
    }

    return ok(undefined);
  }
}

function toAudioNodeManagerError(type: string, message: string, error: unknown): OpenAuditionError {
  return {
    type,
    message,
    data: error,
  };
}
