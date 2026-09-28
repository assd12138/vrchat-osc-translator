import base64
import json
import uuid
from collections.abc import AsyncIterator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from websockets.asyncio.client import connect

from transcription import (
    TranscriptionConfig,
    TranscriptionConfigurationError,
    TranscriptionProvider,
    TranscriptionSession,
)


class QwenTranscriptionError(RuntimeError):
    """Raised when Qwen rejects or closes a transcription session."""


def build_realtime_url(
    base_url: str, model_id: str = "qwen3-asr-flash-realtime"
) -> str:
    """Build the Qwen ASR realtime WebSocket URL from provider settings.

    The settings UI stores an HTTP(S) provider base URL, while Qwen accepts
    either HTTP(S) or WebSocket(S) forms for the same endpoint.  Keep custom
    hosts and paths intact so compatible gateways can be used as well.
    """

    parsed = urlsplit(base_url)
    if parsed.scheme not in {"http", "https", "ws", "wss"} or not parsed.netloc:
        raise TranscriptionConfigurationError(
            "Qwen baseURL must be an http(s) or ws(s) URL"
        )
    if parsed.fragment:
        raise TranscriptionConfigurationError(
            "Qwen baseURL must not include a fragment"
        )

    path = parsed.path.rstrip("/")
    if not path or path == "/":
        path = "/api-ws/v1/realtime"
    elif not path.endswith("/realtime"):
        path = f"{path}/realtime"

    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["model"] = model_id
    return urlunsplit(
        (
            "wss" if parsed.scheme in {"http", "https"} else parsed.scheme,
            parsed.netloc,
            path,
            urlencode(query),
            "",
        )
    )


def _event_id() -> str:
    return f"event_{uuid.uuid4().hex}"


def _event_error_message(event: dict[str, object]) -> str | None:
    error = event.get("error")
    if isinstance(error, dict):
        code = error.get("code")
        message = error.get("message")
        param = error.get("param")
        if isinstance(code, str) and isinstance(message, str):
            suffix = f" (param={param})" if isinstance(param, str) and param else ""
            return f"{code}: {message}{suffix}"
        if isinstance(message, str):
            return message
    if isinstance(error, str):
        return error
    message = event.get("error_message")
    return message if isinstance(message, str) else None


def raise_for_error(event: dict[str, object]) -> None:
    if event.get("type") not in {
        "error",
        "conversation.item.input_audio_transcription.failed",
    }:
        return
    message = _event_error_message(event)
    raise QwenTranscriptionError(
        message or "Qwen rejected the transcription session"
    )


async def receive_event(socket) -> dict[str, object]:
    try:
        payload = await socket.recv()
    except Exception as error:
        code = getattr(error, "code", None)
        reason = getattr(error, "reason", None)
        detail = f" code={code}" if code is not None else ""
        if reason:
            detail += f" reason={reason}"
        raise QwenTranscriptionError(
            f"Qwen transcription WebSocket closed unexpectedly{detail}{error}"
        ) from error

    if isinstance(payload, bytes):
        try:
            payload = payload.decode("utf-8")
        except UnicodeDecodeError as error:
            raise QwenTranscriptionError("Qwen sent invalid UTF-8 data") from error
    if not isinstance(payload, str):
        raise QwenTranscriptionError("Qwen sent an invalid event")
    try:
        event = json.loads(payload)
    except json.JSONDecodeError as error:
        raise QwenTranscriptionError("Qwen sent invalid JSON") from error
    if not isinstance(event, dict):
        raise QwenTranscriptionError("Qwen sent an invalid event")
    return event


def _partial_transcript(event: dict[str, object]) -> str | None:
    text = event.get("text")
    stash = event.get("stash")
    if isinstance(text, str) and isinstance(stash, str):
        return text + stash
    return text if isinstance(text, str) else None


class QwenTranscriptionSession(TranscriptionSession):
    def __init__(self, socket) -> None:
        self._socket = socket
        self._closed = False
        self._finished = False

    async def send_pcm(self, pcm: bytes) -> None:
        if not pcm or len(pcm) % 2:
            raise ValueError("PCM chunks must contain complete 16-bit samples")
        if self._closed:
            return
        await self._socket.send(
            json.dumps(
                {
                    "event_id": _event_id(),
                    "type": "input_audio_buffer.append",
                    "audio": base64.b64encode(pcm).decode("ascii"),
                }
            )
        )

    async def transcripts(self) -> AsyncIterator[str]:
        while True:
            event = await receive_event(self._socket)
            raise_for_error(event)
            event_type = event.get("type")
            if event_type == "conversation.item.input_audio_transcription.text":
                transcript = _partial_transcript(event)
                if transcript is not None:
                    yield transcript
            elif (
                event_type
                == "conversation.item.input_audio_transcription.completed"
            ):
                transcript = event.get("transcript")
                if not isinstance(transcript, str):
                    transcript = _partial_transcript(event)
                if transcript is not None:
                    yield transcript
            elif event_type == "session.finished":
                self._finished = True
                return

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        if not self._finished:
            try:
                await self._socket.send(
                    json.dumps({"event_id": _event_id(), "type": "session.finish"})
                )
            except Exception:
                pass
        await self._socket.close()


class QwenTranscriptionProvider(TranscriptionProvider):
    MODEL_TYPE = "qwen-audio-speech-to-text-realtime"

    @property
    def model_type(self) -> str:
        return self.MODEL_TYPE

    async def create_session(self, config: TranscriptionConfig) -> TranscriptionSession:
        if config.model_type != self.model_type:
            raise TranscriptionConfigurationError(
                f"Unsupported Qwen model type: {config.model_type}"
            )
        realtime_url = build_realtime_url(config.base_url, config.model_id)
        socket = await connect(
            realtime_url,
            additional_headers={
                "Authorization": f"Bearer {config.api_key}",
                "OpenAI-Beta": "realtime=v1",
            },
            proxy=None,
        )
        try:
            await socket.send(
                json.dumps(
                    {
                        "event_id": _event_id(),
                        "type": "session.update",
                        "session": {
                            "modalities": ["text"],
                            "input_audio_format": "pcm",
                            "sample_rate": 16000,
                            "input_audio_transcription": {},
                            "turn_detection": {
                                "type": "server_vad",
                                "threshold": 0.0,
                                "silence_duration_ms": 400,
                            },
                        },
                    }
                )
            )
            while True:
                event = await receive_event(socket)
                raise_for_error(event)
                if event.get("type") == "session.updated":
                    break
                if event.get("type") == "session.finished":
                    raise QwenTranscriptionError(
                        "Qwen finished the session before configuration"
                    )
        except BaseException:
            await socket.close()
            raise
        return QwenTranscriptionSession(socket)
