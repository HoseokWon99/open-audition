import { ResultAsync, errAsync, ok } from "neverthrow";
import { readAssetBytes } from "../../../api/media";
import type { OpenAuditionError } from "../../../types/error";
import type { MediaAsset } from "../../../types/media";

type AssetByteReader = (assetId: string) => Promise<ArrayBuffer>;

interface CreateAudioBufferSourceNodeOptions {
  context: AudioContext;
  source: MediaAsset;
  readAssetBytes?: AssetByteReader;
}

export function createAudioBufferSourceNode({
  context,
  source,
  readAssetBytes: readBytes = readAssetBytes,
}: CreateAudioBufferSourceNodeOptions): ResultAsync<AudioBufferSourceNode, OpenAuditionError> {
  if (source.kind !== "Audio") {
    return errAsync(
      toAudioBufferSourceError(
        "AudioSourceUnsupported",
        `Expected an audio media asset, received ${source.kind}`,
        source,
      ),
    );
  }

  return ResultAsync.fromPromise(readBytes(source.id), (error) =>
    toAudioBufferSourceError("AudioSourceReadFailed", "Failed to read audio asset bytes", error),
  )
    .andThen((bytes) =>
      ResultAsync.fromPromise(context.decodeAudioData(bytes.slice(0)), (error) =>
        toAudioBufferSourceError("AudioSourceDecodeFailed", "Failed to decode audio asset bytes", error),
      ),
    )
    .andThen((buffer) => {
      const sourceNode = context.createBufferSource();
      sourceNode.buffer = buffer;

      return ok(sourceNode);
    });
}

function toAudioBufferSourceError(
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
