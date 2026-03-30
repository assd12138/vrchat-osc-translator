import path from "node:path";
import {
  app,
  BrowserWindow,
  type BrowserWindowConstructorOptions,
  ipcMain,
  shell,
} from "electron";
import { sendVrchatMessage } from "./utils/osc";

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// 主窗口引用
let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  const options: BrowserWindowConstructorOptions = {
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
    },
  };

  mainWindow = new BrowserWindow(options);

  if (isDev) {
    // 开发环境加载Vite开发服务器
    mainWindow.loadURL("http://localhost:1420");
    // 打开DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC处理器

// 发送OSC消息到VRChat
ipcMain.handle("send_to_vrc_chat", async (_event, args: { text: string }) => {
  try {
    sendVrchatMessage(args);
    return;
  } catch (error) {
    console.error("Failed to send OSC message:", error);
    throw error;
  }
});

// 获取七牛上传Token
ipcMain.handle("get_qiniu_token", async (_event) => {
  try {
    // const token = generateQiniuToken(accessKey, secretKey, bucket);
    return "";
  } catch (error) {
    console.error("Failed to generate Qiniu token:", error);
    throw error;
  }
});

// 打开外部URL
ipcMain.handle("open_external", async (_event, url: string) => {
  await shell.openExternal(url);
});

// 应用生命周期
app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    // macOS通常在点击dock图标时重新创建窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // macOS上通常用户明确按Cmd+Q才会退出应用
  if (process.platform !== "darwin") {
    app.quit();
  }
});
