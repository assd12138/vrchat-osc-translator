import type { Microphone } from "decibri";
import invoke, { NATIVE_COMMAND } from "@/electron/ipc";
import { ModelType, type StreamModelType } from "@/store/api-config";

const MAX_PENDING_TRANSLATIONS = 2;
const TRANSLATION_TIMEOUT_MS = 10_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 10_000;

export interface StreamTranscriptionConfig {
  modelId: string;
  apiKey: string;
  baseURL: string;
  modelType: StreamModelType;
}

export type PcmAudioData = ArrayBuffer | Int16Array | Float32Array;
export type SubscribePcmAudio = (
  listener: (chunk: PcmAudioData) => void,
) => () => void;

interface StreamTranslationOptions {
  translate: (text: string, signal: AbortSignal) => Promise<string>;
  onTranslation: (translation: string, transcription: string) => void;
}

/** Serializes streamed transcripts while retaining only the newest useful updates. */
export class StreamTranslationProcessor {
  private pending: string[] = [];
  private translating = false;
  private stopped = false;
  private requestController: AbortController | null = null;

  constructor(private readonly options: StreamTranslationOptions) {}

  stop = () => {
    this.stopped = true;
    this.pending = [];
    this.requestController?.abort();
  };

  push(text: string) {
    if (this.stopped) return;
    if (text === "") {
      if (this.pending.length === MAX_PENDING_TRANSLATIONS) {
        this.pending.shift();
      }
      return;
    }

    if (!this.translating) {
      void this.translate(text);
      return;
    }

    if (this.pending.length === 0) {
      this.pending.push(text);
      return;
    }

    if (this.pending.length === 1) {
      if (text.includes(this.pending[0])) {
        this.pending[0] = text;
      } else {
        this.pending.push(text);
      }
      return;
    }

    if (text.includes(this.pending[1])) {
      this.pending[1] = text;
    } else {
      this.pending.shift();
      this.pending.push(text);
    }
  }

  private async translate(text: string) {
    if (this.stopped) return;
    this.translating = true;
    const controller = new AbortController();
    this.requestController = controller;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const translation = await Promise.race([
        this.options.translate(text, controller.signal),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => {
              controller.abort();
              reject(new Error("Stream translation timed out"));
            },
            TRANSLATION_TIMEOUT_MS,
          );
        }),
      ]);
      if (!this.stopped) {
        this.options.onTranslation(translation, text);
      }
    } catch (error) {
      if (!this.stopped) console.error("Stream translation failed", error);
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
      if (this.requestController === controller) this.requestController = null;
      this.translating = false;
      const next = this.pending.shift();
      if (!this.stopped && next !== undefined) void this.translate(next);
    }
  }
}

const isTranscriptMessage = (
  value: unknown,
): value is { type: "transcript"; text: string } =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "transcript" &&
  typeof (value as { text?: unknown }).text === "string";

const isReadyMessage = (value: unknown): value is { type: "ready" } =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "ready";

const isDoneMessage = (value: unknown): value is { type: "done" } =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "done";

const isErrorMessage = (
  value: unknown,
): value is { type: "error"; message: string } =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "error" &&
  typeof (value as { message?: unknown }).message === "string";

