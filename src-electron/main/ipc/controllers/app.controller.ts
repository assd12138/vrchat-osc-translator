import { type IpcMainInvokeEvent, shell } from "electron";
import { getLocalService as getDiscoveredLocalService } from "../../utils/local-service-discovery";
import { sendVrchatMessage } from "../../utils/osc";

export function openExternal(_event: IpcMainInvokeEvent, url: string) {
  return shell.openExternal(url);
}

export function getLocalService(_event: IpcMainInvokeEvent) {
  return getDiscoveredLocalService();
}

export function sendToVrcChat(
  _event: IpcMainInvokeEvent,
  args: { text: string },
) {
  return sendVrchatMessage(args);
}
