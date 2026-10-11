# AGENTS.md

本文为在本仓库中工作的编码代理提供指导，适用于整个仓库。修改前以当前源码和 `package.json` 为准，避免沿用过时的文件路径或架构描述。

## 修改与验证规则（必须遵守）

1. **修改时不要尝试添加测试。** 不新增测试文件、测试用例、测试脚本、测试依赖或测试框架。
2. **修改后如需验证构建，仅运行 `npm run build`，只验证前端部分。** 不尝试构建或打包 Electron；不要运行 `npm run electron-build`、`npm run electron-build-render`，也不要直接调用 Electron 构建、打包脚本或工具。不要为了验证改动运行 `npm run electron-dev`，因为它会构建主进程和 preload。
3. **修改后自动运行 `npm run lint`，并修复明显可以解决的错误。** 无需额外询问。该命令带有自动修复，会修改源文件；检查其产生的差异，修复明确的格式、导入和其他可安全解决的问题。手动修复后重新运行，确认结果。对无法明确修复的问题如实说明，不通过关闭规则或删除业务逻辑来掩盖错误。
4. 保持修改与任务相关，保留用户已有的改动。交付时说明修改内容、实际执行的检查和仍未解决的问题。

## 项目概况

- 项目是 VRChat 语音翻译桌面应用，当前桌面运行时为 **Electron**。
- 前端使用 React、TypeScript、Vite、React Router、Redux Toolkit、i18next、HeroUI 和 Tailwind CSS。
- 麦克风支持 VAD 分段转写、流式转写，以及音频直接翻译；结果通过 OSC 发往 VRChat。
- 系统音频通过独立的流式识别链路生成悬浮字幕；另有 OCR 图片翻译功能。
- `backend/` 是 Python 流式转写网关，使用 FastAPI、WebSocket 和 Zeroconf，负责连接第三方语音服务。
- Node.js 版本参考 `.nvmrc`（当前为 `24.14.0`）；Python 要求参考 `backend/pyproject.toml`（当前为 `>=3.12`），依赖由 uv 管理。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 Vite 前端开发服务器，固定端口 `1420` |
| `npm run build` | 执行 `tsc && vite build`，前端产物输出到 `dist/`；修改后唯一允许的构建验证命令 |
| `npm run preview` | 预览已生成的前端产物 |
| `npm run lint` | 执行 `biome check --write ./src && biome check --write ./src-electron`，修改后必须自动运行 |

`npm run lint` 对 Electron 源码的静态检查不属于 Electron 构建。该命令不检查 `backend/`、`scripts/` 或 Markdown 文件。

需要开发流式转写功能时，网关的启动命令是在 `backend/` 目录执行 `uv run python ./main.py`。开发模式下 Electron 不会自动启动网关；打包应用由主进程启动随包附带的网关。仅运行 Vite 时没有 Electron preload，OSC、原生窗口控制和本地服务发现等能力不可用。

`scripts/dev-electron.js` 和 `scripts/release-electron.js` 分别编排 Electron 开发和打包。发布脚本还会打包 Python 网关；这些脚本不用于修改后的验证。

## 代码结构

| 路径 | 职责 |
| --- | --- |
| `src/main.tsx`、`src/App.tsx` | React 入口、Redux Provider、持久化恢复和路由挂载 |
| `src/routes/` | Hash 路由和主窗口页面容器 |
| `src/components/`、`src/App.css` | 公共 UI、标题栏、侧栏和全局样式 |
| `src/panel/` | 语音识别、字幕、OCR、设置、供应商和系统日志面板 |
| `src/api/commonRouter.ts` | 普通音频转写、直接翻译、文本翻译和 OCR 请求编排 |
| `src/api/provider.ts`、`src/api/index.ts` | 模型解析、端点拼接、模型发现和带超时的请求封装 |
| `src/api/stream.ts`、`src/api/subtitle-stream.ts` | 流式转写连接、翻译队列和独立字幕会话 |
| `src/store/`、`src/store/rehydrate/` | 设置、供应商模型契约、字幕样式和 localStorage 持久化 |
| `src/utils/`、`src/constants/` | 音频处理、OSC 发送队列、日志事件、语言和模型行为预设 |
| `src/i18n/` | 国际化初始化和中、英、日、韩翻译资源 |
| `src/electron/ipc.ts` | 渲染端原生命令、参数和返回值类型 |
| `src-electron/main/` | 应用生命周期、IPC 控制器、OSC、本地网关发现和字幕窗口 |
| `src-electron/preload/`、`src-electron/shared/` | `contextBridge` 桥接及窗口、字幕和 IPC 共享类型 |
| `backend/connector.py`、`backend/transcription.py`、`backend/thirdApi/` | 网关协议、转写会话抽象和供应商适配器 |
| `vite.config.ts`、`tsconfig*.json`、`biome.json` | 前端构建、TypeScript 和格式检查配置 |

