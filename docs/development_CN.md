# 开发指南

[English](development.md) / [简体中文](development_CN.md)

[用户指南](../README_CN.md) · [架构与接口约定](architecture_CN.md)

本文介绍源码启动和项目开发。使用已下载安装包的用户请直接阅读用户指南。

## 从源码启动

### 环境要求

- **Node.js 24.14.0**，版本以 [`.nvmrc`](../.nvmrc) 为准，使用 npm 安装前端与 Electron 依赖。
- 使用流式麦克风识别或系统音频字幕时，需要 **Python >= 3.12** 和 **uv**。Python 依赖由 [`backend/pyproject.toml`](../backend/pyproject.toml) 定义。
- 准备所需语音、翻译或 OCR 服务的 Base URL、API Key 和模型 ID。
- 使用麦克风时需要授予录音权限；系统音频采集依赖操作系统和 Electron 的音频捕获支持。

普通分段转写、直接音频翻译、手动文本翻译和 OCR 不经过 Python 网关。

### 1. 安装依赖

在仓库根目录执行：

```bash
npm install
```

供应商配置通过应用界面填写；当前启动流程不需要在 `.env` 中配置 API Key。

### 2. 启动前端

在第一个终端、仓库根目录执行：

```bash
npm run dev
```

Vite 使用固定端口 `1420`，开发地址为 `http://localhost:1420`。端口被占用时会退出，不会自动切换端口。

### 3. 启动桌面窗口

保持前端运行，在第二个终端、仓库根目录执行：

```bash
npm run electron-dev
```

该命令编译并监听 Electron 主进程和 preload，随后启动桌面窗口。主进程或 preload 更新后会重启 Electron。

### 4. 按需启动流式网关

使用流式转写或系统字幕时，在第三个终端执行：

```bash
cd backend
uv sync
uv run python ./main.py
```

网关监听 `127.0.0.1` 的动态端口，通过 mDNS / Zeroconf 广播 `_vt._tcp.local.` 服务，由 Electron 自动发现，无需手动填写本地网关端口。

**开发模式不会自动启动网关。** 打包后的桌面应用会启动随包附带的网关程序。

仅用浏览器打开 Vite 页面可以进行前端开发，但没有 Electron preload 提供的 OSC、字幕原生窗口和本地服务发现能力。完整使用请在 Electron 窗口中操作。

## 开发与打包

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Vite 前端开发服务器 |
| `npm run electron-dev` | 监听并编译主进程和 preload，启动 Electron；需要先启动 Vite |
| `npm run build` | 执行 `tsc && vite build`，生成前端产物到 `dist/` |
| `npm run preview` | 预览已有前端产物，不提供 Electron 原生能力 |
| `npm run lint` | 自动格式化并静态检查 `src/` 和 `src-electron/` |
| `npm run electron-build` | 编译前端、主进程和 preload，使用 PyInstaller 打包网关，再由 electron-builder 生成桌面分发产物 |
| `npm run electron-build-render` | 发布脚本内部使用的前端构建，输出到 `dist-electron/render/` |

发布入口为 [`scripts/release-electron.js`](../scripts/release-electron.js)，需要 Node.js、Python 和 uv，网关打包依赖位于 Python 的 `dev` 依赖组。产物输出到 `release/`；发布脚本会先清理 `dist-electron/`、`release/` 及后端的旧构建产物。

按 [`AGENTS.md`](../AGENTS.md) 进行修改时，不新增测试。仅修改文档无需运行 `npm run lint`；涉及源码修改时（包括同时修改文档和源码），修改后运行 `npm run lint` 并检查自动修复差异。需要验证构建时只运行 `npm run build`，不运行 Electron 开发或打包命令作为改动验证。
