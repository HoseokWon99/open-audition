import { describe, expect, it, vi } from "vitest";
import { createAudioBufferSourceNode } from "./audioBufferSource";
import type { MediaAsset } from "../../../types/media";

const audioAsset: MediaAsset = {
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

function createFakeAudioContext() {
  const audioBuffer = { duration: 70.171 } as AudioBuffer;
  const sourceNode = { buffer: null } as AudioBufferSourceNode;

  return {
    audioBuffer,
    context: {
      createBufferSource: vi.fn(() => sourceNode),
      decodeAudioData: vi.fn(async () => audioBuffer),
    } as unknown as AudioContext,
    sourceNode,
  };
}

describe("createAudioBufferSourceNode", () => {
  it("reads a rust media asset, decodes it, and assigns the decoded buffer to a source node", async () => {
    const bytes = new ArrayBuffer(8);
    const readAssetBytes = vi.fn(async () => bytes);
    const { audioBuffer, context, sourceNode } = createFakeAudioContext();

    const result = await createAudioBufferSourceNode({
      context,
      readAssetBytes,
      source: audioAsset,
    });

    expect(result.isOk()).toBe(true);
    expect(readAssetBytes).toHaveBeenCalledWith("asset-opening");
    expect(context.decodeAudioData).toHaveBeenCalledWith(bytes.slice(0));
    expect(context.createBufferSource).toHaveBeenCalledOnce();
    expect(sourceNode.buffer).toBe(audioBuffer);
  });

  it("rejects non-audio assets before reading bytes", async () => {
    const readAssetBytes = vi.fn(async () => new ArrayBuffer(8));
    const { context } = createFakeAudioContext();

    const result = await createAudioBufferSourceNode({
      context,
      readAssetBytes,
      source: { ...audioAsset, kind: "Video" },
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("AudioSourceUnsupported");
    expect(readAssetBytes).not.toHaveBeenCalled();
  });

  it("maps byte read failures to an OpenAuditionError", async () => {
    const readAssetBytes = vi.fn(async () => {
      throw new Error("asset missing");
    });
    const { context } = createFakeAudioContext();

    const result = await createAudioBufferSourceNode({
      context,
      readAssetBytes,
      source: audioAsset,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("AudioSourceReadFailed");
  });

  it("maps decode failures to an OpenAuditionError", async () => {
    const readAssetBytes = vi.fn(async () => new ArrayBuffer(8));
    const context = {
      createBufferSource: vi.fn(),
      decodeAudioData: vi.fn(async () => {
        throw new Error("decode failed");
      }),
    } as unknown as AudioContext;

    const result = await createAudioBufferSourceNode({
      context,
      readAssetBytes,
      source: audioAsset,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("AudioSourceDecodeFailed");
  });
});
