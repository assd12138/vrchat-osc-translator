import { BrowserWindow, type IpcMainInvokeEvent, shell } from "electron";
import type { WindowAction } from "../../../shared/window.types";
import { getLocalService as getDiscoveredLocalService } from "../../utils/local-service-discovery";
import { sendVrchatMessage } from "../../utils/osc";
import { showSubtitleWindow } from "../../utils/subtitle-window";

export function getWindowState(event: IpcMainInvokeEvent) {
  const window = BrowserWindow.fromWebContents(event.sender);
  return {
    platform: process.platform,
    maximized: window?.isMaximized() ?? false,
  };
}

export function controlWindow(
  event: IpcMainInvokeEvent,
  args: { action: WindowAction },
) {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) return;
  switch (args?.action) {
    case "minimize":
      window.minimize();
      break;
    case "toggle-maximize":
      if (window.isMaximized()) window.unmaximize();
      else window.maximize();
      break;
    case "close":
      window.close();
      break;
  }
}

export async function openSubtitleWindow(event: IpcMainInvokeEvent) {
  const owner = BrowserWindow.fromWebContents(event.sender);
  if (!owner || owner.isDestroyed()) {
    throw new Error("Subtitle window owner is unavailable");
  }
  await showSubtitleWindow(owner);
}

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
