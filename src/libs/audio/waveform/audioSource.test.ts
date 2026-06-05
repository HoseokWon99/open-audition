import { describe, expect, it } from "vitest";
import { audioSourceDurationSeconds, resolveAudioSourceUrl } from "./audioSource";
import type { MediaFile } from "../../../types/audio";
import type { MediaAsset } from "../../../types/media";

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

const mediaAsset: MediaAsset = {
  id: "asset-opening",
  originalPath: "/Users/test/opening.mp3",
  cachePath: "/Users/test/Library/Application Support/open-audition/media/sources/asset-opening.mp3",
  kind: "Audio",
  fingerprint: {
    sizeBytes: 1024,
    modifiedUnixMs: 1_700_000_000_000,
    contentHash: null,
  },
  metadata: {
    durationSeconds: 70.171,
    sampleRateHz: 48000,
    channelCount: 2,
    codec: "mp3",
    container: "mp3",
  },
  derivedFrom: null,
  revision: "1",
};

describe("resolveAudioSourceUrl", () => {
  it("converts rust media asset cache paths", () => {
    expect(resolveAudioSourceUrl(mediaAsset, (path) => `asset://${path}`)).toBe(
      "asset:///Users/test/Library/Application Support/open-audition/media/sources/asset-opening.mp3",
    );
  });

  it("ignores non-audio rust media assets", () => {
    expect(resolveAudioSourceUrl({ ...mediaAsset, kind: "Video" })).toBeNull();
  });

  it("ignores browser-readable urls", () => {
    expect(resolveAudioSourceUrl(audioFile, (path) => `asset://${path}`)).toBeNull();
    expect(
      resolveAudioSourceUrl({ ...audioFile, filepath: "http://example.com/opening.mp3" }),
    ).toBeNull();
    expect(resolveAudioSourceUrl({ ...audioFile, filepath: "blob:opening" })).toBeNull();
    expect(resolveAudioSourceUrl({ ...audioFile, filepath: "data:audio/mp3;base64,abc" })).toBeNull();
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

describe("audioSourceDurationSeconds", () => {
  it("reads rust media asset metadata duration", () => {
    expect(audioSourceDurationSeconds(mediaAsset)).toBe(70.171);
  });

  it("reads legacy media file duration", () => {
    expect(audioSourceDurationSeconds({ ...audioFile, durationSeconds: 70.171 })).toBe(70.171);
  });
});
