import path from "node:path";
import {
  app,
  BrowserWindow,
  type BrowserWindowConstructorOptions,
  ipcMain,
  shell,
} from "electron";
import { dialog } from "electron/main";
import { sendVrchatMessage } from "./utils/osc";
import { uploadOss } from "./utils/oss";

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// 主窗口引用
let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  const options: BrowserWindowConstructorOptions = {
    width: 400,
    height: 600,
    autoHideMenuBar: true,
    title: "VRChat-Translator",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
    },
  };

  mainWindow = new BrowserWindow(options);

  if (isDev) {
    // 开发环境加载Vite开发服务器
    mainWindow.loadURL("http://localhost:1420");
    // 打开DevTools
    // mainWindow.webContents.openDevTools();
  } else {
    // 生产环境加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, "../render/index.html"));
    // mainWindow.webContents.openDevTools();
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

// 生成4位随机字母数字字符串
function generateRandomKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// oss上传
ipcMain.handle(
  "upload_oss",
  async (
    event,
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
  ) => {
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

      const res = await uploadOss({
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
  },
);

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
