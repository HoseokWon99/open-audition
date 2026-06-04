import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore, editorInitialState } from "./editorStore";
import { resetStore } from "./storeTestUtils";

describe("editorStore", () => {
  beforeEach(() => resetStore(useEditorStore, editorInitialState));

  it("stores selected ids and active media tab", () => {
    useEditorStore.getState().selectClip("clip-opening");
    useEditorStore.getState().selectFile("opening");
    useEditorStore.getState().selectTrack("track-1");
    useEditorStore.getState().setMediaTab("History");

    expect(useEditorStore.getState().selectedClipId).toBe("clip-opening");
    expect(useEditorStore.getState().selectedFileId).toBe("opening");
    expect(useEditorStore.getState().selectedTrackId).toBe("track-1");
    expect(useEditorStore.getState().activeMediaTab).toBe("History");
  });

  it("clamps panel and viewport resizing", () => {
    useEditorStore.getState().resizeLeftDock(1000);
    useEditorStore.getState().resizeInspector(-1000);
    useEditorStore.getState().resizeTrackHead(1000);
    useEditorStore.getState().resizeTransport(-1000);
    useEditorStore.getState().setVisibleWindow(95, 2);

    expect(useEditorStore.getState().leftDockWidth).toBe(520);
    expect(useEditorStore.getState().inspectorHeight).toBe(112);
    expect(useEditorStore.getState().trackHeadWidth).toBe(430);
    expect(useEditorStore.getState().transportHeight).toBe(90);
    expect(useEditorStore.getState().visibleStartPercent).toBe(90);
    expect(useEditorStore.getState().visibleWidthPercent).toBe(10);
  });

  it("resizes paired track heights without changing total height", () => {
    useEditorStore.getState().resizeTrackPair("track-1", "track-2", 24);

    expect(useEditorStore.getState().trackHeights["track-1"]).toBe(1.2);
    expect(useEditorStore.getState().trackHeights["track-2"]).toBe(0.8);
  });
});
