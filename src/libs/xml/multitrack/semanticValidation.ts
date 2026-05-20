import type { Effect, MultitrackSemanticIssue, MultitrackSession } from "../../../types/audio";

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

function validatePan(value: number, path: string): MultitrackSemanticIssue[] {
  if (value < -1 || value > 1) {
    return [
      {
        path,
        message: "Pan must be between -1 and 1",
      },
    ];
  }

  return [];
}

function validateEffectIndexes(effects: Effect[], path: string): MultitrackSemanticIssue[] {
  return validateContiguousIndexes(
    effects.map((effect) => effect.index),
    path,
    "effect",
  );
}

export function validateMultitrackSession(
  session: MultitrackSession,
): MultitrackSemanticIssue[] {
  const issues: MultitrackSemanticIssue[] = [];
  const mediaAssetIds = new Set(session.mediaAssets.map((asset) => asset.id));

  issues.push(
    ...validateContiguousIndexes(
      session.tracks.map((track) => track.index),
      "tracks",
      "track",
    ),
  );

  for (const [trackPosition, track] of session.tracks.entries()) {
    const trackPath = `tracks[${trackPosition}]`;

    issues.push(...validatePan(track.pan, `${trackPath}.pan`));
    issues.push(...validateEffectIndexes(track.effects, `${trackPath}.effects`));

    for (const [clipPosition, clip] of track.clips.entries()) {
      const clipPath = `${trackPath}.clips[${clipPosition}]`;

      if (!mediaAssetIds.has(clip.assetId)) {
        issues.push({
          path: `${clipPath}.assetId`,
          message: `Unknown media asset id: ${clip.assetId}`,
        });
      }

      issues.push(...validatePan(clip.pan, `${clipPath}.pan`));
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
