import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import builder from "electron-builder";
import { build } from "esbuild";

// const Platform = builder.Platform;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "../dist-electron");
const srcPath = path.join(__dirname, "../src-electron");

async function buildRender() {
  const buildProcess = spawn("npm", ["run", "electron-build-render"], {
    stdio: "inherit",
    shell: true,
  });
  return new Promise((resolve, reject) => {
    buildProcess.on("close", (code) => {
      if (code === 0) {
        resolve(true);
      }
      reject(new Error(`Build render process exited with code ${code}`));
    });
  });
}

async function buildMainAndPreload() {
  const publicConfig = {
    bundle: true,
    platform: "node",
    target: "node24",
    external: ["electron"],
    format: "cjs",
    sourcemap: false,
    minify: true,
  };
  await build({
    ...publicConfig,
    entryPoints: [path.join(srcPath, "./main/index.ts")],
    outfile: path.join(distPath, "./main/index.cjs"),
  });
  await build({
    ...publicConfig,
    entryPoints: [path.join(srcPath, "./preload/index.ts")],
    outfile: path.join(distPath, "./preload/index.cjs"),
  });
}

async function buildElectron() {
  try {
    await builder.build({
      projectDir: path.join(__dirname, ".."),
      config: {
        appId: "com.ased12138.vrchat-osc-translator",
        productName: "VRChatOscTranslator",
        // asar: false,
        files: ["dist-electron/**/*", "package.json", "!node_modules/**"],
        mac: {
          target: "dmg",
          category: "public.app-category.productivity",
        },
        nsis: {},
      },
      publish: "never",
    });
  } catch (error) {
    console.log("ELectron build error", error);
  }
}

(async () => {
  await Promise.all([buildRender(), buildMainAndPreload()]);
  await buildElectron();
})();
