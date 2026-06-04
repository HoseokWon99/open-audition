import { describe, expect, it, vi } from "vitest";
import { scheduleClipFadeAutomation } from "./fades";

function createFakeAudioParam(): AudioParam {
  return {
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setValueCurveAtTime: vi.fn(),
  } as unknown as AudioParam;
}

describe("clip fade automation", () => {
  it("schedules linear fade in and fade out around clip playback", () => {
    const gain = createFakeAudioParam();

    scheduleClipFadeAutomation(gain, {
      baseGain: 0.5,
      clipStartTime: 10,
      clipDuration: 5,
      fadeIn: { duration: 0.25, curve: "Linear" },
      fadeOut: { duration: 1, curve: "Linear" },
    });

    expect(gain.cancelScheduledValues).toHaveBeenCalledWith(10);
    expect(gain.setValueAtTime).toHaveBeenCalledWith(0, 10);
    expect(gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.5, 10.25);
    expect(gain.setValueAtTime).toHaveBeenCalledWith(0.5, 14);
    expect(gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 15);
  });
});
