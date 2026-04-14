import path from "node:path";
import { type IpcMainInvokeEvent, shell } from "electron";
import { BrowserWindow, dialog } from "electron/main";
import { generateRandomKey } from "../../utils/common";
import { sendVrchatMessage } from "../../utils/osc";
import { uploadToOss } from "../../utils/oss";

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

export async function uploadOss(
  event: IpcMainInvokeEvent,
  {
    region,
    endpoint,
    ak,
    sk,
    bucket,
  }: {
    region: string;
    endpoint: string;
    ak: string;
    sk: string;
    bucket: string;
  },
) {
  try {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    const dialogResult = await dialog.showOpenDialog(window, {
      properties: ["openFile"],
    });
    const filePath = dialogResult.filePaths[0];
    if (!filePath) return;

    // 提取原有扩展名
    const ext = path.extname(filePath);
    // 生成随机文件名
    const key = generateRandomKey() + ext;

    const res = await uploadToOss({
      filePath,
      config: {
        region,
        endpoint,
        ak,
        sk,
        bucket,
      },
      key,
    });
    if (res.$metadata.httpStatusCode === 200) {
      return key;
    }
    return "";
  } catch (error) {
    console.error(error);
  }
}
