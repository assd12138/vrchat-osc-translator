# Development

[English](development.md) / [简体中文](development_CN.md)

[User guide](../README.md) · [Architecture and API contracts](architecture.md)

This guide covers running from source and maintaining the application. Packaged-app users can follow the user guide.

## Run from source

### Requirements

- **Node.js 24.14.0**, as specified in [`.nvmrc`](../.nvmrc). Use npm to install frontend and Electron dependencies.
- **Python >= 3.12** and **uv** for streaming microphone recognition or system audio subtitles. Python dependencies are defined in [`backend/pyproject.toml`](../backend/pyproject.toml).
- A Base URL, API key, and model ID for each speech, translation, or OCR service you plan to use.
- Microphone permission for voice capture. System audio capture depends on operating system and Electron support.

Non-streaming transcription, direct audio translation, manual text translation, and OCR do not use the Python gateway.

### 1. Install dependencies

From the repository root:

```bash
npm install
```

Configure providers in the app. The current startup workflow does not require API keys in `.env`.

### 2. Start the frontend

In the first terminal, from the repository root:

```bash
npm run dev
```

Vite uses the fixed port `1420` at `http://localhost:1420`. If the port is occupied, Vite exits instead of selecting another port.

### 3. Start the desktop window

Keep the frontend running. In a second terminal, from the repository root:

```bash
npm run electron-dev
```

This command compiles and watches the Electron main process and preload, then opens the desktop window. Changes to either restart Electron.

### 4. Start the streaming gateway when needed

For streaming transcription or system audio subtitles, run this in a third terminal:

```bash
cd backend
uv sync
uv run python ./main.py
```

The gateway listens on a dynamic port at `127.0.0.1` and advertises `_vt._tcp.local.` through mDNS / Zeroconf. Electron discovers it automatically; no local gateway port needs to be configured.

**Development mode does not start the gateway automatically.** Packaged desktop applications start the bundled gateway executable.

Opening Vite in a browser supports frontend development, but OSC, native subtitle windows, and local service discovery require the Electron preload. Use the Electron window for the full application.

## Development and packaging

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite frontend development server |
| `npm run electron-dev` | Watch and compile the main process and preload, then start Electron; requires Vite to be running |
| `npm run build` | Run `tsc && vite build` and write frontend output to `dist/` |
| `npm run preview` | Preview existing frontend output without Electron native features |
| `npm run lint` | Automatically format and statically check `src/` and `src-electron/` |
| `npm run electron-build` | Compile the frontend, main process, and preload, package the gateway with PyInstaller, then generate desktop distributions with electron-builder |
| `npm run electron-build-render` | Frontend build used internally by the release script; outputs to `dist-electron/render/` |

The release entry point is [`scripts/release-electron.js`](../scripts/release-electron.js). It requires Node.js, Python, and uv; gateway packaging dependencies are in the Python `dev` dependency group. Distributions are written to `release/`. The release script first clears `dist-electron/`, `release/`, and previous backend build artifacts.

Follow [`AGENTS.md`](../AGENTS.md) when making changes: do not add tests. Documentation-only changes do not require `npm run lint`. After source changes, including changes that also update documentation, run `npm run lint` and review its automatic fixes. If build verification is needed, use only `npm run build`; do not run Electron development or packaging commands to verify changes.
