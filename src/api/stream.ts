import type { Microphone } from "decibri";
import { translateText } from "@/api/commonRouter";
import { resolveModel } from "@/api/provider";
import invoke, { NATIVE_COMMAND } from "@/electron/ipc";
import { ModelType } from "@/store/api-config";
import store from "@/store/store";
import { extractLanguagesFromTemplate } from "@/utils";
import { sendToVrcChat } from "@/utils/vrc-chat-queue";

const MAX_PENDING_TRANSLATIONS = 2;
const TRANSLATION_TIMEOUT_MS = 10_000;
const VRCHAT_MAX_CHARACTERS = 140;

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
      resolved.model.type === ModelType.CHAT_COMPLETION &&
        resolved.model.capabilities.tools &&
        !apiConfig.batchTranslate,
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

  const socket = new WebSocket(
    `ws://${service.host}:${service.port}/transcription`,
  );
  try {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        socket.removeEventListener("open", handleOpen);
        socket.removeEventListener("error", handleError);
        socket.removeEventListener("close", handleClose);
        signal?.removeEventListener("abort", handleAbort);
      };
      const handleAbort = () => {
        cleanup();
        socket.close();
        reject(new DOMException("Aborted", "AbortError"));
      };
      const handleOpen = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(
          new Error("Unable to connect to the local transcription service"),
        );
      };
      const handleClose = () => {
        cleanup();
        reject(
          new Error("Local transcription service closed before connecting"),
        );
      };
      socket.addEventListener("open", handleOpen, { once: true });
      socket.addEventListener("error", handleError, { once: true });
      socket.addEventListener("close", handleClose, { once: true });
      signal?.addEventListener("abort", handleAbort, { once: true });
    });
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        socket.removeEventListener("message", handleMessage);
        socket.removeEventListener("error", handleError);
        socket.removeEventListener("close", handleClose);
        signal?.removeEventListener("abort", handleAbort);
      };
      const handleAbort = () => {
        cleanup();
        socket.close();
        reject(new DOMException("Aborted", "AbortError"));
      };
      const handleMessage = ({ data }: MessageEvent<unknown>) => {
        if (typeof data !== "string") return;
        try {
          const message: unknown = JSON.parse(data);
          if (isReadyMessage(message)) {
            cleanup();
            resolve();
          } else if (isErrorMessage(message)) {
            cleanup();
            reject(new Error(message.message));
          }
        } catch (error) {
          cleanup();
          reject(error);
        }
      };
      const handleError = () => {
        cleanup();
        reject(
          new Error("Unable to initialize the local transcription service"),
        );
      };
      const handleClose = () => {
        cleanup();
        reject(
          new Error("Local transcription service closed during initialization"),
        );
      };
      socket.addEventListener("message", handleMessage);
      socket.addEventListener("error", handleError, { once: true });
      socket.addEventListener("close", handleClose, { once: true });
      signal?.addEventListener("abort", handleAbort, { once: true });
      socket.send(JSON.stringify({ type: "transcription.configure", config }));
    });

    socket.addEventListener("message", ({ data }: MessageEvent<unknown>) => {
      if (typeof data !== "string") return;
      try {
        const message: unknown = JSON.parse(data);
        if (isTranscriptMessage(message)) onTranscript(message.text);
        else if (isErrorMessage(message)) console.error(message.message);
      } catch (error) {
        console.error("Invalid transcription message", error);
      }
    });
    microphone.on("data", (chunk) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(chunk);
    });

    return () => socket.close();
  } catch (error) {
    socket.close();
    throw error;
  }
};
