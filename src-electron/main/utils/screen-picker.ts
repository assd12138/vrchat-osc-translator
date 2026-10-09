import path from "node:path";
import {
  BrowserWindow,
  type DesktopCapturerSource,
  desktopCapturer,
  ipcMain,
  type IpcMainEvent,
} from "electron";
import type {
  ScreenPickerData,
  ScreenPickerSelection,
} from "../../shared/screen-picker.types";
// 选择器窗口的 HTML（自包含、暗色风格），通过 data URL 加载。
// HTML 内容由 esbuild text loader 在构建时内联为字符串。
import PICKER_HTML from "./picker.html";

// IPC 通道名称
const CHANNEL_SOURCES = "screen-picker:sources";
const CHANNEL_SELECT = "screen-picker:select";
const CHANNEL_CANCEL = "screen-picker:cancel";

interface ScreenPickerResult {
  source: DesktopCapturerSource;
  shareAudio: boolean;
}

let pickerOpen = false;

/**
 * 弹出模态的屏幕/窗口选择器窗口。
 *
 * 返回共享源和用户是否同意共享系统音频；
 * 若用户取消或关闭窗口则返回 null。
 *
 * 注意：
 * - 同时列出 "screen" 和 "window" 两种源
 * - 只有请求音频时显示共享系统音频选项
 * - 在调用时拉取最新源列表，以反映当前窗口状态
 */
export async function showScreenPicker(
  parent: BrowserWindow,
  audioRequested = false,
): Promise<ScreenPickerResult | null> {
  // 已在采集的流不受影响；只避免两个模态选择器同时打开。
  if (pickerOpen || parent.isDestroyed()) return null;
  pickerOpen = true;
  try {
    return await openScreenPicker(parent, audioRequested);
  } finally {
    pickerOpen = false;
  }
}

async function openScreenPicker(
  parent: BrowserWindow,
  audioRequested: boolean,
): Promise<ScreenPickerResult | null> {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });

  // 转换为纯数据（NativeImage 不能直接通过 IPC 结构化克隆）
  const safeSources = sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnailDataUrl: s.thumbnail.isEmpty() ? "" : s.thumbnail.toDataURL(),
    appIconDataUrl:
      s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : "",
  }));

  if (parent.isDestroyed()) return null;
  return new Promise<ScreenPickerResult | null>((resolve) => {
    let settled = false;

    const finish = (result: ScreenPickerResult | null) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener(CHANNEL_SELECT, handleSelect);
      ipcMain.removeListener(CHANNEL_CANCEL, handleCancel);
      parent.removeListener("closed", handleParentClosed);
      if (!win.isDestroyed()) {
        win.destroy();
      }
      resolve(result);
    };

    const win = new BrowserWindow({
      width: 720,
      height: 560,
      modal: true,
      parent,
      resizable: false,
      minimizable: false,
      maximizable: false,
      autoHideMenuBar: true,
      title: "选择屏幕/窗口",
      webPreferences: {
        preload: path.join(__dirname, "../preload/screen-picker.cjs"),
      },
    });

    void win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(PICKER_HTML)}`,
    ).catch(() => finish(null));

    // 加载完成后将源数据发送给选择器窗口
    win.webContents.once("did-finish-load", () => {
      if (!win.isDestroyed()) {
        const data: ScreenPickerData = { sources: safeSources, audioRequested };
        win.webContents.send(CHANNEL_SOURCES, data);
      }
    });

    // 用户点击卡片 → 选中
    const handleSelect = (event: IpcMainEvent, selection: ScreenPickerSelection) => {
      if (event.sender !== win.webContents || !selection) return;
      const source = sources.find((s) => s.id === selection.id);
      finish(source ? {
        source,
        shareAudio: audioRequested && selection.shareAudio === true,
      } : null);
    };
    ipcMain.on(CHANNEL_SELECT, handleSelect);

    // 用户点击取消按钮 / 按 ESC
    const handleCancel = (event: IpcMainEvent) => {
      if (event.sender === win.webContents) finish(null);
    };
    const handleParentClosed = () => finish(null);
    ipcMain.on(CHANNEL_CANCEL, handleCancel);
    parent.once("closed", handleParentClosed);

    // 用户关闭窗口（标题栏关闭按钮）
    win.on("closed", () => finish(null));
  });
}
