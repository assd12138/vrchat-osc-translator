import path from "node:path";
import { BrowserWindow, type IpcMainEvent, ipcMain, screen } from "electron";

let subtitleWindow: BrowserWindow | null = null;

/** 管理字幕窗口的原生生命周期；内容和样式配置由字幕路由管理。 */
export async function showSubtitleWindow(owner: BrowserWindow): Promise<void> {
  if (subtitleWindow && !subtitleWindow.isDestroyed()) {
    if (subtitleWindow.isVisible()) {
      subtitleWindow.focus();
    }
    return;
  }

  const area = screen.getDisplayMatching(owner.getBounds()).workArea;
  const width = Math.min(860, area.width);
  const height = Math.min(156, area.height);
  const minWidth = Math.min(320, area.width);
  const minHeight = Math.min(140, area.height);
  const win = new BrowserWindow({
    width,
    height,
    x: area.x + Math.round((area.width - width) / 2),
    y: Math.max(area.y, area.y + area.height - height - 48),
    title: "字幕弹窗",
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    roundedCorners: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    minWidth,
    minHeight,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  subtitleWindow = win;

  let hoverTimer: ReturnType<typeof setInterval> | undefined;
  let interactionTimer: ReturnType<typeof setInterval> | undefined;
  const stopInteraction = () => {
    clearInterval(interactionTimer);
    interactionTimer = undefined;
  };
  const startDrag = (event: IpcMainEvent) => {
    if (win.isDestroyed() || event.sender !== win.webContents) return;
    stopInteraction();
    const origin = win.getBounds();
    const cursor = screen.getCursorScreenPoint();
    interactionTimer = setInterval(() => {
      if (win.isDestroyed()) {
        stopInteraction();
        return;
      }
      const current = screen.getCursorScreenPoint();
      win.setPosition(
        origin.x + current.x - cursor.x,
        origin.y + current.y - cursor.y,
      );
    }, 16);
  };
  const startResize = (event: IpcMainEvent, edge: unknown) => {
    if (
      win.isDestroyed() ||
      event.sender !== win.webContents ||
      typeof edge !== "string" ||
      !["n", "ne", "e", "se", "s", "sw", "w", "nw"].includes(edge)
    ) {
      return;
    }
    stopInteraction();
    const origin = win.getBounds();
    const cursor = screen.getCursorScreenPoint();
    interactionTimer = setInterval(() => {
      if (win.isDestroyed()) {
        stopInteraction();
        return;
      }
      const current = screen.getCursorScreenPoint();
      const dx = current.x - cursor.x;
      const dy = current.y - cursor.y;
      let left = origin.x;
      let top = origin.y;
      let right = origin.x + origin.width;
      let bottom = origin.y + origin.height;

      // 锚定对侧边缘，到达最小尺寸时停止收缩，避免窗口反向翻转。
      if (edge.includes("w")) left = Math.min(origin.x + dx, right - minWidth);
      if (edge.includes("e")) right = Math.max(right + dx, left + minWidth);
      if (edge.includes("n")) top = Math.min(origin.y + dy, bottom - minHeight);
      if (edge.includes("s")) bottom = Math.max(bottom + dy, top + minHeight);
      const bounds = {
        x: Math.round(left),
        y: Math.round(top),
        width: Math.round(right - left),
        height: Math.round(bottom - top),
      };
      const previous = win.getBounds();
      if (
        bounds.x !== previous.x ||
        bounds.y !== previous.y ||
        bounds.width !== previous.width ||
        bounds.height !== previous.height
      ) {
        win.setBounds(bounds);
      }
    }, 16);
  };
  const stopFromRenderer = (event: IpcMainEvent) => {
    if (!win.isDestroyed() && event.sender === win.webContents) stopInteraction();
  };
  ipcMain.on("subtitle-window:drag-start", startDrag);
  ipcMain.on("subtitle-window:resize-start", startResize);
  ipcMain.on("subtitle-window:interaction-stop", stopFromRenderer);
  win.on("blur", stopInteraction);
  let hovered = false;
  const closeWithOwner = () => {
    if (!win.isDestroyed()) win.destroy();
  };
  owner.once("closed", closeWithOwner);
  win.once("closed", () => {
    clearInterval(hoverTimer);
    stopInteraction();
    ipcMain.removeListener("subtitle-window:drag-start", startDrag);
    ipcMain.removeListener("subtitle-window:resize-start", startResize);
    ipcMain.removeListener("subtitle-window:interaction-stop", stopFromRenderer);
    owner.removeListener("closed", closeWithOwner);
    if (subtitleWindow === win) subtitleWindow = null;
  });
  win.once("ready-to-show", () => {
    if (!win.isDestroyed()) win.showInactive();
  });

  try {
    // 复用主窗口的渲染入口和 origin，让字幕路由可独立读取同一份 localStorage。
    const url = new URL(owner.webContents.getURL());
    url.hash = "/subtitle";
    await win.loadURL(url.toString());
    if (win.isDestroyed()) return;

    // 使用屏幕坐标判断悬浮，拖动窗口时也保持背景状态一致。
    hoverTimer = setInterval(() => {
      if (win.isDestroyed()) return;
      const cursor = screen.getCursorScreenPoint();
      const bounds = win.getBounds();
      const nextHovered =
        win.isVisible() &&
        cursor.x >= bounds.x &&
        cursor.x < bounds.x + bounds.width &&
        cursor.y >= bounds.y &&
        cursor.y < bounds.y + bounds.height;
      if (nextHovered === hovered) return;
      hovered = nextHovered;
      // 主进程只通知悬浮状态，样式参数由字幕组件自行读取和应用。
      win.webContents.send("subtitle-window:hover", hovered);
    }, 100);
  } catch (error) {
    closeWithOwner();
    throw error;
  }
}
