# VRChat OSC Translator

[English](README.md) / [简体中文](README_CN.md)

Translate your microphone speech into the VRChat chatbox, display floating subtitles for system audio, and translate text in images. Configure your preferred AI services in the app.

## Download and first use

1. Open [Releases](https://github.com/assd12138/vrchat-osc-translator/releases), choose an available application package for your operating system, and install or extract it as directed by that release. The Source code archives are for developers.
2. Launch the app. Packaged releases include the local recognition gateway and start it automatically; you do not need to install Node.js or Python separately.
3. Open **Provider Settings** and add your services using the registration links and settings below. Prepare a speech recognition model and a text translation model, or one model that supports direct audio translation.
4. In **System configuration**, select your models and set an **Output template**, such as:

   ```text
   [ZH] #{zh}
   [EN] #{en}
   ```

5. Enable OSC in VRChat. On **Speech Recognition**, select a microphone and click **Start** under **Voice capture**. Grant microphone permission and speak; translations are sent to the VRChat chatbox.

Keep VRChat and the app on the same computer. Click **Stop** to end microphone capture. **System Log** shows recognition results and errors.

## What you can do

| Feature | How to use it |
| --- | --- |
| Microphone translation | Translate speech into one or more languages and send it to VRChat |
| Manual translation | Type under **Manual translation**, then click **Translate & Send** or press Enter |
| System audio subtitles | Translate audio playing on your computer into a separate floating subtitle window |
| Image translation | Read an image from the clipboard or upload a PNG, JPEG, or WebP file |
| Personalization | Change interface language, reorder sidebar items, and customize subtitle appearance |

## Providers and models

### Get an API key

Use the official links below to register, enable the service, and create an API key. Check access to your chosen model and the available service balance in the provider's console.

| Service | Official signup / API key page | Used for |
| --- | --- | --- |
| Nari Labs (nariLab) | [Nari Labs API Keys](https://app.narilabs.com/keys) · [Getting an API key](https://docs.narilabs.com/authentication) | Streaming speech recognition |
| Qwen, China (Beijing) | [Alibaba Cloud Bailian API Keys](https://bailian.console.aliyun.com/cn-beijing/model/settings/api-key) | Streaming speech recognition; text translation with a separate chat model |
| Qwen, international (Singapore) | [Alibaba Cloud Model Studio API Keys](https://modelstudio.console.alibabacloud.com/ap-southeast-1/model/settings/api-key) | Streaming speech recognition; text translation with a separate chat model |
| MiniMax | [China platform](https://platform.minimax.cn/) · [International platform](https://platform.minimax.io/) · [API key guide](https://platform.minimax.io/docs/guides/quickstart-preparation) | Speech recognition from audio segments |

Other providers can be added when their APIs support the features required by your chosen model. Speech recognition and translation may use different providers.

### Add a service in the app

1. Open **Provider Settings**, create a provider, and enter a name in **Provider ID**.
2. Fill in the **Base URL** and **API Key**. Copy the relevant Base URL from the tables below.
3. Add the model ID manually, or use **Fetch model list** if supported. Choose the matching model type.
4. For chat models, enable only the `audio`, `image`, `text`, and `tools` capabilities the model actually supports. Capabilities are not detected automatically.
5. Save, then assign the models under **System configuration**.

A failed model-list request does not prevent manual setup. Streaming services may require you to enter the model ID yourself.

### Streaming speech recognition: Nari Labs

| Field | Value |
| --- | --- |
| Base URL | `https://api.narilabs.com/v1` |
| Model type | Streaming transcription, **nariLab** |
| Model ID | `qwen3-asr` or `qwen3-asr-fast` |

These settings follow the official [transcription guide](https://docs.narilabs.com/transcribe-audio) and [model list](https://docs.narilabs.com/models-and-pricing). Use a Nari Labs API key, including when the model name contains Qwen.

### Streaming speech recognition: Qwen

Choose the region where you created your API key. **China and international API keys, model lists, and service access are region-specific.** See the official [regional settings](https://www.alibabacloud.com/help/en/model-studio/regions).

The following are the Base URLs to enter in this app. Both Qwen streaming model types use the same Base URL for a given region:

| Region | Base URL |
| --- | --- |
| China (Beijing), existing DashScope address | `https://dashscope.aliyuncs.com/api-ws/v1` |
| International (Singapore), existing DashScope address | `https://dashscope-intl.aliyuncs.com/api-ws/v1` |
| China (Beijing), workspace address | `https://YOUR_WORKSPACE_ID.cn-beijing.maas.aliyuncs.com/api-ws/v1` |
| International (Singapore), workspace address | `https://YOUR_WORKSPACE_ID.ap-southeast-1.maas.aliyuncs.com/api-ws/v1` |

Alibaba Cloud recommends workspace addresses; the existing DashScope addresses remain supported. Replace `YOUR_WORKSPACE_ID` with your actual workspace ID, or use the API Host shown in your console followed by `/api-ws/v1`. The app handles the streaming connection. See the official [Qwen realtime guide](https://www.alibabacloud.com/help/en/model-studio/qwen-asr-realtime-interaction-process) and [Fun-ASR guide](https://www.alibabacloud.com/help/en/model-studio/fun-asr-realtime-websocket-api).

| Model family | Model type to select | Example model ID |
| --- | --- | --- |
| Qwen ASR realtime | **qwen-asr-realtime** | `qwen3-asr-flash-realtime` |
| Qwen Audio / Fun-ASR | **qwen-audio / fun-asr** | `fun-asr-realtime` |

Check model availability in your selected region. These addresses are for streaming recognition. If you also use Qwen for text translation, add a separate provider using the chat Base URL supplied by the console.

### Speech recognition from audio segments: MiniMax

| Region | Base URL | Model type | Example model ID |
| --- | --- | --- | --- |
| China | `https://api.minimax.cn/v1` | Speech transcription, **minimax** | `asr-1.0` |
| International | `https://api.minimax.io/v1` | Speech transcription, **minimax** | `asr-1.0` |

Use an API key for the corresponding platform. In this app, MiniMax handles microphone speech segments, so it cannot be selected as the system audio streaming model. Refer to the official [China speech recognition guide](https://platform.minimax.cn/docs/api-reference/speech-to-text) or [international guide](https://platform.minimax.io/docs/api-reference/speech-to-text).

### Assign models to features

| Setting | Required model |
| --- | --- |
| Voice transcription model | A supported speech recognition model, or a chat model with `audio` |
| Voice translation model | A chat model with `text` |
| Voice direct translation model | A chat model with `audio + text + tools` |
| OCR model | A chat model with `image + text + tools` |
| System audio transcription model | A streaming speech recognition model, such as Nari Labs or Qwen streaming |
| System audio translation model | A chat model with `text` |

Select **Transcribe, then translate** to use separate recognition and translation models. Select **Translate directly** for one compatible model that translates audio directly; this mode has no separate transcript.

## Output languages and translation settings

The **Output template** controls the languages and message sent to VRChat. Use placeholders such as `#{zh}`, `#{en}`, `#{ja}`, and `#{ko}`. Codes must contain exactly two lowercase letters; at least one placeholder is required. Other text is preserved. **Template Generator** lets you choose languages without writing placeholders manually.

For text translation models with tool support, **Batch Translate** off uses one tool call for all languages; on sends a separate concurrent request per language. Models without tool support always use separate requests. Direct audio translation requires tool support.

Under **Prompt Settings**, you can save custom text translation instructions. `#text` represents the input text and `#target` represents the target language or languages. These differ from output placeholders such as `#{en}`.

## System audio subtitles

1. Under **System configuration**, choose the **System audio transcription model**, **System audio translation model**, and **System audio target language**.
2. In **Speech Recognition** → **System audio**, click **Open Subtitles**, then **Start**.
3. Play the audio you want to recognize. Original text and translations appear in the floating window.
4. Click **Stop** in the system audio section when finished. Closing the subtitle window alone does not stop capture.

You can move, resize, or lock the subtitle window, adjust background opacity, and change font size, color, and weight separately for original text and translations. System audio capture depends on your operating system and capture permissions.

Subtitles can run alongside microphone translation. They use their own target language and do not automatically send messages to VRChat.

## Image translation

1. Choose an **OCR model** under **System configuration**.
2. Open **Image Translation** and select a target language.
3. Click **Clipboard** or **Select File** to recognize and translate an image.

PNG, JPEG, and WebP files are supported. Original text and translations appear separately in the app and are not automatically sent to VRChat.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| No model is available in a selector | Save the provider, then check the model type and declared capabilities |
| Fetching models fails | Add the model ID manually and check the Base URL and API key |
| Qwen returns an authentication error | Match the API key, Base URL, and model to the same region; replace the workspace placeholder when using a workspace address |
| Recognition works but no translation appears | Assign a text translation model as well as a speech recognition model |
| A tool-call error appears | Use a model that supports tools. For text translation, try enabling Batch Translate; direct audio translation and OCR still require tools |
| The microphone has no input | Check the selected device, recording permissions, and whether voice capture has started |
| System audio subtitles show no results | Confirm audio is playing, check the capture level and permissions, and select a streaming recognition model |
| The local recognition service is unavailable | Restart the packaged app; keep its bundled files together and check System Log |
| VRChat receives nothing | Enable OSC, keep both apps on the same computer, and check the output template. The current destination is `127.0.0.1:9000`; messages are sent at least one second apart |

Settings and API keys are saved on your device. Audio, text, and images are sent to the providers selected for the features you use.

## License

[MIT](LICENSE) © 2026 ased12138

## Developer documentation

- [Run from source, development, and packaging](docs/development.md)
- [Architecture, source layout, and API contracts](docs/architecture.md)
