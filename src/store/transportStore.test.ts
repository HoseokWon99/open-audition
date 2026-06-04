import { beforeEach, describe, expect, it } from "vitest";
import { transportInitialState, useTransportStore } from "./transportStore";
import { resetStore } from "./storeTestUtils";

describe("transportStore", () => {
  beforeEach(() => resetStore(useTransportStore, transportInitialState));

  it("clamps timeline playhead", () => {
    useTransportStore.getState().setTimelinePlayhead(999);

    expect(useTransportStore.getState().timelinePlayheadSeconds).toBe(140);
  });

  it("tracks waveform duration and playhead", () => {
    useTransportStore.getState().setWaveformDuration(70.2);
    useTransportStore.getState().setWaveformPlayhead(100);

    expect(useTransportStore.getState().waveformDurationSeconds).toBe(70.2);
    expect(useTransportStore.getState().waveformPlayheadSeconds).toBe(70.2);
  });

  it("stops timeline and waveform scopes", () => {
    useTransportStore.getState().setTransportState("Playing");
    useTransportStore.getState().setTimelinePlayhead(10);
    useTransportStore.getState().setWaveformPlayhead(10);
    useTransportStore.getState().stopTimeline();
    useTransportStore.getState().stopWaveform();

    expect(useTransportStore.getState().transportState).toBe("Stopped");
    expect(useTransportStore.getState().timelinePlayheadSeconds).toBe(0);
    expect(useTransportStore.getState().waveformPlayheadSeconds).toBe(0);
  });
});
