import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";
import type { AudioEffect } from "./audioEffect";
import type { AudioNodeManager } from "./audioNodeManager";

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
  private internalEdges: [AudioNode, AudioNode][] = [];
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
    return this.manager.register(this.input)
        .andThen(() => this.manager.register(this.output));
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
    let prevNode = this.input;

    for (const effect of this.effects) {
      const r = this.connectInternalEdge(prevNode, effect.input)
      if (r.isErr()) return err(r.error);
      prevNode = effect.output;
    }

    return this.connectInternalEdge(prevNode, this.output);
  }

  private connectInternalEdge(from: AudioNode, to: AudioNode): Result<void, OpenAuditionError> {
    const result = this.manager.connect(from, to);
    if (result.isErr()) return err(result.error);
    this.internalEdges.push([from, to]);
    return ok(undefined);
  }

  private disconnectInternalConnections(): Result<void, OpenAuditionError> {
    for (const [from, to] of this.internalEdges) {
      const r = this.manager.disconnect(from, to);
      if (r.isErr()) return err(r.error);
    }

    this.internalEdges = [];
    return ok(undefined);
  }
}
