import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
import type { OpenAuditionError } from "../../../types/error";

export type TransportState = "Stopped" | "Playing" | "Paused";

export interface AudioTransportEngine {
  readonly state: TransportState;

  currentTime(): number;
  play(fromSeconds?: number): ResultAsync<void, OpenAuditionError>;
  pause(): ResultAsync<void, OpenAuditionError>;
  stop(): ResultAsync<void, OpenAuditionError>;
  seek(seconds: number): void;
  dispose(): ResultAsync<void, OpenAuditionError>;
}

type AudioContextFactory = () => AudioContext;

export class RealtimeTransportEngine implements AudioTransportEngine {
  private audioContext: AudioContext | null = null;
  private audioContextStartTime = 0;
  private stateValue: TransportState = "Stopped";
  private timelinePosition = 0;
  private timelineStartAtPlay = 0;

  constructor(private readonly createAudioContext: AudioContextFactory = () => new AudioContext()) {}

  get state(): TransportState {
    return this.stateValue;
  }

  currentTime(): number {
    if (this.stateValue !== "Playing" || !this.audioContext) {
      return this.timelinePosition;
    }

    return this.timelineStartAtPlay + (this.audioContext.currentTime - this.audioContextStartTime);
  }

  play(fromSeconds = this.currentTime()): ResultAsync<void, OpenAuditionError> {
    const contextResult = this.getAudioContext();

    if (contextResult.isErr()) {
      return errAsync(contextResult.error);
    }

    const context = contextResult.value;
    const nextPosition = Math.max(0, fromSeconds);

    return ResultAsync.fromPromise(context.resume(), (error) =>
      toRealtimeTransportError("AudioContextResumeFailed", "Failed to resume audio playback", error),
    ).map(() => {
      this.timelinePosition = nextPosition;
      this.timelineStartAtPlay = nextPosition;
      this.audioContextStartTime = context.currentTime;
      this.stateValue = "Playing";
    });
  }

  pause(): ResultAsync<void, OpenAuditionError> {
    if (this.stateValue !== "Playing" || !this.audioContext) {
      this.stateValue = "Paused";
      return okAsync(undefined);
    }

    const pausedAt = this.currentTime();

    return ResultAsync.fromPromise(this.audioContext.suspend(), (error) =>
      toRealtimeTransportError("AudioContextSuspendFailed", "Failed to pause audio playback", error),
    ).map(() => {
      this.timelinePosition = pausedAt;
      this.stateValue = "Paused";
    });
  }

  stop(): ResultAsync<void, OpenAuditionError> {
    this.timelinePosition = 0;
    this.timelineStartAtPlay = 0;

    if (!this.audioContext || this.audioContext.state !== "running") {
      this.stateValue = "Stopped";
      return okAsync(undefined);
    }

    return ResultAsync.fromPromise(this.audioContext.suspend(), (error) =>
      toRealtimeTransportError("AudioContextSuspendFailed", "Failed to stop audio playback", error),
    ).map(() => {
      this.stateValue = "Stopped";
    });
  }

  seek(seconds: number): void {
    const nextPosition = Math.max(0, seconds);
    this.timelinePosition = nextPosition;

    if (this.stateValue === "Playing" && this.audioContext) {
      this.timelineStartAtPlay = nextPosition;
      this.audioContextStartTime = this.audioContext.currentTime;
    }
  }

  dispose(): ResultAsync<void, OpenAuditionError> {
    const context = this.audioContext;
    this.audioContext = null;
    this.stateValue = "Stopped";
    this.timelinePosition = 0;
    this.timelineStartAtPlay = 0;

    if (!context || context.state === "closed") {
      return okAsync(undefined);
    }

    return ResultAsync.fromPromise(context.close(), (error) =>
      toRealtimeTransportError("AudioContextCloseFailed", "Failed to dispose audio playback", error),
    );
  }

  private getAudioContext(): Result<AudioContext, OpenAuditionError> {
    if (this.audioContext) {
      return ok(this.audioContext);
    }

    try {
      this.audioContext = this.createAudioContext();
      return ok(this.audioContext);
    } catch (error) {
      return err(toRealtimeTransportError("AudioContextCreateFailed", "Failed to create audio context", error));
    }
  }
}

export function toRealtimeTransportError(
  type: string,
  message: string,
  error: unknown,
): OpenAuditionError {
  return {
    type,
    message,
    data: error,
  };
}
