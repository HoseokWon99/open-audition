use std::path::Path;

use super::types::MediaKind;

pub fn detect_media_kind(path: &Path) -> MediaKind {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    match extension.as_str() {
        "wav" | "wave" | "mp3" | "aiff" | "aif" | "flac" | "ogg" | "m4a" => MediaKind::Audio,
        "mp4" | "mov" | "mkv" | "webm" | "avi" => MediaKind::Video,
        "oasx" | "xml" => MediaKind::Xml,
        _ => MediaKind::Unknown,
    }
}

pub fn extension_suffix(path: &Path) -> String {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|extension| format!(".{}", extension.to_ascii_lowercase()))
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::{detect_media_kind, extension_suffix};
    use crate::media::types::MediaKind;
    use std::path::Path;

    #[test]
    fn detects_common_media_extensions() {
        assert_eq!(detect_media_kind(Path::new("cue.wav")), MediaKind::Audio);
        assert_eq!(
            detect_media_kind(Path::new("capture.MOV")),
            MediaKind::Video
        );
        assert_eq!(detect_media_kind(Path::new("session.oasx")), MediaKind::Xml);
        assert_eq!(
            detect_media_kind(Path::new("notes.txt")),
            MediaKind::Unknown
        );
    }

    #[test]
    fn creates_lowercase_extension_suffix() {
        assert_eq!(extension_suffix(Path::new("capture.MOV")), ".mov");
        assert_eq!(extension_suffix(Path::new("README")), "");
    }
}
