# VRChat OSC Translator

[English](README.md) / [简体中文](README_CN.md)

## 项目简介

VRChat OSC Translator 使用语音活动检测（VAD）捕获语音，通过可配置的 OpenAI-compatible AI 供应商完成转写和翻译，再通过 OSC 将翻译后的聊天内容发送到 VRChat。项目也提供可选的 OCR 图片识别与翻译流程。

## 工作原理

音频可选择以下两种流程之一：

- **先转写再翻译：** 转写模型先生成文本，再由文本翻译模型翻译。转写模型可以使用 `/audio/transcriptions`，也可以是支持 audio 能力的聊天模型。
- **直接翻译：** 单个 chat-completion 模型直接接收音频并返回翻译。该模型必须支持 **audio + text + tools**。此模式没有独立的转写结果。

## 配置 AI 供应商

1. 打开 **设置** → **供应商设置**，新建供应商。
2. 填写 **Provider ID**、**Base URL** 和 **API Key**。Base URL 是 API 的版本根路径，通常到 `/v1` 且没有尾部斜杠；例如 `https://api.openai.com/v1`。
3. 使用 **获取模型列表** 调用 `{baseURL}/models`，或手动添加模型。
4. 为每个模型设置类型：
   - **Audio transcription** 使用 `/audio/transcriptions`。
   - **Chat completion** 使用 `/chat/completions`。
5. 对 chat 模型声明实际具备的 **audio**、**image**、**text** 和 **tools** 能力。能力初始值可能全部开启，但不会自动检测；请按供应商实际情况修正。
6. 保存供应商。在 **外部 API 配置** 中选择翻译方式，以及各槽位使用的模型。

## 选择翻译方式和模型

| 模型槽位 | 可用模型 |
| --- | --- |
| transcription | Audio-transcription 模型，或支持 audio 的 chat 模型 |
| translation | 支持 text 的 chat 模型 |
| direct | 支持 audio + text + tools 的 chat 模型 |
| OCR | 支持 image + text + tools 的 chat 模型 |

需要独立转写结果，或分别使用语音和文本模型时，选择 **先转写再翻译**。只有模型满足 direct 槽位的全部能力要求时，才使用 **直接翻译**。

### 输出模板

输出模板定义发送到 VRChat 的消息。占位符必须严格使用两个小写字母：`#{xx}`。例如：

```text
Me: #{en}
翻译：#{zh}
```

所有非占位符文本都会保留。模板中没有语言占位符会导致配置错误。

### 批量翻译

这个名称容易引起误解。对于支持工具的翻译模型：

- **关闭：** 一次结构化工具调用完成所有目标语言的翻译。
- **开启：** 每个目标语言发起一个独立的并发请求，不使用工具调用。

后一种方式可能增加请求量和费用，但可用于工具调用不稳定的供应商。不支持 tools 的模型始终会对每个目标语言各发一次请求。

## 在 VRChat 中使用

1. 在 VRChat 中启用 OSC。
2. 在音频面板开始监听，然后说话。
3. VAD 检测到说话结束后，所选流程会开始处理。
4. 翻译结果会排队发送到 VRChat。

消息会发送到本机 UDP `127.0.0.1:9000` 的 `/chatbox/input`，两次发送之间至少间隔一秒。OCR 结果只显示在应用中，不会自动发送到 VRChat。

## 兼容的 API

| API 能力 | 要求 |
| --- | --- |
| 模型发现 | 可选的 `GET /models` |
| 音频转写 | 返回 `text` 的 `POST /audio/transcriptions` |
| 聊天、直接翻译和 OCR | `POST /chat/completions`，按所选场景支持所需的 `content`、`tool_calls`、`input_audio` 和/或 `image_url` |

仅当部署的 whisper.cpp、Ollama、LM Studio、OpenRouter 或类似服务暴露了所需的兼容接口和能力时，才可以使用它们。配置前请确认供应商实际 API 行为。

## 推荐供应商

以下推荐按地区和翻译模式分组，请根据网络环境和使用习惯选择。

### 直接翻译模式（音频 → 翻译内容）

**国内用户推荐：**

- **doubao-seed-2.0-mini** — [火山方舟](https://console.volcengine.com/ark/region:cn-beijing/model/detail?name=doubao-seed-2-0-mini)

  轻量、低延迟的端到端音频翻译模型，中文表现出色。配置为 **chat-completion** 类型，声明 **audio + text + tools** 能力，并分配给 **direct** 槽位。

**国外用户推荐：**

- **gemini-3.5-flash-lite** — [Google DeepMind](https://deepmind.google/models/gemini/flash-lite/)

  低延迟多模态模型，适合实时音频翻译场景。配置为 **chat-completion** 类型，声明 **audio + text + tools** 能力，并分配给 **direct** 槽位。

### 先转写再翻译模式

**国内用户推荐：**

- 转写：**mimo-v2.5-asr** — [小米 mimo](https://mimo.mi.com/models/zh-CN/mimo-v2.5-asr)
- 翻译：**deepseek-v4-flash** — [DeepSeek 开放平台](https://platform.deepseek.com/)

  在同一供应商或分两个供应商添加两个模型。mimo-v2.5-asr 必须设为 **chat-completion** 类型，且只勾选 **audio** 能力，不要勾选 text 或 tools；deepseek-v4-flash 设为 **chat-completion（text + tools）** 类型。选择 **先转写再翻译**，并分别分配到对应槽位。

**国外用户推荐：**

- 转写：**gpt-transcribe** — [OpenAI](https://developers.openai.com/api/docs/models/gpt-transcribe)
- 翻译：**gpt-5.6-luna** — [OpenAI](https://developers.openai.com/api/docs/models/gpt-5.6-luna)

  两个模型均通过 OpenAI API 提供。将 gpt-transcribe 配置为 **audio-transcription** 类型，gpt-5.6-luna 配置为 **chat-completion（text + tools）** 类型，然后分别分配给转写和翻译槽位。

## 排错

| 问题 | 检查项 |
| --- | --- |
| 槽位中没有可选模型 | 确认模型类型和声明的能力符合槽位要求。 |
| 获取模型列表失败 | 检查 Base URL、API Key、网络，以及供应商是否支持 `/models`。 |
| 缺少目标语言占位符 | 在输出模板中加入至少一个 `#{xx}` 占位符。 |
| `missing required tool call` | 模型可能无法稳定支持 tools；请使用兼容模型或尝试开启批量翻译。 |
| `missing transcription text` | 转写接口返回不兼容，缺少所需的 `text` 字段。 |
| VRChat 没有输出 | 确认已启用 VRChat OSC，并且运行的是 Electron 而不只是 Vite。 |

## 从源码快速开始

本仓库没有可确认的发布版下载，请从源码运行。

1. 安装 Node.js **24.14.0**（`.nvmrc` 中指定的版本）。
2. 安装依赖：

   ```bash
   npm install
   ```

3. 在第一个终端启动渲染器：

   ```bash
   npm run dev
   ```

4. 在第二个终端启动 Electron：

   ```bash
   npm run electron-dev
   ```

只有在 Electron 中运行时才能发送 OSC。使用语音翻译前，请先在 VRChat 中启用 OSC。

## 开发

```bash
npm run build          # 类型检查并构建渲染器
npm run lint           # 格式化并检查源文件
npm run electron-build # 构建并打包 Electron 应用
```

## 许可证

MIT © 2026 ased12138
