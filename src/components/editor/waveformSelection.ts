import { clamp } from "../../utils/math";

export interface WaveformSelection {
  startPercent: number;
  endPercent: number;
}

const minSelectionWidthPercent = 0.75;

export function createWaveformSelection(
  anchorPercent: number,
  focusPercent: number,
): WaveformSelection | null {
  const startPercent = clamp(Math.min(anchorPercent, focusPercent), 0, 100);
  const endPercent = clamp(Math.max(anchorPercent, focusPercent), 0, 100);

  if (endPercent - startPercent < minSelectionWidthPercent) {
    return null;
  }

  return { startPercent, endPercent };
}