`dist/`、`dist-electron/`、`release/` 以及后端构建目录是生成产物，不应作为源文件修改。

## 核心数据流

### 麦克风翻译与 VRChat

- `src/panel/speech-recognition-panel/index.tsx` 组合麦克风面板和系统音频字幕面板，两者的识别会话独立。
- `src/panel/audio-panel/index.tsx` 根据模型类型选择采集链路：普通模型使用 `@ricky0123/vad-web` 的 `MicVAD`（v6）检测语音片段并编码 WAV；流式模型使用 `decibri` 采集 16 kHz 单声道 PCM。
- `transcribe-then-translate` 模式先转写再调用翻译模型；`direct` 模式把音频交给支持工具调用的聊天模型直接翻译，没有单独的转写结果。
- 流式链路由 `src/api/stream.ts` 连接本地网关并处理转写结果，再通过 `StreamTranslationProcessor` 排队翻译。
- 翻译结果进入 `src/utils/vrc-chat-queue.ts`，按至少一秒的间隔通过 IPC 发送。
- `src-electron/main/utils/osc.ts` 将消息发送到 UDP `127.0.0.1:9000` 的 `/chatbox/input`，参数为文本和自动提交布尔值 `true`；VRChat 需要启用 OSC。
- VAD 使用的 worklet、ONNX 和 WASM 资源由 `vite.config.ts` 复制到 `vad/`，修改相关路径时保持采集代码与资源配置一致。

### 系统音频字幕

- `src/panel/subtitle-recognition-panel/index.tsx` 管理开始、停止、异常清理和打开字幕窗口。
- `src/utils/display-audio.ts` 和 `subtitle-audio.worklet.js` 将系统音频转换为 16 kHz、单声道、16 位小端 PCM，每 100 ms 输出一块。
- `src/api/subtitle-stream.ts` 为每次启动创建独立的连接和翻译队列，使用 `subtitleTranscription`、`subtitleTranslation` 及 `subtitleTargetLanguage` 配置。
- 字幕翻译返回纯文本，不使用 VRChat 输出模板、工具调用或 VRChat 字数限制，也不自动发送到 VRChat。
- 翻译结果经 preload 的 `sendSubtitleResult` 交给字幕窗口；`src/panel/subtitle-panel/` 负责原文与译文显示、滚动、文本合并及样式控制。
- 停止、取消或卸载时释放音轨、AudioContext、WebSocket、翻译请求、定时器和事件监听，避免旧会话结果更新新会话。

### 本地转写网关

- `backend/main.py` 启动网关，监听 `127.0.0.1` 的动态端口，并广播 `_vt._tcp.local.` 服务。
- Electron 的 `src-electron/main/utils/local-service-discovery.ts` 使用 Bonjour 发现网关，渲染端经 `GET_LOCAL_SERVICE` 获取地址。
- WebSocket 端点为 `/transcription`：先发送 `transcription.configure` 配置，服务返回 `ready` 后发送二进制 PCM；服务返回 `transcript`、`error` 等消息，并支持 `transcription.finish` / `done` 收尾协议。
- 适配器位于 `backend/thirdApi/`，当前接入 AudioCpp、Narilab、Qwen 实时和 Qwen inference。新增流式类型时同步前端模型类型、能力校验、配置 UI 与后端适配器注册。

### OCR

`src/panel/ocr-panel/index.tsx` 接收上传或剪贴板图片，调用 `transformOCRRouter`，通过 `ocr_result` 工具调用获取 `original` 和 `translation`。OCR 使用独立目标语言，结果仅在应用内展示。

## API 与模型配置

