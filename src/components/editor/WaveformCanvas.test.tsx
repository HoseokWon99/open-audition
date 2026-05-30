// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WaveformCanvas } from "./WaveformCanvas";
import type { MediaFile } from "../../types/audio";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type WaveSurferEvent = "ready" | "error" | "play" | "pause" | "finish" | "timeupdate" | "destroy";
type WaveSurferHandler = (...args: unknown[]) => void;

const { MockWaveSurfer } = vi.hoisted(() => {
  class MockWaveSurfer {
    static instances: MockWaveSurfer[] = [];

    readonly destroy = vi.fn();
    readonly pause = vi.fn();
    readonly play = vi.fn(() => Promise.resolve());
    readonly setTime = vi.fn();
    readonly stop = vi.fn();
    private currentTime = 0;
    private readonly handlers = new Map<WaveSurferEvent, WaveSurferHandler[]>();

    constructor() {
      MockWaveSurfer.instances.push(this);
    }

    on(event: WaveSurferEvent, handler: WaveSurferHandler) {
      const eventHandlers = this.handlers.get(event) ?? [];
      eventHandlers.push(handler);
      this.handlers.set(event, eventHandlers);

      return () => {
        this.handlers.set(
          event,
          (this.handlers.get(event) ?? []).filter((candidate) => candidate !== handler),
        );
      };
    }

    emit(event: WaveSurferEvent, ...args: unknown[]) {
      if (event === "timeupdate" && typeof args[0] === "number") {
        this.currentTime = args[0];
      }

      for (const handler of this.handlers.get(event) ?? []) {
        handler(...args);
      }
    }

    getCurrentTime() {
      return this.currentTime;
    }
  }

  return { MockWaveSurfer };
});

vi.mock("@wavesurfer/react", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    useWavesurfer(options: { container: React.RefObject<HTMLDivElement | null> }) {
      const [wavesurfer, setWavesurfer] =
        React.useState<InstanceType<typeof MockWaveSurfer> | null>(null);
      const [isReady, setIsReady] = React.useState(false);
      const [isPlaying, setIsPlaying] = React.useState(false);
      const [currentTime, setCurrentTime] = React.useState(0);

      React.useEffect(() => {
        if (!options.container.current) {
          return;
        }

        const instance = new MockWaveSurfer();
        const unsubscribers = [
          instance.on("ready", () => setIsReady(true)),
          instance.on("play", () => setIsPlaying(true)),
          instance.on("pause", () => setIsPlaying(false)),
          instance.on("finish", () => setIsPlaying(false)),
          instance.on("timeupdate", () => setCurrentTime(instance.getCurrentTime())),
          instance.on("destroy", () => {
            setIsReady(false);
            setIsPlaying(false);
          }),
        ];

        setWavesurfer(instance);

        return () => {
          unsubscribers.forEach((unsubscribe) => unsubscribe());
          instance.destroy();
          setWavesurfer(null);
        };
      }, [options]);

      return { currentTime, isPlaying, isReady, wavesurfer };
    },
  };
});

const file: MediaFile = {
  id: "mola",
  name: "mola mola.mp3",
  duration: "3:02.531",
  durationSeconds: 182.531,
  sampleRate: "48000 Hz",
  sampleRateHz: 48000,
  channels: "Stereo",
  channelCount: 2,
  sourceFormat: "MP3 192 Kbps",
  mediaType: "Audio",
  filepath: "/Users/hoseok/Desktop/music/mola mola.mp3",
};

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

describe("WaveformCanvas", () => {
  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    MockWaveSurfer.instances = [];
    vi.clearAllMocks();
  });

  it("reports real duration when wavesurfer becomes ready", async () => {
    const onReady = vi.fn();
    renderWaveform({ onReady });

    await act(async () => {
      MockWaveSurfer.instances[0].emit("ready", 182.531);
    });

    expect(onReady).toHaveBeenCalledWith(182.531);
  });

  it("converts a playhead drag to seconds", () => {
    const onSeek = vi.fn();
    renderWaveform({ file: { ...file, durationSeconds: 100 }, onSeek });

    const content = container?.querySelector<HTMLElement>(".oa-wave-grid-content");
    const playhead = container?.querySelector<HTMLElement>(".oa-wave-playhead");

    if (!content || !playhead) {
      throw new Error("Expected waveform content and playhead to render");
    }

    content.getBoundingClientRect = () =>
      ({
        bottom: 20,
        height: 20,
        left: 0,
        right: 100,
        top: 0,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    act(() => {
      playhead.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 25 }));
    });

    expect(onSeek).toHaveBeenCalledWith(25);
  });

  it("destroys the previous wavesurfer instance when the file changes", () => {
    renderWaveform({ file });
    const firstInstance = MockWaveSurfer.instances[0];

    act(() => {
      root?.render(
        <WaveformCanvas
          file={{ ...file, id: "opening", filepath: "/Users/hoseok/Desktop/music/opening.mp3" }}
          onControllerChange={vi.fn()}
          onReady={vi.fn()}
          onSeek={vi.fn()}
          onTimeUpdate={vi.fn()}
          playheadSeconds={0}
        />,
      );
    });

    expect(firstInstance.destroy).toHaveBeenCalled();
    expect(MockWaveSurfer.instances).toHaveLength(2);
  });
});

function renderWaveform({
  file: nextFile = file,
  onControllerChange = vi.fn(),
  onReady = vi.fn(),
  onSeek = vi.fn(),
  onTimeUpdate = vi.fn(),
  playheadSeconds = 0,
}: {
  file?: MediaFile;
  onControllerChange?: (controller: unknown) => void;
  onReady?: (durationSeconds: number) => void;
  onSeek?: (seconds: number) => void;
  onTimeUpdate?: (seconds: number) => void;
  playheadSeconds?: number;
}) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <WaveformCanvas
        file={nextFile}
        onControllerChange={onControllerChange}
        onReady={onReady}
        onSeek={onSeek}
        onTimeUpdate={onTimeUpdate}
        playheadSeconds={playheadSeconds}
      />,
    );
  });
}
