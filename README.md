# vrchat-translator

[简体中文](/README_CN.md) | [English](/README.md)

> ✨ Simple translator for VRChat, design to self-host the AI service or buy Sass api to use it.

## Quick Start

1. Download the latest release, no need to install
2. Input your transcribe api key/ model / baseurl
3. Input your translate api key/ model / baseurl
4. Customize the translation template by yourself, you can use the default template too.
5. Click Start, then it will send your microphone data to the transcribe api, and send the text to the translate api, after that, the final result will sent to the VRChat chatbox.

## How to get the api?

This software only use two kind of api
1. Transcribe api, it should be compatible with [openai audio transcription api](https://platform.openai.com/docs/api-reference/audio/createTranscription)
2. Translate api, it should be compatible with [openai chat completion api](https://platform.openai.com/docs/api-reference/chat/create)

For transcribe api, you can host it by use whisper-cpp(cpu transcribe it too slow to use, for gpu transcribe, it will cost about 500MB-1.5GB gpu memory depends on the model you choose)
For translate api, you can host it by ollama or llm studio, or just buy an api key from sass company like [openrouter](https://openrouter.ai/),some may even supply some free tiny models.

These keys should not be shared with anyone. The leak of auth key maybe cost you a lot of money.

## develop

Basically, it's easy to develop the frontend part by using nodejs, to run the tauri part, you need to setup the follow environment

1. [Rust](https://www.rust-lang.org/)
2. [Tauri](https://tauri.app/)
3. For openvr library, you also need to install MSVC/cmake/llvm to support the openvr-sys crates compile and static link openvr to application on windows. See also [openvr-sys](https://github.com/rust-openvr/rust-openvr?tab=readme-ov-file#requirements)