# VRChat OSC Translator

[English](README.md) / [简体中文](README_CN.md)

## Overview

VRChat OSC Translator captures speech with voice activity detection (VAD), sends it to configurable OpenAI-compatible AI providers for transcription and translation, and sends the translated chat message to VRChat through OSC. It also includes an optional OCR workflow for recognizing and translating images.

## How it works

Choose one of two audio workflows:

- **Transcribe then translate:** a transcription model produces text, then a text translation model translates it. The transcription model can use `/audio/transcriptions`, or it can be a chat model with audio capability.
- **Direct translation:** one chat-completion model receives audio and returns translations directly. It must support **audio + text + tools**. This mode has no separate transcription result.

## Configure an AI provider

1. Open **Settings** → **Provider settings** and create a provider.
2. Enter a **Provider ID**, **Base URL**, and **API Key**. The Base URL is the API version root, usually ending in `/v1` without a trailing slash; for example, `https://api.openai.com/v1`.
3. Use **Get model list** to call `{baseURL}/models`, or add models manually.
4. Set each model type:
   - **Audio transcription** uses `/audio/transcriptions`.
   - **Chat completion** uses `/chat/completions`.
5. For chat models, declare the actual **audio**, **image**, **text**, and **tools** capabilities. Capabilities may initially all be enabled, but they are not detected automatically: correct them to match the provider.
6. Save the provider. Under **External API configuration**, choose a translation mode and models for each slot.

## Choose translation mode and models

| Model slot | Eligible model |
| --- | --- |
| transcription | Audio-transcription model, or chat model with audio |
| translation | Chat model with text |
| direct | Chat model with audio + text + tools |
| OCR | Chat model with image + text + tools |

Use **Transcribe then translate** when you need a transcription result or have separate speech and text models. Use **Direct translation** only with a model that meets every direct-slot capability requirement.

### Output template

The output template defines the VRChat message. Placeholders must use exactly two lowercase letters: `#{xx}`. For example:

```text
Me: #{en}
翻译：#{zh}
```

All non-placeholder text is preserved. A template with no language placeholder causes a configuration error.

### Batch translation

The name can be misleading. With a tool-capable translation model:

- **Off:** one structured tool call translates all target languages.
- **On:** one independent, concurrent request per target language, without tool calls.

The latter can increase request count and cost, but may help with providers whose tool calling is unreliable. Models without tools always use one request per target language.

## Use with VRChat

1. Enable OSC in VRChat.
2. In the audio panel, start listening and speak.
3. VAD detects the end of speech, then the selected workflow processes it.
4. The translated result is queued for VRChat.

Messages are sent to local UDP `127.0.0.1:9000` at `/chatbox/input`, with at least a one-second interval between sends. OCR results are displayed in the app and are not sent to VRChat automatically.

## Compatible APIs

| API capability | Requirement |
| --- | --- |
| Model discovery | Optional `GET /models` |
| Audio transcription | `POST /audio/transcriptions` returning `text` |
| Chat, direct translation, and OCR | `POST /chat/completions`, with the required `content`, `tool_calls`, `input_audio`, and/or `image_url` support for the chosen use case |

whisper.cpp, Ollama, LM Studio, OpenRouter, and similar services can be used only when the deployed version exposes the required compatible interface and capabilities. Check the provider's actual API behavior before configuring it.

## Recommended providers

These recommendations are grouped by region and translation mode. Pick the combination that matches your network access and preferred workflow.

### Direct translation mode (audio → translated text)

**For users in China:**

- **doubao-seed-2.0-mini** — [Volcengine Ark](https://console.volcengine.com/ark/region:cn-beijing/model/detail?name=doubao-seed-2-0-mini)

  Fast, lightweight direct audio translation with good Chinese support. Configure it as a chat-completion model with **audio + text + tools** capabilities and assign it to the **direct** slot.

**For users outside China:**

- **gemini-3.5-flash-lite** — [Google DeepMind](https://deepmind.google/models/gemini/flash-lite/)

  Low-latency multimodal model suitable for real-time audio translation. Configure it as a chat-completion model with **audio + text + tools** capabilities and assign it to the **direct** slot.

### Transcribe then translate mode

**For users in China:**

- Transcription: **mimo-v2.5-asr** — [Mi Mimo](https://mimo.mi.com/models/zh-CN/mimo-v2.5-asr)
- Translation: **deepseek-v4-flash** — [DeepSeek Platform](https://platform.deepseek.com/)

  Add two models under the same or separate providers: set the ASR model as **audio-transcription** and the translation model as **chat-completion (text + tools)**. Then choose **transcribe-then-translate** and assign each slot accordingly.

**For users outside China:**

- Transcription: **gpt-transcribe** — [OpenAI](https://developers.openai.com/api/docs/models/gpt-transcribe)
- Translation: **gpt-5.6-luna** — [OpenAI](https://developers.openai.com/api/docs/models/gpt-5.6-luna)

  Both models are available through the OpenAI API. Configure gpt-transcribe as **audio-transcription** and gpt-5.6-luna as **chat-completion (text + tools)**, then assign them to the transcription and translation slots.

## Troubleshooting

| Problem | Check |
| --- | --- |
| No models appear in a slot | Confirm the model type and declared capabilities match the slot requirements. |
| Getting the model list fails | Check Base URL, API Key, network access, and whether the provider supports `/models`. |
| Target language placeholder is missing | Add at least one `#{xx}` placeholder to the output template. |
| `missing required tool call` | The model may not support tools reliably; use a compatible model or try Batch translation. |
| `missing transcription text` | The transcription endpoint response is not compatible with the required `text` field. |
| VRChat receives nothing | Enable VRChat OSC and make sure Electron, not only Vite, is running. |

## Quick start from source

This repository does not provide a documented release download. Run it from source instead.

1. Install Node.js **24.14.0** (the version in `.nvmrc`).
2. Install dependencies:

   ```bash
   npm install
   ```

3. In one terminal, start the renderer:

   ```bash
   npm run dev
   ```

4. In a second terminal, start Electron:

   ```bash
   npm run electron-dev
   ```

OSC can only be sent when the app is running in Electron. Enable OSC in VRChat before using voice translation.

## Development

```bash
npm run build          # Type-check and build the renderer
npm run lint           # Format and lint source files
npm run electron-build # Build and package the Electron application
```

## License

MIT © 2026 ased12138
