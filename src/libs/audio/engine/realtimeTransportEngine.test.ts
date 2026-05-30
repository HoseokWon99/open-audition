import { describe, expect, it, vi } from "vitest";
import { RealtimeTransportEngine } from "./realtimeTransportEngine";

class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = "suspended";
  close = vi.fn(() => {
    this.state = "closed";
    return Promise.resolve();
  });
  resume = vi.fn(() => {
    this.state = "running";
    return Promise.resolve();
  });
  suspend = vi.fn(() => {
    this.state = "suspended";
    return Promise.resolve();
  });
}

describe("RealtimeTransportEngine", () => {
  it("starts playback from the requested timeline position", async () => {
    const context = new FakeAudioContext();
    const engine = new RealtimeTransportEngine(() => context as unknown as AudioContext);

    const result = await engine.play(12.5);
    context.currentTime = 3;

    expect(result.isOk()).toBe(true);
    expect(engine.state).toBe("Playing");
    expect(engine.currentTime()).toBe(15.5);
    expect(context.resume).toHaveBeenCalledOnce();
  });

  it("pauses at the audible timeline position", async () => {
    const context = new FakeAudioContext();
    const engine = new RealtimeTransportEngine(() => context as unknown as AudioContext);

    expect((await engine.play(8)).isOk()).toBe(true);
    context.currentTime = 1.25;
    const result = await engine.pause();

    expect(result.isOk()).toBe(true);
    expect(engine.state).toBe("Paused");
    expect(engine.currentTime()).toBe(9.25);
    expect(context.suspend).toHaveBeenCalledOnce();
  });

  it("stops and returns to the timeline start", async () => {
    const context = new FakeAudioContext();
    const engine = new RealtimeTransportEngine(() => context as unknown as AudioContext);

    expect((await engine.play(20)).isOk()).toBe(true);
    context.currentTime = 2;
    const result = await engine.stop();

    expect(result.isOk()).toBe(true);
    expect(engine.state).toBe("Stopped");
    expect(engine.currentTime()).toBe(0);
    expect(context.suspend).toHaveBeenCalledOnce();
  });

  it("seeks while preserving playback", async () => {
    const context = new FakeAudioContext();
    const engine = new RealtimeTransportEngine(() => context as unknown as AudioContext);

    expect((await engine.play(3)).isOk()).toBe(true);
    context.currentTime = 2;
    engine.seek(42);
    context.currentTime = 5;

    expect(engine.state).toBe("Playing");
    expect(engine.currentTime()).toBe(45);
  });

  it("returns an error when an audio context cannot be created", async () => {
    const engine = new RealtimeTransportEngine(() => {
      throw new Error("AudioContext unavailable");
    });

    const result = await engine.play();

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("AudioContextCreateFailed");
  });
});
