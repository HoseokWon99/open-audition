use std::collections::HashSet;

use super::types::{Effect, Multitrack, MultitrackSemanticIssue};

pub fn validate_multitrack_semantic(multitrack: &Multitrack) -> Vec<MultitrackSemanticIssue> {
    let mut issues = Vec::new();
    let media_asset_ids = multitrack
        .media_assets
        .iter()
        .map(|asset| asset.id.as_str())
        .collect::<HashSet<_>>();

    issues.extend(validate_contiguous_indexes(
        multitrack.tracks.iter().map(|track| track.index).collect(),
        "tracks",
        "track",
    ));

    for (track_position, track) in multitrack.tracks.iter().enumerate() {
        let track_path = format!("tracks[{track_position}]");
        issues.extend(validate_effect_indexes(
            &track.effects,
            &format!("{track_path}.effects"),
        ));

        for (clip_position, clip) in track.clips.iter().enumerate() {
            let clip_path = format!("{track_path}.clips[{clip_position}]");

            if !media_asset_ids.contains(clip.asset_id.as_str()) {
                issues.push(MultitrackSemanticIssue {
                    path: format!("{clip_path}.assetId"),
                    message: format!("Unknown media asset id: {}", clip.asset_id),
                });
            }

            issues.extend(validate_effect_indexes(
                &clip.effects,
                &format!("{clip_path}.effects"),
            ));

            let fade_in_duration = clip
                .fade_in
                .as_ref()
                .map(|fade| fade.duration)
                .unwrap_or(0.0);
            let fade_out_duration = clip
                .fade_out
                .as_ref()
                .map(|fade| fade.duration)
                .unwrap_or(0.0);

            if fade_in_duration + fade_out_duration > clip.duration {
                issues.push(MultitrackSemanticIssue {
                    path: clip_path,
                    message: "Fade-in and fade-out durations must not exceed clip duration"
                        .to_string(),
                });
            }
        }
    }

    issues
}

fn validate_effect_indexes(effects: &[Effect], path: &str) -> Vec<MultitrackSemanticIssue> {
    validate_contiguous_indexes(
        effects.iter().map(|effect| effect.index).collect(),
        path,
        "effect",
    )
}

fn validate_contiguous_indexes(
    indexes: Vec<u32>,
    path: &str,
    label: &str,
) -> Vec<MultitrackSemanticIssue> {
    let mut issues = Vec::new();
    let mut seen_indexes = HashSet::new();

    for index in indexes {
        if seen_indexes.contains(&index) {
            issues.push(MultitrackSemanticIssue {
                path: path.to_string(),
                message: format!("Duplicate {label} index: {index}"),
            });
        }

        seen_indexes.insert(index);
    }

    let mut sorted_indexes = seen_indexes.into_iter().collect::<Vec<_>>();
    sorted_indexes.sort_unstable();

    for (expected_index, actual_index) in sorted_indexes.into_iter().enumerate() {
        if actual_index != expected_index as u32 {
            issues.push(MultitrackSemanticIssue {
                path: path.to_string(),
                message: format!("{label} indexes must be contiguous from 0"),
            });
            break;
        }
    }

    issues
}
