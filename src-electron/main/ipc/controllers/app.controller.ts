import { type IpcMainInvokeEvent, shell } from "electron";
import { sendVrchatMessage } from "../../utils/osc";
import { initRecognizer } from "../../utils/sherpa";

export async function openExternal(_event: IpcMainInvokeEvent, url: string) {
  await shell.openExternal(url);
}

export function sendToVrcChat(
  _event: IpcMainInvokeEvent,
  args: { text: string },
) {
  try {
    sendVrchatMessage(args);
    return;
  } catch (error) {
    console.error("Failed to send OSC message:", error);
    throw error;
  }
}

export function initSherpaTranscription(
  _event: IpcMainInvokeEvent,
  args: { modelPath: string },
) {
  initRecognizer(args);
}
