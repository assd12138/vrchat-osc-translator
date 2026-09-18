import asyncio
import socket
from collections.abc import AsyncIterator
from typing import Protocol

from fastapi import FastAPI, WebSocket
from uvicorn import Config, Server
from zeroconf import ServiceInfo, Zeroconf


app = FastAPI()

SERVICE_TYPE = "_vt._tcp.local."
SERVICE_NAME = "M._vt._tcp.local."

zeroconf: Zeroconf | None = None


class TranscriptionSession(Protocol):
    """One bidirectional streaming transcription session."""

    async def send_pcm(self, pcm: bytes) -> None:
        """Accept a raw 16 kHz, mono, signed 16-bit little-endian PCM chunk."""
        ...

    def transcripts(self) -> AsyncIterator[str]:
        """Yield recognized text as it becomes available."""
        ...

    async def close(self) -> None:
        """Release provider resources for this session."""
        ...


class TranscriptionProvider(Protocol):
    """Factory implemented by a concrete provider such as Narilab later."""

    async def create_session(self) -> TranscriptionSession:
        """Create an isolated transcription session for one WebSocket client."""
        ...


class UnconfiguredTranscriptionSession:
    """Consumes PCM without emitting text until a provider is configured."""

    def __init__(self) -> None:
        self._transcripts: asyncio.Queue[str | None] = asyncio.Queue()

    async def send_pcm(self, pcm: bytes) -> None:
        del pcm

    async def transcripts(self) -> AsyncIterator[str]:
        while (text := await self._transcripts.get()) is not None:
            yield text

    async def close(self) -> None:
        await self._transcripts.put(None)


class UnconfiguredTranscriptionProvider:
    async def create_session(self) -> TranscriptionSession:
        return UnconfiguredTranscriptionSession()


transcription_provider: TranscriptionProvider = UnconfiguredTranscriptionProvider()


def set_transcription_provider(provider: TranscriptionProvider) -> None:
    """Install the concrete provider without coupling the WebSocket relay to it."""
    global transcription_provider
    transcription_provider = provider


@app.get("/health")
async def health():
    return {
        "ok": True,
    }


async def receive_pcm(websocket: WebSocket, session: TranscriptionSession) -> None:
    while True:
        message = await websocket.receive()
        if message["type"] == "websocket.disconnect":
            return

        pcm = message.get("bytes")
        if pcm is None:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": "Expected a binary PCM frame",
                }
            )
            continue
        await session.send_pcm(pcm)


async def send_transcripts(
    websocket: WebSocket, session: TranscriptionSession
) -> None:
    async for text in session.transcripts():
        await websocket.send_json({"type": "transcript", "text": text})


@app.websocket("/transcription")
async def transcription(websocket: WebSocket) -> None:
    """Relay raw PCM frames to a provider and return its text results.

    Client messages must be binary 16 kHz, mono, signed 16-bit little-endian PCM.
    Server messages are JSON text frames: {"type": "transcript", "text": "..."}.
    """
    await websocket.accept()
    session = await transcription_provider.create_session()
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
