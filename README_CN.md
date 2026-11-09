# VRChat OSC Translator

[English](README.md) / [简体中文](README_CN.md)

将麦克风语音翻译后发送到 VRChat 聊天框，也可以为系统音频显示悬浮字幕，或翻译图片中的文字。使用前在应用中配置你选择的 AI 服务即可。

## 下载与首次使用

1. 打开 [Releases](https://github.com/assd12138/vrchat-osc-translator/releases)，选择已提供的、适用于你操作系统的应用安装包，按该版本说明安装或解压。Source code 压缩包供开发人员使用。
2. 启动应用。安装包已包含本地识别网关，并会自动启动，无需另外安装 Node.js 或 Python。
3. 打开 **供应商设置**，根据下方的官方申请入口和配置说明添加服务。准备一个语音识别模型和一个文本翻译模型，或一个支持直接音频翻译的模型。
4. 在 **系统配置** 中选好模型，设置 **输出模板**，例如：

   ```text
   [中] #{zh}
   [EN] #{en}
   ```

5. 在 VRChat 中启用 OSC。回到应用的 **语音识别** 页面，选择麦克风，在 **语音采集** 中点击 **开始**。授权录音后说话，译文会发送到 VRChat 聊天框。

VRChat 与本应用需要运行在同一台电脑上。点击 **停止** 结束麦克风采集，可在 **系统日志** 中查看识别结果和错误信息。

## 可以做什么

| 功能 | 使用方式 |
| --- | --- |
| 麦克风翻译 | 将语音翻译为一种或多种语言，发送到 VRChat |
| 手动翻译 | 在 **手动翻译** 中输入文字，点击 **翻译发送** 或按 Enter |
| 系统音频字幕 | 翻译电脑正在播放的声音，在独立悬浮窗口显示字幕 |
| 图片翻译 | 读取剪贴板图片，或上传 PNG、JPEG、WebP 文件 |
| 个性化设置 | 切换界面语言、拖动排序侧栏、调整字幕样式 |

## 供应商与模型配置

### 申请服务与 API Key

通过下方官方入口注册、开通服务并创建 API Key。在对应控制台确认所选模型的使用权限和可用额度。

| 服务 | 官方申请 / API Key 入口 | 用途 |
| --- | --- | --- |
| Nari Labs（nariLab） | [Nari Labs API Key 控制台](https://app.narilabs.com/keys) · [密钥申请说明](https://docs.narilabs.com/authentication) | 流式语音识别 |
| Qwen 国内版（北京） | [阿里云百炼 API Key 控制台](https://bailian.console.aliyun.com/cn-beijing/model/settings/api-key) | 流式语音识别；另选聊天模型可用于文本翻译 |
| Qwen 国际版（新加坡） | [阿里云 Model Studio API Key 控制台](https://modelstudio.console.alibabacloud.com/ap-southeast-1/model/settings/api-key) | 流式语音识别；另选聊天模型可用于文本翻译 |
| MiniMax | [国内开放平台](https://platform.minimax.cn/) · [国际开放平台](https://platform.minimax.io/) · [API Key 申请说明](https://platform.minimax.cn/docs/guides/quickstart-preparation) | 分段音频识别 |

也可以添加其他满足所需模型能力的兼容服务。语音识别和文本翻译可以分别使用不同供应商。

### 在应用中添加服务

1. 打开 **供应商设置**，新建供应商，在 **供应商标识** 中填写一个便于识别的名称。
2. 填写 **Base URL** 和 **API Key**。下方表格中的地址可直接复制到 Base URL。
3. 手动添加模型 ID，或使用服务支持的 **获取模型列表**，再选择对应模型类型。
4. 对于聊天模型，只勾选模型实际支持的 `audio`、`image`、`text`、`tools` 能力。应用不会自动检测模型能力。
5. 保存后，进入 **系统配置**，为相应功能分配模型。

获取模型列表失败时仍可手动配置；流式服务通常需要自行填写模型 ID。

### 流式语音识别：Nari Labs

| 配置项 | 填写内容 |
| --- | --- |
| Base URL | `https://api.narilabs.com/v1` |
| 模型类型 | 流式转写中的 **nariLab** |
| 模型 ID | `qwen3-asr` 或 `qwen3-asr-fast` |

配置依据为官方 [语音识别说明](https://docs.narilabs.com/transcribe-audio) 和 [模型列表](https://docs.narilabs.com/models-and-pricing)。这里使用 Nari Labs 的 API Key，即使模型名称中包含 Qwen，也不要填写阿里云的密钥。

### 流式语音识别：Qwen

根据创建 API Key 时选择的地域配置。**国内版和国际版的 API Key、模型列表与服务权限按地域区分，不能混用。** 详见官方 [地域与接入说明](https://help.aliyun.com/zh/model-studio/regions)。

下表是本应用中应填写的 Base URL。同一地域的两种 Qwen 流式模型类型均使用相同的 Base URL：

| 地域 | Base URL |
| --- | --- |
| 国内版（北京），原有 DashScope 地址 | `https://dashscope.aliyuncs.com/api-ws/v1` |
| 国际版（新加坡），原有 DashScope 地址 | `https://dashscope-intl.aliyuncs.com/api-ws/v1` |
| 国内版（北京），业务空间专属地址 | `https://YOUR_WORKSPACE_ID.cn-beijing.maas.aliyuncs.com/api-ws/v1` |
| 国际版（新加坡），业务空间专属地址 | `https://YOUR_WORKSPACE_ID.ap-southeast-1.maas.aliyuncs.com/api-ws/v1` |

阿里云推荐使用业务空间专属地址，原有 DashScope 地址仍受支持。请将 `YOUR_WORKSPACE_ID` 替换为实际业务空间 ID，或将控制台显示的 API Host 配上 `/api-ws/v1` 后填写；应用会处理后续流式连接。参见官方 [Qwen realtime 说明](https://www.alibabacloud.com/help/en/model-studio/qwen-asr-realtime-interaction-process) 和 [Fun-ASR 说明](https://www.alibabacloud.com/help/en/model-studio/fun-asr-realtime-websocket-api)。

| 模型系列 | 应选择的模型类型 | 模型 ID 示例 |
| --- | --- | --- |
| Qwen ASR 实时识别 | **qwen-asr-realtime** | `qwen3-asr-flash-realtime` |
| Qwen Audio / Fun-ASR | **qwen-audio / fun-asr** | `fun-asr-realtime` |

请在所选地域的控制台确认模型可用。以上地址用于流式识别；如果同时使用 Qwen 做文本翻译，请另建一个供应商，填写控制台提供的聊天模型 Base URL。

### 分段语音识别：MiniMax

| 地域 | Base URL | 模型类型 | 模型 ID 示例 |
| --- | --- | --- | --- |
| 国内版 | `https://api.minimax.cn/v1` | 语音转写中的 **minimax** | `asr-1.0` |
| 国际版 | `https://api.minimax.io/v1` | 语音转写中的 **minimax** | `asr-1.0` |

使用对应平台申请的 API Key。本应用通过 MiniMax 处理麦克风语音片段，不能将其选作系统音频流式模型。参见官方 [国内版语音识别说明](https://platform.minimax.cn/docs/api-reference/speech-to-text) 或 [国际版说明](https://platform.minimax.io/docs/api-reference/speech-to-text)。

### 为功能分配模型

| 配置项 | 模型要求 |
| --- | --- |
| 语音转写模型 | 支持的语音识别模型，或支持 `audio` 的聊天模型 |
| 语音翻译模型 | 支持 `text` 的聊天模型 |
| 语音直接翻译模型 | 支持 `audio + text + tools` 的聊天模型 |
| OCR 模型 | 支持 `image + text + tools` 的聊天模型 |
| 系统音频转写模型 | 流式语音识别模型，例如 Nari Labs 或 Qwen 流式模型 |
| 系统音频翻译模型 | 支持 `text` 的聊天模型 |

选择 **先转写再翻译**，分别配置识别和翻译模型；选择 **直接输出翻译**，则使用一个满足要求的模型直接翻译音频，此模式没有独立转写结果。

## 输出语言与翻译设置

**输出模板** 决定发送到 VRChat 的语言和消息格式。可以使用 `#{zh}`、`#{en}`、`#{ja}`、`#{ko}` 等占位符，语言代码必须是两个小写字母，且至少包含一个占位符。其余文本会保留。也可以使用 **模板生成器** 选择语言，无需手写占位符。

对于支持工具调用的文本翻译模型，**批量翻译** 关闭时，一次工具调用返回全部目标语言；开启时，每种语言分别并发请求。不支持工具调用的模型始终按语言分别请求。直接音频翻译需要工具调用能力。

在 **提示词设置** 中可以保存自定义文本翻译要求，`#text` 代表原文，`#target` 代表目标语言。它们与输出模板中的 `#{en}` 等语言占位符用途不同。

## 系统音频字幕

1. 在 **系统配置** 中选择 **系统音频转写模型**、**系统音频翻译模型** 和 **系统音频目标语言**。
2. 在 **语音识别** → **系统音频** 中点击 **打开字幕**，再点击 **开始**。
3. 播放需要识别的声音，原文和译文会显示在悬浮窗口中。
4. 使用结束后，在系统音频区域点击 **停止**。单独关闭字幕窗口不会停止采集。

字幕窗口可以拖动、缩放和锁定，也可以调整背景透明度，并分别修改原文与译文的字号、颜色和加粗样式。系统音频采集取决于操作系统支持和采集权限。

字幕可与麦克风翻译同时运行，使用独立目标语言，不会自动向 VRChat 发送消息。

## 图片翻译

1. 在 **系统配置** 中选择 **OCR 模型**。
2. 打开 **图片翻译**，选择目标语言。
3. 点击 **剪贴板** 或 **文件选择**，识别并翻译图片。

支持 PNG、JPEG、WebP 文件。原文和译文在应用中分别展示，不会自动发送到 VRChat。

## 常见问题

| 问题 | 排查方向 |
| --- | --- |
| 模型下拉框没有可选项 | 保存供应商后，检查模型类型和勾选的能力是否满足对应功能 |
| 获取模型列表失败 | 可以直接手动添加模型 ID，同时检查 Base URL 和 API Key |
| Qwen 提示鉴权失败 | 确认 API Key、Base URL 和模型属于同一地域；使用专属地址时替换业务空间占位符 |
| 能识别但没有翻译 | 除语音识别模型外，还需要配置文本翻译模型 |
| 出现工具调用错误 | 使用支持工具调用的模型；文本翻译可尝试开启批量翻译，直接音频翻译和 OCR 仍需要工具调用 |
| 麦克风没有输入 | 检查设备选择、录音权限，以及是否已开始语音采集 |
| 系统字幕没有结果 | 确认正在播放声音，检查音量和采集权限，并选择流式识别模型 |
| 提示本地识别服务不可用 | 重启安装版应用，保留随包文件完整，并查看系统日志 |
| VRChat 没有收到消息 | 启用 OSC，确认两个应用在同一台电脑上，并检查输出模板；当前发送目标为 `127.0.0.1:9000`，两次消息至少间隔一秒 |

设置与 API Key 保存在当前设备上。音频、文本和图片会发送到相应功能所选的服务供应商进行处理。

## 许可证

[MIT](LICENSE) © 2026 ased12138

## 开发人员文档

- [源码启动、开发与打包](docs/development_CN.md)
- [架构、源码目录与接口约定](docs/architecture_CN.md)
