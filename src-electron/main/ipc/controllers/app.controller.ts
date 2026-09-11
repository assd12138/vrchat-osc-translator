import { type IpcMainInvokeEvent, shell } from "electron";
import { sendVrchatMessage } from "../../utils/osc";

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
