import { describe, expect, it } from "vitest";
import { resolveAudioSourceUrl } from "./audioSource";
import type { MediaFile } from "../../../types/audio";

const audioFile: MediaFile = {
  id: "opening",
  name: "opening.mp3",
  duration: "1:10.171",
  sampleRate: "48000 Hz",
  channels: "Stereo",
  sourceFormat: "MP3 192 Kbps",
  mediaType: "Audio",
  filepath: "https://example.com/opening.mp3",
};

describe("resolveAudioSourceUrl", () => {
  it("keeps browser-readable urls as-is", () => {
    expect(resolveAudioSourceUrl(audioFile, (path) => `asset://${path}`)).toBe(
      "https://example.com/opening.mp3",
    );
  });

  it("converts local audio file paths", () => {
    expect(
      resolveAudioSourceUrl(
        { ...audioFile, filepath: "/Users/test/opening.mp3" },
        (path) => `asset://${path}`,
      ),
    ).toBe("asset:///Users/test/opening.mp3");
  });

  it("converts local mp3 and wav sample paths", () => {
    expect(
      resolveAudioSourceUrl(
        { ...audioFile, filepath: "/Users/hoseok/Desktop/music/mola mola.mp3" },
        (path) => `asset://${path}`,
      ),
    ).toBe("asset:///Users/hoseok/Desktop/music/mola mola.mp3");

    expect(
      resolveAudioSourceUrl(
        { ...audioFile, filepath: "/Users/hoseok/Desktop/music/영차영차.wav" },
        (path) => `asset://${path}`,
      ),
    ).toBe("asset:///Users/hoseok/Desktop/music/영차영차.wav");
  });

  it("ignores unsupported local file extensions", () => {
    expect(resolveAudioSourceUrl({ ...audioFile, filepath: "/Users/test/opening.pkf" })).toBeNull();
  });

  it("ignores placeholder and non-audio files", () => {
    expect(resolveAudioSourceUrl({ ...audioFile, filepath: "/Users/.../opening.mp3" })).toBeNull();
    expect(resolveAudioSourceUrl({ ...audioFile, mediaType: "Multitrack" })).toBeNull();
  });
});
