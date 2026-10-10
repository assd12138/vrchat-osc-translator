import processorUrl from "./subtitle-audio.worklet.js?url";

export interface SubtitleAudioChunk {
  pcm: ArrayBuffer;
  sampleRate: number;
  channels: 1;
  format: "pcm_s16le";
  rms: number;
  peak: number;
}

export class DisplayAudioUnavailableError extends Error {
  constructor() {
    super("No live system audio track was returned");
  }
}

interface DisplayAudioCaptureOptions {
  signal: AbortSignal;
  onChunk: (chunk: SubtitleAudioChunk) => void;
  onEnded: () => void;
  onError: (error: Error) => void;
}

/** 由 Electron 自动授权系统音频，重采样为 16 kHz 单声道 PCM，每 100ms 输出一块。 */
export async function startDisplayAudioCapture({
  signal,
  onChunk,
  onEnded,
  onError,
}: DisplayAudioCaptureOptions): Promise<void> {
  if (signal.aborted) throw new DOMException("Capture cancelled", "AbortError");
  // getDisplayMedia 必须包含视频；保留视频轨以维持共享会话，但不解析画面。
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 1 }, width: { ideal: 320 }, height: { ideal: 180 } },
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
    systemAudio: "include",
    windowAudio: "system",
  } as DisplayMediaStreamOptions);

  let stopped = false;
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: AudioWorkletNode | null = null;
  const tracks = stream.getTracks();

  const stop = () => {
    if (stopped) return;
    stopped = true;
    signal.removeEventListener("abort", stop);
    for (const track of tracks) {
      track.removeEventListener("ended", handleEnded);
      track.stop();
    }
    source?.disconnect();
    if (processor) {
      processor.port.onmessage = null;
      processor.onprocessorerror = null;
      processor.disconnect();
      processor.port.close();
    }
    if (context && context.state !== "closed") {
      void context.close().catch(() => {});
    }
  };
  const handleEnded = () => {
    if (stopped) return;
    stop();
    onEnded();
  };
  const checkActive = () => {
    if (signal.aborted || stopped) {
      throw new DOMException("Capture cancelled", "AbortError");
    }
  };

  try {
    checkActive();
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.some((track) => track.readyState === "live")) {
      throw new DisplayAudioUnavailableError();
    }
    signal.addEventListener("abort", stop, { once: true });
    for (const track of tracks) track.addEventListener("ended", handleEnded);

    context = new AudioContext({ sampleRate: 16000, latencyHint: "interactive" });
    const sampleRate = context.sampleRate;
    await context.audioWorklet.addModule(processorUrl);
    checkActive();
    source = context.createMediaStreamSource(new MediaStream(audioTracks));
    processor = new AudioWorkletNode(context, "subtitle-audio-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { chunkFrames: Math.round(sampleRate / 10) },
    });
    processor.port.onmessage = (
      event: MessageEvent<{ pcm: ArrayBuffer; rms: number; peak: number }>,
    ) => {
      if (!stopped) {
        onChunk({ ...event.data, sampleRate, channels: 1, format: "pcm_s16le" });
      }
    };
    processor.onprocessorerror = () => {
      if (stopped) return;
      stop();
      onError(new Error("System audio processing failed"));
    };
    source.connect(processor);
    // 连接静音输出使 AudioWorklet 持续处理，原始声音不回放到扬声器。
    processor.connect(context.destination);
    await context.resume();
    checkActive();
    if (!audioTracks.some((track) => track.readyState === "live")) {
      throw new DisplayAudioUnavailableError();
    }
  } catch (error) {
    stop();
    throw error;
  }
}
