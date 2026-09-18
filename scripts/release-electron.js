import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import builder from "electron-builder";
import { build } from "esbuild";

// const Platform = builder.Platform;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectPath = path.join(__dirname, "..");
const distPath = path.join(projectPath, "dist-electron");
const releasePath = path.join(projectPath, "release");
const backendPath = path.join(projectPath, "backend");
const srcPath = path.join(projectPath, "src-electron");

async function cleanBuildArtifacts() {
  await Promise.all([
    rm(distPath, { recursive: true, force: true }),
    rm(releasePath, { recursive: true, force: true }),
    rm(path.join(backendPath, "build"), { recursive: true, force: true }),
    rm(path.join(backendPath, "dist"), { recursive: true, force: true }),
    rm(path.join(backendPath, "gateway.spec"), { force: true }),
  ]);
}

function runCommand(command, args, cwd = projectPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} exited with code ${code ?? "unknown"}${signal ? ` (signal: ${signal})` : ""}`,
        ),
      );
    });
  });
}

function buildRender() {
  return runCommand(
    process.execPath,
    [
      path.join(
        path.dirname(process.execPath),
        "node_modules",
        "npm",
        "bin",
        "npm-cli.js",
      ),
      "run",
      "electron-build-render",
    ],
    projectPath,
  );
}

function buildBackend() {
  return runCommand(
    "uv",
    [
      "run",
      "pyinstaller",
      "--noconfirm",
      "--clean",
      "--onedir",
      "--name",
      "gateway",
      "--paths",
      "src",
      "./main.py",
    ],
    backendPath,
  );
}

async function buildMainAndPreload() {
  const publicConfig = {
    bundle: true,
    platform: "node",
    target: "node24",
    external: ["electron", "decibri"],
    format: "cjs",
    sourcemap: false,
    minify: true,
    loader: { ".html": "text" },
  };
  await Promise.all([
    build({
      ...publicConfig,
      entryPoints: [path.join(srcPath, "./main/index.ts")],
      outfile: path.join(distPath, "./main/index.cjs"),
    }),
    build({
      ...publicConfig,
      entryPoints: [path.join(srcPath, "./preload/index.ts")],
      outfile: path.join(distPath, "./preload/index.cjs"),
    }),
    build({
      ...publicConfig,
      entryPoints: [path.join(srcPath, "./preload/screen-picker.ts")],
      outfile: path.join(distPath, "./preload/screen-picker.cjs"),
    }),
  ]);
}

async function buildElectron() {
  await builder.build({
    projectDir: projectPath,
    config: {
      appId: "com.ased12138.vrchat-osc-translator",
      productName: "VRChatTranslator",
      directories: {
        output: "release",
        buildResources: "src-electron/build-resources",
      },
      files: ["dist-electron/**/*", "package.json", "!node_modules/**"],
      mac: {
        target: "dmg",
        category: "public.app-category.productivity",
      },
      // extraResources is copied beside app.asar under process.resourcesPath.
      extraResources: [
        {
          from: "backend/dist/gateway",
          to: "backend/gateway",
        },
      ],
      nsis: {
        installerIcon: "src-electron/build-resources/icon.ico",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: 打包配置模板就是这样的，无需更改为js的模板字符串
        artifactName: "${productName}-${version}-Setup.${ext}",
      },
    },
    publish: "never",
  });
}

async function main() {
  await cleanBuildArtifacts();
  await Promise.all([buildRender(), buildMainAndPreload(), buildBackend()]);
  await buildElectron();
}

main().catch((error) => {
  console.error("Electron build failed", error);
  process.exitCode = 1;
});
