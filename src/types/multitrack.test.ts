import { describe, expect, it } from "vitest";
import type { Multitrack } from "./multitrack";

describe("Multitrack DTO", () => {
  it("uses shared camelCase fields returned from Rust", () => {
    const multitrack: Multitrack = {
      version: "1.0",
      id: "session-main",
      name: "Main",
      sampleRate: 48000,
      bitDepth: 24,
      createdAt: "2026-05-18T10:15:00+09:00",
      updatedAt: "2026-05-18T11:20:00+09:00",
      duration: 10,
      mediaAssets: [
        {
          id: "asset-main",
          name: "Main",
          path: "../media/main.wav",
          duration: 10,
          sampleRate: 48000,
          channelCount: 2,
          hash: null,
        },
      ],
      tracks: [
        {
          index: 0,
          name: "SFX",
          color: null,
          height: 1,
          locked: false,
          muted: false,
          solo: false,
          gainDb: 0,
          pan: 0,
          clips: [
            {
              id: "clip-main",
              assetId: "asset-main",
              name: null,
              locked: false,
              muted: false,
              timelineStart: 0,
              sourceStart: 0,
              duration: 10,
              gainDb: 0,
              pan: 0,
              playbackRate: 1,
              fadeIn: null,
              fadeOut: null,
              keyframes: [{ target: "GainDb", points: [{ time: 0, value: 0 }] }],
              effects: [
                {
                  index: 0,
                  kind: "Gain",
                  params: [{ name: "gainDb", kind: "Number", value: 0 }],
                },
              ],
            },
          ],
          effects: [],
        },
      ],
    };

    expect(multitrack.sampleRate).toBe(48000);
    expect(multitrack.tracks[0].height).toBe(1);
    expect(multitrack.tracks[0].clips[0].effects[0].kind).toBe("Gain");
  });
});
