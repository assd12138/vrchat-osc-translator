# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Tauri
- `npm run build` - Build the TypeScript and Vite application
- `npm run preview` - Preview the built application
- `npm run tauri` - Tauri CLI commands (build, dev, etc.)
- `npm run android:build` - Build for Android (if configured)

### Project Structure
- Frontend: `src/` - React application with Tauri integration
- Backend: `src-tauri/` - Rust backend with Tauri commands
- Configuration: `package.json`, `tsconfig.json`, `tauri.conf.json`
- Build output: `dist/` - Vite build artifacts

## Architecture Overview

### Core Components

**Main Application Flow:**
1. **Audio Processing**: `src/panel/audiopanel/index.tsx` - Voice Activity Detection using @ricky0123/vad-web
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
4. Translation sent via Tauri command to VRChat OSC

### State Management
- **Redux Store**: `src/store/settings.ts` - Application configuration
- **Event Bus**: `src/utils/eventBus.ts` - Component communication
- **LocalStorage**: Settings persistence via `redux_store` wrapper

### Tauri Backend
- **Main Command**: `send_to_vrc_chat` - Sends text to VRChat via OSC protocol
- **Dependencies**: `rosc` crate for OSC message encoding
- **Network**: UDP socket to localhost:9000 (VRChat OSC receiver)

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
- `src/panel/audiopanel/index.tsx` - Voice recognition and translation
- `src/panel/settingpanel/index.tsx` - Configuration interface
- `src/panel/translationpanel/index.tsx` - Translation display
- `src/panel/ocrpanel/index.tsx` - OCR functionality
- `src/panel/systemlog/index.tsx` - System event logging

### Backend
- `src-tauri/src/lib.rs` - Tauri commands and OSC integration
- `src-tauri/src/main.rs` - Application entry point

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
- All external API calls made from frontend with user-provided credentials