- `src/store/api-config.ts` 是供应商、模型类型、能力和选择槽位的统一契约。供应商与模型使用持久化 UID，选择项保存 `providerUid` / `modelUid`，不要根据显示名称重新生成身份。
- 所有模型选择经过 `isModelEligible`、`isSelectionValid` 和 `sanitizeApiConfig` 校验，调用前使用 `resolveModel` 检查供应商、模型及必需配置。

| 模型槽位 | 要求 |
| --- | --- |
| `transcription` | 流式转写模型、标准音频转写、Minimax 转写，或支持 audio 的聊天模型 |
| `translation`、`subtitleTranslation` | 支持 text 的聊天模型 |
| `direct` | 支持 audio + text + tools 的聊天模型 |
| `ocr` | 支持 image + text + tools 的聊天模型 |
| `subtitleTranscription` | `isStreamModelType` 支持的流式模型 |

- 普通请求使用供应商配置的 Base URL 和 Bearer API Key。端点映射集中在 `src/api/provider.ts`；不要假设所有供应商都只使用 OpenAI 的标准转写路径。
- 模型或供应商的特殊请求行为集中在 `src/constants/model-behavior.ts`，例如音频 data URI 和关闭思考的参数。
- VRChat 输出模板的语言占位符为 `#{xx}`，其中 `xx` 是两个小写字母；翻译提示词模板使用 `#text` 和 `#target`，不要混淆两类模板。
- `batchTranslate` 开启时按目标语言并发发送纯文本翻译请求；关闭且模型支持 tools 时，可通过一次工具调用获取多语言结果。直接音频翻译始终使用工具调用。

## 状态与持久化

- `src/store/settings.ts` 是当前 Redux settings slice，包含 `apiConfig`、输出模板、翻译提示词、语言、OCR 目标语言、面板顺序和字幕样式。
- localStorage 根键为 `redux-persist`；持久化键、写入和恢复分别由 `rehydrate-constant.ts`、`rehydrate-store.ts`、`rehydrate.ts` 管理。
- 新增持久化设置时同步类型、默认值、reducer、写入、恢复映射和必要的数据校验。API 配置统一保存在嵌套的 `SETTING_API_CONFIG` 中。
- 保留 `src/main.tsx` 的初始化顺序：先恢复持久化状态，再初始化需要读取 store 的模块（例如 i18n）。恢复完成前不要回写默认值覆盖用户配置。
- API Key 保存在本地配置中；流式网关也会接收所选供应商的凭据。不要把真实凭据写入日志、源码或示例配置。

## 界面与 Electron 修改约定

- 主窗口页面位于 `src/routes/Root.tsx`。切换页面仅改变可见性，保持固定 key 和持续挂载，避免打断麦克风、字幕采集及页面局部状态。
- `src/routes/index.ts` 使用 Hash 路由：`/` 是主窗口，`/subtitle` 是字幕窗口；`/mix-sound-translate` 当前仍为占位页面。
- 设置 UI 拆分在 `src/panel/setting-panel/components/`；`src/panel/translation-panel/index.tsx` 当前负责输出模板编辑。
- 复用 `src/components/ui.tsx`、HeroUI 和现有样式。Biome 的格式约定以 `biome.json` 为准，包括空格缩进、双引号和导入整理。
- 新增界面文案沿用 `react-i18next`，同步 `src/i18n/translations/` 下的 `zh-CN.ts`、`en-US.ts`、`ja-JP.ts`、`ko-KR.ts`。
- 新增原生能力时同步主进程控制器、preload 暴露列表和 `src/electron/ipc.ts` 类型；共享数据结构放在 `src-electron/shared/`，保持桥接接口明确。
- 常规 IPC 在 `src-electron/main/ipc/index.ts` 注册，控制器函数名会转换为 snake_case 通道名；字幕结果、拖动和窗口状态还使用专门的事件通道。
- 主进程管理应用生命周期、系统音频 loopback、网关发现和原生窗口。字幕窗口的透明、置顶、鼠标穿透及拖动缩放逻辑位于 `src-electron/main/utils/subtitle-window.ts`。

## 开发者的提醒-禁止删除

- 添加一个store中的内容的时候，如果是api相关的，并且需要使用env来获得定义的时候，需要在.env中添加对应的环境变量，在vite-env.d.ts中添加对应环境变量的定义
- 上述类型声明文件的实际路径为 `src/vite-env.d.ts`；需要共享配置示例时同步 `.env.example`，不要提交真实密钥。
