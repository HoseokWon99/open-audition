import type { Effect, MultitrackSemanticIssue, Multitrack, Track } from "../../../types/audio";

export function validateMultitrackSemantic(
  session: Multitrack,
): MultitrackSemanticIssue[] {
  const issues: MultitrackSemanticIssue[] = [];
  const mediaAssetIds = new Set(session.mediaAssets.map((asset) => asset.id));

  issues.push(...validateTracksSemantic(session.tracks));

  for (const [trackPosition, track] of session.tracks.entries()) {
    const trackPath = `tracks[${trackPosition}]`;

    issues.push(...validateEffectIndexes(track.effects, `${trackPath}.effects`));

    for (const [clipPosition, clip] of track.clips.entries()) {
      const clipPath = `${trackPath}.clips[${clipPosition}]`;

      if (!mediaAssetIds.has(clip.assetId)) {
        issues.push({
          path: `${clipPath}.assetId`,
          message: `Unknown media asset id: ${clip.assetId}`,
        });
      }

      issues.push(...validateEffectIndexes(clip.effects, `${clipPath}.effects`));

      const fadeInDuration = clip.fadeIn?.duration ?? 0;
      const fadeOutDuration = clip.fadeOut?.duration ?? 0;

      if (fadeInDuration + fadeOutDuration > clip.duration) {
        issues.push({
          path: clipPath,
          message: "Fade-in and fade-out durations must not exceed clip duration",
        });
      }
    }
  }

  return issues;
}

function validateTracksSemantic(tracks: Track[]): MultitrackSemanticIssue[] {
  return validateContiguousIndexes(
      tracks.map((track) => track.index),
      "tracks",
      "track",
  );
}

function validateContiguousIndexes(
    indexes: number[],
    path: string,
    label: string,
): MultitrackSemanticIssue[] {
  const issues: MultitrackSemanticIssue[] = [];
  const seenIndexes = new Set<number>();

  for (const index of indexes) {
    if (seenIndexes.has(index)) {
      issues.push({
        path,
        message: `Duplicate ${label} index: ${index}`,
      });
    }

    seenIndexes.add(index);
  }

  const sortedIndexes = [...seenIndexes].sort((a, b) => a - b);

  for (let expectedIndex = 0; expectedIndex < sortedIndexes.length; expectedIndex += 1) {
    if (sortedIndexes[expectedIndex] !== expectedIndex) {
      issues.push({
        path,
        message: `${label} indexes must be contiguous from 0`,
      });
      break;
    }
  }

  return issues;
}

function validateEffectIndexes(effects: Effect[], path: string): MultitrackSemanticIssue[] {
  return validateContiguousIndexes(
      effects.map((effect) => effect.index),
      path,
      "effect",
  );
}

function isContinuous(nums: number[]): boolean {
  return nums.toSorted().every((num, i) => num === i);
}
