export interface PeakFrame {
  min: number;
  max: number;
}

export interface Peak {
  sampleRateHz: number;
  channelCount: number;
  samplesPerPeak: number;
  sourceFrameCount: bigint;
  frames: PeakFrame[];
}
