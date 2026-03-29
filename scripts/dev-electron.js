import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { watch } from "chokidar";
import { build } from "esbuild";
import treekill from "tree-kill";

let electronProcess = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const electronPath = path.join(
  __dirname,
  "..",
  "node_modules",
  ".bin",
  "electron",
);

// 1. 定义 esbuild 打包配置
const mainConfig = {
  entryPoints: ["./src-electron/main/index.ts"], // 入口
  bundle: true, // 打包所有依赖
  platform: "node", // 主进程运行在 Node 环境
  target: "node24", // 目标 Node 版本
  external: ["electron"],
  format: "cjs", // 输出 cjs 格式 (Electron 主进程默认支持)
  outfile: "./dist-electron/main/index.cjs", // 输出位置
  sourcemap: true, // 生成 SourceMap 方便调试
  // minify: true,
};

const preloadConfig = {
  entryPoints: ["./src-electron/preload/index.ts"],
  bundle: true,
  platform: "node",
  target: "node24", // 目标 Node 版本
  external: ["electron"],
  format: "cjs",
  outfile: "./dist-electron/preload/index.js",
  sourcemap: true,
};

// 2. 启动 Electron 的函数
const startElectron = () => {
  // 如果已有进程，先杀掉
  if (electronProcess) {
    treekill(electronProcess.pid);
    electronProcess = null;
  }

  console.log("🚀 启动 Electron...");
  // 使用 spawn 启动 electron，参数指向打包后的文件
  // electronProcess = exec(`${electronPath} .`);
  electronProcess = spawn(electronPath, ["."], {
    stdio: "inherit", // 继承父进程的输入输出，这样能看到 Electron 的日志
    shell: true,
  });
};
// build({minify: true})
// 3. 主逻辑
const main = async () => {
  // 首次打包
  await build(mainConfig);
  await build(preloadConfig);

  // 启动 Electron
  startElectron();

  // 监听文件变化
  watch("./src-electron").on("change", async (path) => {
    console.log(`📝 文件变动: ${path}, 正在重新打包...`);
    try {
      // 重新打包
      await build(mainConfig);
      await build(preloadConfig);
      // 重启 Electron
      startElectron();
    } catch (e) {
      console.error("⚠️ 打包失败:", e);
    }
  });
};

main();
