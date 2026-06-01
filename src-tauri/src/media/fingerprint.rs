use anyhow::Result;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

use super::types::FileFingerprint;

pub fn fingerprint_file(path: &Path) -> Result<FileFingerprint> {
    let metadata = fs::metadata(path)?;
    let modified_unix_ms = metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis());

    Ok(FileFingerprint {
        size_bytes: metadata.len(),
        modified_unix_ms,
        content_hash: None,
    })
}

#[cfg(test)]
mod tests {
    use super::fingerprint_file;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_file_path(name: &str) -> std::path::PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("open-audition-{name}-{stamp}"))
    }

    #[test]
    fn fingerprints_file_size() {
        let path = test_file_path("fingerprint-size");
        fs::write(&path, b"abcdef").expect("test file should be written");

        let fingerprint = fingerprint_file(&path).expect("fingerprint should be created");

        assert_eq!(fingerprint.size_bytes, 6);
        assert!(fingerprint.modified_unix_ms.is_some());
        assert_eq!(fingerprint.content_hash, None);

        fs::remove_file(path).expect("test file should be removed");
    }
}
