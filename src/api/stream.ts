import type { Microphone } from "decibri";
import invoke, { NATIVE_COMMAND } from "@/electron/ipc";

const isTranscriptMessage = (
  value: unknown,
): value is { type: "transcript"; text: string } =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "transcript" &&
  typeof (value as { text?: unknown }).text === "string";

export const streamTranscription = async (
  microphone: Microphone,
  onTranscript: (text: string) => void,
): Promise<() => void> => {
  const service = await invoke(NATIVE_COMMAND.GET_LOCAL_SERVICE, undefined);
  if (!service) throw new Error("Local transcription service is unavailable");

  const socket = new WebSocket(
    `ws://${service.host}:${service.port}/transcription`,
  );
  await new Promise<void>((resolve, reject) => {
    const handleOpen = () => {
      socket.removeEventListener("error", handleError);
      resolve();
    };
    const handleError = () => {
      socket.removeEventListener("open", handleOpen);
      reject(new Error("Unable to connect to the local transcription service"));
    };
    socket.addEventListener("open", handleOpen, { once: true });
    socket.addEventListener("error", handleError, { once: true });
  });

  socket.addEventListener("message", ({ data }: MessageEvent<unknown>) => {
    if (typeof data !== "string") return;
    try {
      const message: unknown = JSON.parse(data);
      if (isTranscriptMessage(message)) onTranscript(message.text);
    } catch (error) {
      console.error("Invalid transcription message", error);
    }
  });
  microphone.on("data", (chunk) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(chunk);
  });

  return () => socket.close();
};
