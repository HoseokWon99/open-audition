import { beforeEach, describe, expect, it } from "vitest";
import { clips as mockClips, mediaFiles, tracks as mockTracks } from "../data/mockData";
import { useSessionStore, sessionInitialState } from "./sessionStore";
import { resetStore } from "./storeTestUtils";

describe("sessionStore", () => {
  beforeEach(() => resetStore(useSessionStore, sessionInitialState));

  it("loads the mock session", () => {
    useSessionStore.getState().loadMockSession();

    expect(useSessionStore.getState().clips).toEqual(mockClips);
    expect(useSessionStore.getState().files).toEqual(mediaFiles);
    expect(useSessionStore.getState().tracks).toEqual(mockTracks);
    expect(useSessionStore.getState().dirty).toBe(false);
  });

  it("updates clip timing and marks the session dirty", () => {
    useSessionStore.getState().changeClipTiming("clip-mola", 10, 20);

    const clip = useSessionStore
      .getState()
      .clips.find((candidate) => candidate.id === "clip-mola");

    expect(clip?.startPercent).toBe(10);
    expect(clip?.widthPercent).toBe(20);
    expect(useSessionStore.getState().dirty).toBe(true);
  });

  it("updates track gain and pan", () => {
    useSessionStore.getState().changeTrackGain("track-3", -6);
    useSessionStore.getState().changeTrackPan("track-3", 0.25);

    const track = useSessionStore
      .getState()
      .tracks.find((candidate) => candidate.id === "track-3");

    expect(track?.gainDb).toBe(-6);
    expect(track?.pan).toBe(0.25);
  });

  it("upserts clip gain automation and marks the session dirty", () => {
    useSessionStore.getState().upsertClipGainKeyframe("clip-mola", 40, 25);

    const clip = useSessionStore
      .getState()
      .clips.find((candidate) => candidate.id === "clip-mola");

    expect(clip?.automation?.gain.map((keyframe) => keyframe.xPercent)).toEqual([0, 40, 100]);
    expect(clip?.automation?.gain[1]?.yPercent).toBe(25);
    expect(useSessionStore.getState().dirty).toBe(true);
  });

  it("moves clip gain automation within bounds", () => {
    useSessionStore.getState().upsertClipGainKeyframe("clip-mola", 40, 95);
    useSessionStore.getState().moveClipGainKeyframes("clip-mola", 10);

    const clip = useSessionStore
      .getState()
      .clips.find((candidate) => candidate.id === "clip-mola");

    expect(clip?.automation?.gain.map((keyframe) => keyframe.yPercent)).toEqual([60, 100, 60]);
  });

  it("updates, resets, and deletes selected clip gain keyframes", () => {
    useSessionStore.getState().upsertClipGainKeyframe("clip-mola", 40, 25);
    useSessionStore
      .getState()
      .updateClipGainKeyframe("clip-mola", "clip-mola-4000-2500", 42, 30);
    useSessionStore.getState().resetClipGainKeyframes("clip-mola", ["clip-mola-4000-2500"]);
    useSessionStore.getState().deleteClipGainKeyframes("clip-mola", ["clip-mola-4000-2500"]);

    const clip = useSessionStore
      .getState()
      .clips.find((candidate) => candidate.id === "clip-mola");

    expect(clip?.automation?.gain.map((keyframe) => keyframe.id)).toEqual(["start", "end"]);
    expect(useSessionStore.getState().dirty).toBe(true);
  });
});
