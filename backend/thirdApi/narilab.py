import base64
import json
from collections.abc import AsyncIterator
from urllib.parse import urlsplit, urlunsplit

from websockets.asyncio.client import connect

from transcription import (
    TranscriptionConfig,
    TranscriptionConfigurationError,
    TranscriptionProvider,
    TranscriptionSession,
)


class NarilabTranscriptionError(RuntimeError):
    """Raised when Narilab rejects or closes a transcription session."""



def build_realtime_url(base_url: str) -> str:
    parsed = urlsplit(base_url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise TranscriptionConfigurationError(
            "Narilab baseURL must be an https URL"
        )
    if parsed.query or parsed.fragment:
        raise TranscriptionConfigurationError(
            "Narilab baseURL must not include a query or fragment"
        )

    return urlunsplit(
        (
            "wss",
            parsed.netloc,
            f"{parsed.path.rstrip('/')}/realtime",
            "intent=transcription",
            "",
        )
    )


def raise_for_error(event: dict[str, object]) -> None:
    if event.get("type") != "error":
        return

    error = event.get("error")
    if isinstance(error, dict):
        code = error.get("code")
        message = error.get("message")
        if isinstance(code, str) and isinstance(message, str):
            raise NarilabTranscriptionError(f"{code}: {message}")
    raise NarilabTranscriptionError("Narilab rejected the transcription session")


async def receive_event(socket) -> dict[str, object]:
    try:
        event = json.loads(await socket.recv())
    except json.JSONDecodeError as error:
        raise NarilabTranscriptionError("Narilab sent invalid JSON") from error
    if not isinstance(event, dict):
        raise NarilabTranscriptionError("Narilab sent an invalid event")
    return event


class NarilabTranscriptionSession(TranscriptionSession):
    def __init__(self, socket) -> None:
        self._socket = socket

    async def send_pcm(self, pcm: bytes) -> None:
        if not pcm or len(pcm) % 2:
            raise ValueError("PCM chunks must contain complete 16-bit samples")
        await self._socket.send(
            json.dumps(
                {
                    "type": "input_audio_buffer.append",
                    "audio": base64.b64encode(pcm).decode("ascii"),
                }
            )
        )

    async def transcripts(self) -> AsyncIterator[str]:
        while True:
            event = await receive_event(self._socket)
            raise_for_error(event)
            if event.get("type") not in {
                "transcript.partial",
                "transcript.completed",
            }:
                continue
            transcript = event.get("transcript")
            if isinstance(transcript, str):
                yield transcript

    async def close(self) -> None:
        await self._socket.close()


class NarilabTranscriptionProvider(TranscriptionProvider):
    MODEL_TYPE = "narilab-audio-speech-to-text"

    @property
    def model_type(self) -> str:
        return self.MODEL_TYPE

    async def create_session(self, config: TranscriptionConfig) -> TranscriptionSession:
        if config.model_type != self.model_type:
            raise TranscriptionConfigurationError(
                f"Unsupported Narilab model type: {config.model_type}"
            )

        socket = await connect(
            build_realtime_url(config.base_url),
            additional_headers={"Authorization": f"Bearer {config.api_key}"},
            proxy=None,
        )
        try:
            await socket.send(
                json.dumps(
                    {
                        "type": "session.configure",
                        "session": {
                            "model": config.model_id,
                            "turn_detection": {"type": "server_vad"},
                        },
                    }
                )
            )
            event = await receive_event(socket)
            raise_for_error(event)
            if event.get("type") != "session.configured":
                raise NarilabTranscriptionError(
                    f"Expected session.configured, received {event.get('type')}"
                )
        except BaseException:
            await socket.close()
            raise
        return NarilabTranscriptionSession(socket)
