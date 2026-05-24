import type { MediaFile, TimelineClip, TimelineTrack } from "../../types/audio";

interface InspectorProps {
  clip?: TimelineClip;
  sourceFile?: MediaFile;
  track?: TimelineTrack;
}

export function Inspector({ clip, sourceFile, track }: InspectorProps) {
  return (
    <section className="oa-inspector">
      <div className="oa-inspector-title">Inspector</div>
      <div className="oa-inspector-body">
        <div className="oa-section">
          <div className="oa-section-title">Selected Clip</div>
          {clip ? (
            <div className="oa-property-grid">
              <span>Name</span>
              <strong>{clip.name}</strong>
              <span>Track</span>
              <strong>{track?.name ?? "Unknown"}</strong>
              <span>Source</span>
              <strong>{sourceFile?.name ?? "Missing"}</strong>
              <span>Duration</span>
              <strong>{clip.duration}</strong>
              <span>Gain</span>
              <strong>{clip.gainDb >= 0 ? `+${clip.gainDb}` : clip.gainDb} dB</strong>
              <span>Fade In</span>
              <strong>{clip.fadeIn}</strong>
              <span>Fade Out</span>
              <strong>{clip.fadeOut}</strong>
            </div>
          ) : (
            <p className="oa-empty-copy">No clip selected</p>
          )}
        </div>
      </div>
    </section>
  );
}
