import asyncio
import json
import socket

from fastapi import FastAPI, WebSocket
from thirdApi.narilab import NarilabTranscriptionProvider
from transcription import (
    TranscriptionConfig,
    TranscriptionConfigurationError,
    TranscriptionProvider,
    TranscriptionSession,
)
from uvicorn import Config, Server
from zeroconf import ServiceInfo, Zeroconf


app = FastAPI()

SERVICE_TYPE = "_vt._tcp.local."
SERVICE_NAME = "M._vt._tcp.local."

zeroconf: Zeroconf | None = None


class TranscriptionProtocolError(ValueError):
    """Raised when the local WebSocket client violates the relay protocol."""


providers: dict[str, TranscriptionProvider] = {}


def register_transcription_provider(provider: TranscriptionProvider) -> None:
    """Register a provider implementation for the model type it handles."""
    if provider.model_type in providers:
        raise RuntimeError(f"Provider already registered: {provider.model_type}")
    providers[provider.model_type] = provider


register_transcription_provider(NarilabTranscriptionProvider())


@app.get("/health")
async def health():
    return {
        "ok": True,
    }


async def send_error(websocket: WebSocket, message: str) -> None:
    await websocket.send_json({"type": "error", "message": message})


async def receive_config(websocket: WebSocket) -> TranscriptionConfig:
    message = await websocket.receive()
    if message["type"] == "websocket.disconnect":
        raise TranscriptionProtocolError("Client disconnected before configuration")

    text = message.get("text")
    if not isinstance(text, str):
        raise TranscriptionProtocolError("First message must be a configuration frame")
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as error:
        raise TranscriptionProtocolError("Configuration must be valid JSON") from error
    if not isinstance(payload, dict) or payload.get("type") != "transcription.configure":
        raise TranscriptionProtocolError("Expected a transcription.configure message")
    return TranscriptionConfig.from_payload(payload.get("config"))


async def receive_pcm(websocket: WebSocket, session: TranscriptionSession) -> None:
    while True:
        message = await websocket.receive()
        if message["type"] == "websocket.disconnect":
            return

        pcm = message.get("bytes")
        if pcm is None:
            await send_error(websocket, "Expected a binary PCM frame")
            continue
        if not pcm or len(pcm) % 2:
            await send_error(websocket, "PCM frames must contain complete 16-bit samples")
            continue
        await session.send_pcm(pcm)


async def send_transcripts(
    websocket: WebSocket, session: TranscriptionSession
) -> None:
    try:
        async for text in session.transcripts():
            await websocket.send_json({"type": "transcript", "text": text})
    except Exception as error:
        await send_error(websocket, str(error))


@app.websocket("/transcription")
async def transcription(websocket: WebSocket) -> None:
    """Relay raw PCM frames to a provider and return its text results.

    The first client message configures the provider, followed by binary 16 kHz,
    mono, signed 16-bit little-endian PCM frames.
    Server messages are JSON text frames: {"type": "transcript", "text": "..."}.
    """
    await websocket.accept()
    try:
        config = await receive_config(websocket)
        provider = providers.get(config.model_type)
        if provider is None:
            raise TranscriptionConfigurationError(
                f"Unsupported transcription model type: {config.model_type}"
            )
        session = await provider.create_session(config)
    except (TranscriptionConfigurationError, TranscriptionProtocolError) as error:
        await send_error(websocket, str(error))
        await websocket.close(code=1008)
        return
    except Exception as error:
        await send_error(websocket, f"Unable to initialize transcription: {error}")
        await websocket.close(code=1011)
        return

    await websocket.send_json({"type": "ready"})
    receive_task = asyncio.create_task(receive_pcm(websocket, session))
    send_task = asyncio.create_task(send_transcripts(websocket, session))

    try:
        done, pending = await asyncio.wait(
            {receive_task, send_task}, return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
        for task in done:
            task.result()
    finally:
        await session.close()


def get_free_port() -> int:
    """
    System will allocate a random free port
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def startBroadcast(port: int):
    global zeroconf

    # addresses 和 port 都是实际业务服务的信息，不是 mDNS 自身端口
    info = ServiceInfo(
        type_=SERVICE_TYPE,
        name=SERVICE_NAME,
        addresses=[socket.inet_aton("127.0.0.1")],
        port=port,
    )

    zeroconf = Zeroconf()
    zeroconf.register_service(info)


def initAPI():
    port = get_free_port()
    startBroadcast(port)
    config = Config(
        app=app,
        host="127.0.0.1",
        port=port,
        log_level="info",
    )

    server = Server(config)

    try:
        server.run()
    finally:
        if zeroconf is not None:
            zeroconf.close()
