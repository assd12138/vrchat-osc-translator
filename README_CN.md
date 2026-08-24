# VRChat 翻译工具

[简体中文](/README_CN.md) | [English](/README.md)

> ✨ 专为 VRChat 设计的简易翻译工具，支持自行部署AI服务或购买SaaS API使用。

## 快速开始

1. 下载最新版本，无需安装即可使用
2. 输入你的语音转写API密钥/模型/接口地址
3. 输入你的翻译API密钥/模型/接口地址
4. 可自定义翻译模板，也可以使用默认模板
5. 点击开始，程序会将你的麦克风数据发送到语音转写API，转写后的文本会发送到翻译API，最终结果将发送到VRChat聊天框。

## 如何获取API？

本软件使用两类API：
1. 语音转写API，需要兼容[OpenAI语音转写API](https://platform.openai.com/docs/api-reference/audio/createTranscription)格式
2. 翻译API，需要兼容[OpenAI聊天补全API](https://platform.openai.com/docs/api-reference/chat/create)格式

语音转写API可使用whisper-cpp自行部署（CPU转写速度较慢不推荐使用，GPU转写根据选择的模型不同，大约需要500MB-1.5GB显存）
翻译API可使用ollama或llm studio自行部署，也可以直接从OpenRouter等SaaS服务商购买API密钥，部分服务商甚至提供免费的小型模型使用。

请勿与他人共享你的API密钥，密钥泄露可能会导致财产损失。

## 开发说明

桌面应用使用 Electron。请先安装 `.nvmrc` 中指定版本的 Node.js，然后安装依赖：

```bash
npm install
```

开发时，在一个终端中启动 Vite 渲染进程服务：

```bash
npm run dev
```

再在另一个终端中启动 Electron：

```bash
npm run electron-dev
```

构建桌面应用安装包：

```bash
npm run electron-build
```