/** 将任意 PCM 数据源接入现有本地转写通道，包括连接配置和断线重连。 */
export const streamPcmTranscription = async ({
  subscribeAudio,
  config,
  onTranscript,
  signal,
}: {
  subscribeAudio: SubscribePcmAudio;
  config: StreamTranscriptionConfig;
  onTranscript: (text: string) => void;
  signal?: AbortSignal;
}): Promise<() => void> => {
  const service = await invoke(NATIVE_COMMAND.GET_LOCAL_SERVICE, undefined);
  if (!service) throw new Error("Local transcription service is unavailable");

  const socketURL = `ws://${service.host}:${service.port}/transcription`;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let reconnecting = false;
  let stopped = false;
  let unsubscribeAudio: (() => void) | null = null;
  let finishTimer: ReturnType<typeof setTimeout> | null = null;
  const socketCleanups = new WeakMap<WebSocket, () => void>();

  const createAbortError = () => new DOMException("Aborted", "AbortError");

  const closeSocket = (target: WebSocket | null) => {
    if (!target) return;
    socketCleanups.get(target)?.();
    socketCleanups.delete(target);
    if (
      target.readyState === WebSocket.CONNECTING ||
      target.readyState === WebSocket.OPEN
    ) {
      target.close();
    }
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer === null) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const handleAudioData = (chunk: PcmAudioData) => {
    const activeSocket = socket;
    if (
      stopped ||
      !activeSocket ||
      activeSocket.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    try {
      activeSocket.send(chunk);
    } catch (error) {
      handleConnectionFailure(activeSocket, error);
    }
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearReconnectTimer();
    signal?.removeEventListener("abort", handleAbort);
    unsubscribeAudio?.();
    unsubscribeAudio = null;

    const activeSocket = socket;
    if (
      config.modelType === ModelType.AUDIO_CPP_LIVE &&
      activeSocket?.readyState === WebSocket.OPEN
    ) {
      try {
        activeSocket.send(JSON.stringify({ type: "transcription.finish" }));
      } catch {
        socket = null;
        closeSocket(activeSocket);
        return;
      }
      // 服务端未返回 done 时也要释放 socket，避免停止后的会话残留。
      finishTimer = setTimeout(() => {
        finishTimer = null;
        if (socket === activeSocket) socket = null;
        closeSocket(activeSocket);
      }, 5_000);
      return;
    }
    socket = null;
    closeSocket(activeSocket);
  };

  function handleAbort() {
    stop();
  }

  const scheduleReconnect = (reason: unknown) => {
    if (stopped || reconnectTimer !== null) return;

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt,
      RECONNECT_MAX_DELAY_MS,
    );
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void reconnect();
    }, delay);

    console.error("Streaming transcription socket disconnected", reason);
  };

  const handleConnectionFailure = (
    failedSocket: WebSocket,
    reason: unknown,
  ) => {
    if (socket !== failedSocket) return;
    socket = null;
    closeSocket(failedSocket);
    if (!stopped) scheduleReconnect(reason);
  };

  const connectSocket = async () => {
    if (stopped || signal?.aborted) throw createAbortError();

    const nextSocket = new WebSocket(socketURL);
    socket = nextSocket;

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const cleanup = () => {
          nextSocket.removeEventListener("open", handleOpen);
          nextSocket.removeEventListener("message", handleMessage);
          nextSocket.removeEventListener("error", handleError);
          nextSocket.removeEventListener("close", handleClose);
          signal?.removeEventListener("abort", handleAbortDuringConnect);
        };

        const fail = (error: unknown) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(error);
        };

        function handleOpen() {
          try {
            nextSocket.send(
              JSON.stringify({ type: "transcription.configure", config }),
            );
          } catch (error) {
            fail(error);
          }
        }

        function handleMessage({ data }: MessageEvent<unknown>) {
          if (typeof data !== "string") return;
          try {
            const message: unknown = JSON.parse(data);
            if (isReadyMessage(message)) {
              settled = true;
              cleanup();
              resolve();
            } else if (isErrorMessage(message)) {
              fail(new Error(message.message));
            }
          } catch (error) {
            fail(error);
          }
        }

        function handleError() {
          fail(
            new Error("Unable to connect to the local transcription service"),
          );
        }

        function handleClose() {
          fail(
            new Error("Local transcription service closed before connecting"),
          );
        }

        function handleAbortDuringConnect() {
          fail(createAbortError());
        }

        nextSocket.addEventListener("open", handleOpen, { once: true });
        nextSocket.addEventListener("message", handleMessage);
        nextSocket.addEventListener("error", handleError, { once: true });
        nextSocket.addEventListener("close", handleClose, { once: true });
        signal?.addEventListener("abort", handleAbortDuringConnect, {
          once: true,
        });
      });

      if (stopped || signal?.aborted || socket !== nextSocket) {
        throw createAbortError();
      }

      const handleMessage = ({ data }: MessageEvent<unknown>) => {
        if (typeof data !== "string") return;
        try {
          const message: unknown = JSON.parse(data);
          if (isTranscriptMessage(message) && !signal?.aborted) {
            onTranscript(message.text);
          } else if (isDoneMessage(message)) {
            if (finishTimer !== null) {
              clearTimeout(finishTimer);
              finishTimer = null;
            }
            if (socket === nextSocket) socket = null;
            closeSocket(nextSocket);
            if (!stopped) scheduleReconnect("Transcription stream finished");
          } else if (isErrorMessage(message)) {
            handleConnectionFailure(nextSocket, new Error(message.message));
          }
        } catch (error) {
          console.error("Invalid transcription message", error);
        }
      };
      const handleError = () => {
        handleConnectionFailure(
          nextSocket,
          new Error("Unable to continue the local transcription service"),
        );
      };
      const handleClose = () => {
        handleConnectionFailure(
          nextSocket,
          new Error("Local transcription service closed during transcription"),
        );
      };

      socketCleanups.set(nextSocket, () => {
        nextSocket.removeEventListener("message", handleMessage);
        nextSocket.removeEventListener("error", handleError);
        nextSocket.removeEventListener("close", handleClose);
      });
      nextSocket.addEventListener("message", handleMessage);
      nextSocket.addEventListener("error", handleError);
      nextSocket.addEventListener("close", handleClose);
    } catch (error) {
      if (socket === nextSocket) socket = null;
      closeSocket(nextSocket);
      throw error;
    }
  };

  const reconnect = async () => {
    if (stopped || reconnecting) return;
    reconnecting = true;
    try {
      await connectSocket();
      if (!socket) throw new Error("Streaming transcription socket closed");
      reconnectAttempt = 0;
    } catch (error) {
      if (!stopped) scheduleReconnect(error);
    } finally {
      reconnecting = false;
    }
  };

  signal?.addEventListener("abort", handleAbort, { once: true });

  try {
    await connectSocket();
    unsubscribeAudio = subscribeAudio(handleAudioData);
    if (stopped || signal?.aborted) {
      unsubscribeAudio();
      unsubscribeAudio = null;
      throw createAbortError();
    }
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
};

/** 麦克风适配器保留原调用方式，底层传输与字幕共享 PCM 转写通道。 */
export const streamTranscription = ({
  microphone,
  ...options
}: {
  microphone: Microphone;
  config: StreamTranscriptionConfig;
  onTranscript: (text: string) => void;
  signal?: AbortSignal;
}): Promise<() => void> =>
  streamPcmTranscription({
    ...options,
    subscribeAudio: (listener) => {
      microphone.on("data", listener);
      return () => {
        microphone.off("data", listener);
      };
    },
  });
