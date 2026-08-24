# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start the Vite renderer development server
- `npm run electron-dev` - Build/watch the main and preload processes, then launch Electron
- `npm run build` - Type-check and build the renderer
- `npm run electron-build` - Build and package the desktop application
- `npm run lint` - Format and lint the renderer and Electron sources

## Project Structure

- Renderer: `src/` - React application
- Desktop runtime: `src-electron/` - Electron main process, preload scripts, and IPC handlers
- Build scripts: `scripts/` - Electron development and packaging orchestration
- Configuration: `package.json`, `vite.config.ts`, and `tsconfig*.json`
- Build output: `dist-electron/` - Electron main, preload, and renderer artifacts

## Architecture Overview

### Core Components

**Main Application Flow:**
1. **Audio Processing**: `src/panel/audio-panel/index.tsx` - Voice Activity Detection using @ricky0123/vad-web
2. **Translation Pipeline**: Audio → Transcription API → Translation API → VRChat OSC
3. **Settings Management**: Redux store with localStorage persistence
4. **Internationalization**: i18next with multi-language support (en-US, ja-JP, ko-KR, zh-CN)

**Key APIs Used:**
- **Transcription API**: OpenAI-compatible audio transcription (whisper models)
- **Translation API**: OpenAI-compatible chat completion API
- **VRChat Integration**: OSC protocol via UDP to `/chatbox/input` endpoint

### Data Flow

1. User speaks → VAD detects speech → Audio captured as WAV
2. Audio sent to transcription API → Text extracted
3. Text + template sent to translation API → Translated text
4. Translation sent through Electron IPC to the VRChat OSC endpoint

### State Management

- **Redux Store**: `src/store/settings.ts` - Application configuration
- **Event Bus**: `src/utils/event-bus.ts` - Component communication
- **LocalStorage**: Settings persistence through the rehydration utilities

### Electron Runtime

- **Main process**: Owns the application window, screen picker, and IPC handlers
- **Preload scripts**: Expose the narrow renderer API through `contextBridge`
- **OSC integration**: Encodes and sends UDP messages to localhost:9000

### UI Structure

- **Panels**: Audio control, OCR, Translation, Settings, System Log
- **Styling**: Custom CSS with glitch animation effects
- **Components**: React functional components with hooks

### Configuration Options

- Transcription API URL/model/token
- Translation API URL/model/token
- AI translation template (with `{text}` placeholder)
- Language selection
- Real-time audio processing settings

## Key Files

### Frontend

- `src/App.tsx` - Main application container
- `src/panel/audio-panel/index.tsx` - Voice recognition and translation
- `src/panel/setting-panel/index.tsx` - Configuration interface
- `src/panel/translation-panel/index.tsx` - Translation display
- `src/panel/ocr-panel/index.tsx` - OCR functionality
- `src/panel/system-log/index.tsx` - System event logging

### Electron

- `src-electron/main/index.ts` - Main process entry point and application lifecycle
- `src-electron/preload/index.ts` - Renderer IPC bridge
- `src-electron/main/ipc/` - Main-process IPC routes
- `src-electron/main/utils/osc.ts` - VRChat OSC integration

### API Integration

- `src/api/translate.ts` - Transcription and translation API calls
- `src/api/index.ts` - HTTP request wrapper with timeout handling

### State Management

- `src/store/settings.ts` - Redux slice for application settings
- `src/store/rehydrate/` - Redux persistence utilities

## Development Notes

### API Compatibility

- Transcription API must support OpenAI audio transcription format
- Translation API must support OpenAI chat completion format
- Both APIs require Bearer token authentication

### VRChat Setup

- VRChat must have OSC enabled and listening on port 9000
- OSC receiver should handle `/chatbox/input` messages
- Text messages should include a boolean parameter for auto-submit

### Audio Processing

- Uses WebAssembly-based Voice Activity Detection
- Audio encoded as 16kHz WAV format
- Configurable speech detection thresholds

### Security Considerations

- API tokens stored in localStorage (client-side only)
- No server-side token handling
- External API calls are made from the renderer with user-provided credentials
- Native capabilities are exposed through the Electron preload bridge

### 开发者的提醒-禁止删除

- 添加一个store中的内容的时候，如果是api相关的，并且需要使用env来获得定义的时候，需要在.env中添加对应的环境变量，在vite-env.d.ts中添加对应环境变量的定义
