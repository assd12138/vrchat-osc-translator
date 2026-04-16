import path from "node:path";
import {
  app,
  BrowserWindow,
  type BrowserWindowConstructorOptions,
  net,
  protocol,
} from "electron";
import { initializeIpcRouter } from "./ipc";

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// 自定义协议名称
const PROTOCOL_NAME = "vrctran";

// 主窗口引用
let mainWindow: BrowserWindow | null = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: PROTOCOL_NAME, // 你的自定义协议名
    privileges: {
      standard: true, // 核心配置：注册为标准 scheme，启用 localStorage 等 API
      secure: true, // 推荐：标记为安全协议
      supportFetchAPI: true, // 推荐：允许 fetch API 使用此协议
      bypassCSP: true,
    },
  },
]);

// 注册自定义协议
function registerProtocol() {
  protocol.handle(PROTOCOL_NAME, (request) => {
    const filePath = request.url.slice(`${PROTOCOL_NAME}://`.length);
    // 解码 URL 编码的路径
    const decodedPath = decodeURIComponent(filePath);
    // 构建完整文件路径
    const basePath = path.join(__dirname, "../render");
    const fullPath = path.join(basePath, decodedPath);
    return net.fetch(`file://${fullPath}`);
  });
}

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
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境使用自定义协议加载构建后的文件
    mainWindow.loadURL(`${PROTOCOL_NAME}://./index.html`);
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 应用生命周期
app.commandLine.appendSwitch(
  "--enable-features",
  "WebMachineLearningNeuralNetwork",
);
app.whenReady().then(() => {
  initializeIpcRouter();
  registerProtocol();
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
