import path from "node:path";
import {
  BrowserWindow,
  type DesktopCapturerSource,
  desktopCapturer,
  ipcMain,
} from "electron";
// 选择器窗口的 HTML（自包含、暗色风格），通过 data URL 加载。
// HTML 内容由 esbuild text loader 在构建时内联为字符串。
import PICKER_HTML from "./picker.html";

// IPC 通道名称
const CHANNEL_SOURCES = "screen-picker:sources";
const CHANNEL_SELECT = "screen-picker:select";
const CHANNEL_CANCEL = "screen-picker:cancel";

// 序列化后的源数据（可安全地跨 contextBridge / 结构化克隆传递）
interface SafeSource {
  id: string;
  name: string;
  display_id?: string;
  thumbnailDataUrl: string;
  appIconDataUrl: string;
}

/**
 * 弹出模态的屏幕/窗口选择器窗口。
 *
 * 返回原始的 `DesktopCapturerSource`（调用方需要传给 getDisplayMedia 的回调）；
 * 若用户取消或关闭窗口则返回 null。
 *
 * 注意：
 * - 同时列出 "screen" 和 "window" 两种源
 * - 始终忽略音频（调用方只接收 video）
 * - 在调用时拉取最新源列表，以反映当前窗口状态
 */
export async function showScreenPicker(
  parent: BrowserWindow,
): Promise<DesktopCapturerSource | null> {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });

  // 转换为纯数据（NativeImage 不能直接通过 IPC 结构化克隆）
  const safeSources: SafeSource[] = sources.map((s) => ({
    id: s.id,
    name: s.name,
    display_id: s.display_id,
    thumbnailDataUrl: s.thumbnail.isEmpty() ? "" : s.thumbnail.toDataURL(),
    appIconDataUrl:
      s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : "",
  }));

  return new Promise<DesktopCapturerSource | null>((resolve) => {
    let settled = false;

    const finish = (result: DesktopCapturerSource | null) => {
      if (settled) return;
      settled = true;
      ipcMain.removeAllListeners(CHANNEL_SELECT);
      ipcMain.removeAllListeners(CHANNEL_CANCEL);
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

    win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(PICKER_HTML)}`,
    );

    // 加载完成后将源数据发送给选择器窗口
    win.webContents.once("did-finish-load", () => {
      if (!win.isDestroyed()) {
        win.webContents.send(CHANNEL_SOURCES, safeSources);
      }
    });

    // 用户点击卡片 → 选中
    ipcMain.once(CHANNEL_SELECT, (_event, id: string) => {
      const matched = sources.find((s) => s.id === id) ?? null;
      finish(matched);
    });

    // 用户点击取消按钮 / 按 ESC
    ipcMain.once(CHANNEL_CANCEL, () => finish(null));

    // 用户关闭窗口（标题栏关闭按钮）
    win.on("closed", () => finish(null));
  });
}
