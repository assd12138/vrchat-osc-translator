import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { context } from "esbuild";
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

const publicConfig = {
  bundle: true,
  platform: "node",
  target: "node24",
  external: ["electron"],
  format: "cjs",
  sourcemap: true,
};

// 配置保持不变
const mainConfig = {
  ...publicConfig,
  entryPoints: ["./src-electron/main/index.ts"],
  outfile: "./dist-electron/main/index.cjs",
};

const preloadConfig = {
  ...publicConfig,
  entryPoints: ["./src-electron/preload/index.ts"],
  outfile: "./dist-electron/preload/index.cjs",
};

const startElectron = () => {
  if (electronProcess) {
    treekill(electronProcess.pid);
    electronProcess = null;
  }

  console.log("🚀 启动 Electron...");
  electronProcess = spawn(electronPath, ["."], {
    stdio: "inherit",
    shell: true,
  });
};

const main = async () => {
  const mainCtxWithHook = await context({
    ...mainConfig,
    plugins: [
      {
        name: "restart-electron",
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length === 0) {
              console.log("📝 Main构建完成，重启 Electron...");
              startElectron();
            } else {
              console.error("⚠️ Main构建出错", result.errors);
            }
          });
        },
      },
    ],
  });

  const preloadCtxWithHook = await context({
    ...preloadConfig,
    plugins: [
      {
        name: "log-preload",
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length === 0) {
              console.log("📝 Preload构建完成，重启 Electron...");
              startElectron();
            } else {
              console.error("⚠️ Preload构建出错", result.errors);
            }
          });
        },
      },
    ],
  });

  // 启动 watch，它会自动处理后续的重建
  await mainCtxWithHook.watch();
  await preloadCtxWithHook.watch();
};

main();
