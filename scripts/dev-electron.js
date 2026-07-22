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
const electronRunPath = path.join(__dirname, "..");

const publicConfig = {
  bundle: true,
  platform: "node",
  target: "node24",
  external: ["electron"],
  format: "cjs",
  sourcemap: true,
  loader: { ".html": "text" },
};
const distPath = path.join(__dirname, "../dist-electron");
const srcPath = path.join(__dirname, "../src-electron");

// 配置保持不变
const mainConfig = {
  ...publicConfig,
  entryPoints: [path.join(srcPath, "./main/index.ts")],
  outfile: path.join(distPath, "./main/index.cjs"),
};

const preloadConfig = {
  ...publicConfig,
  entryPoints: [path.join(srcPath, "./preload/index.ts")],
  outfile: path.join(distPath, "./preload/index.cjs"),
};

const screenPickerPreloadConfig = {
  ...publicConfig,
  entryPoints: [path.join(srcPath, "./preload/screen-picker.ts")],
  outfile: path.join(distPath, "./preload/screen-picker.cjs"),
};

const startElectron = () => {
  if (electronProcess) {
    treekill(electronProcess.pid);
    electronProcess = null;
  }

  console.log("🚀 启动 Electron...");
  electronProcess = spawn(electronPath, [electronRunPath], {
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

  const screenPickerCtxWithHook = await context({
    ...screenPickerPreloadConfig,
    plugins: [
      {
        name: "log-screen-picker-preload",
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length === 0) {
              console.log("📝 ScreenPicker Preload构建完成，重启 Electron...");
              startElectron();
            } else {
              console.error(
                "⚠️ ScreenPicker Preload构建出错",
                result.errors,
              );
            }
          });
        },
      },
    ],
  });

  // 启动 watch，它会自动处理后续的重建
  await mainCtxWithHook.watch();
  await preloadCtxWithHook.watch();
  await screenPickerCtxWithHook.watch();
};

main();
