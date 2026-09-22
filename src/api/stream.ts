import type { Microphone } from "decibri";
import { canUseTranslationTool, translateText } from "@/api/commonRouter";
import { resolveModel } from "@/api/provider";
import invoke, { NATIVE_COMMAND } from "@/electron/ipc";
import store from "@/store/store";
import { extractLanguagesFromTemplate } from "@/utils";
import { sendToVrcChat } from "@/utils/vrc-chat-queue";

const MAX_PENDING_TRANSLATIONS = 2;
const TRANSLATION_TIMEOUT_MS = 10_000;
const VRCHAT_MAX_CHARACTERS = 140;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 10_000;

export interface StreamTranscriptionConfig {
  modelId: string;
  apiKey: string;
  baseURL: string;
  modelType: string;
}

/** Serializes streamed transcripts while retaining only the newest useful updates. */
export class StreamTranslationProcessor {
  private pending: string[] = [];
  private translating = false;

  push(text: string) {
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
    this.translating = true;
    try {
      const translation = await Promise.race([
        this.translateText(text),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Stream translation timed out")),
            TRANSLATION_TIMEOUT_MS,
          );
        }),
      ]);
      sendToVrcChat(translation);
    } catch (error) {
      console.error("Stream translation failed", error);
    } finally {
      this.translating = false;
      const next = this.pending.shift();
      if (next !== undefined) void this.translate(next);
    }
  }

  private translateText(text: string): Promise<string> {
    const { apiConfig, outputTemplate } = store.getState().settings;
    const languages = extractLanguagesFromTemplate(outputTemplate);
    const maxChar = Math.ceil(VRCHAT_MAX_CHARACTERS / languages.length);
    const resolved = resolveModel(apiConfig, "translation");

    return translateText(
      resolved,
      text.slice(0, maxChar),
      canUseTranslationTool(resolved.model, apiConfig.batchTranslate),
      outputTemplate,
      languages,
    );
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

const isErrorMessage = (
  value: unknown,
): value is { type: "error"; message: string } =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "error" &&
  typeof (value as { message?: unknown }).message === "string";

export const streamTranscription = async ({
  microphone,
  config,
  onTranscript,
  signal,
}: {
  microphone: Microphone;
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

  const handleMicrophoneData = (chunk: Int16Array | Float32Array) => {
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
    microphone.off("data", handleMicrophoneData);

    const activeSocket = socket;
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
    if (stopped || socket !== failedSocket) return;
    socket = null;
    closeSocket(failedSocket);
    scheduleReconnect(reason);
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
          if (isTranscriptMessage(message)) {
            onTranscript(message.text);
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
    microphone.on("data", handleMicrophoneData);
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
};
