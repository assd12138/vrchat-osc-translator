import type { Microphone } from "decibri";
import invoke, { NATIVE_COMMAND } from "@/electron/ipc";

export interface StreamTranscriptionConfig {
  modelId: string;
  apiKey: string;
  baseURL: string;
  modelType: string;
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

export const streamTranscription = async (
  microphone: Microphone,
  config: StreamTranscriptionConfig,
  onTranscript: (text: string) => void,
): Promise<() => void> => {
  const service = await invoke(NATIVE_COMMAND.GET_LOCAL_SERVICE, undefined);
  if (!service) throw new Error("Local transcription service is unavailable");

  const socket = new WebSocket(
    `ws://${service.host}:${service.port}/transcription`,
  );
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
    };
    const handleOpen = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Unable to connect to the local transcription service"));
    };
    const handleClose = () => {
      cleanup();
      reject(new Error("Local transcription service closed before connecting"));
    };
    socket.addEventListener("open", handleOpen, { once: true });
    socket.addEventListener("error", handleError, { once: true });
    socket.addEventListener("close", handleClose, { once: true });
  });
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
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
      reject(new Error("Unable to initialize the local transcription service"));
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
};
