import json
import uuid
from collections.abc import AsyncIterator
from urllib.parse import urlsplit, urlunsplit

from websockets.asyncio.client import connect

from transcription import (
    TranscriptionConfig,
    TranscriptionConfigurationError,
    TranscriptionProvider,
    TranscriptionSession,
)


class QwenInferenceError(RuntimeError):
    """Raised when an inference task fails or its WebSocket closes unexpectedly."""


def build_inference_url(base_url: str) -> str:
    parsed = urlsplit(base_url)
    if parsed.scheme not in {"http", "https", "ws", "wss"} or not parsed.netloc:
        raise TranscriptionConfigurationError(
            "Qwen inference baseURL must be an http(s) or ws(s) URL"
        )
    if parsed.query or parsed.fragment:
        raise TranscriptionConfigurationError(
            "Qwen inference baseURL must not include a query or fragment"
        )

    path = parsed.path.rstrip("/")
    if not path:
        path = "/api-ws/v1/inference"
    elif path.endswith("/realtime"):
        path = f"{path[:-len('/realtime')]}/inference"
    elif not path.endswith("/inference"):
        path = f"{path}/inference"
    return urlunsplit(
        (
            "wss" if parsed.scheme in {"http", "https"} else parsed.scheme,
            parsed.netloc,
            path,
            "",
            "",
        )
    )


async def receive_event(socket) -> dict[str, object]:
    try:
        raw = await socket.recv()
    except Exception as error:
        raise QwenInferenceError(
            f"Qwen inference WebSocket closed unexpectedly: {error}"
        ) from error
    if isinstance(raw, bytes):
        try:
            raw = raw.decode("utf-8")
        except UnicodeDecodeError as error:
            raise QwenInferenceError("Qwen inference sent invalid UTF-8") from error
    try:
        event = json.loads(raw)
    except (TypeError, json.JSONDecodeError) as error:
        raise QwenInferenceError("Qwen inference sent invalid JSON") from error
    if not isinstance(event, dict):
        raise QwenInferenceError("Qwen inference sent an invalid event")
    return event


def event_type(event: dict[str, object], task_id: str) -> str | None:
    header = event.get("header")
    if not isinstance(header, dict):
        raise QwenInferenceError("Qwen inference event has no header")
    if header.get("task_id") != task_id:
        raise QwenInferenceError("Qwen inference event has an unexpected task ID")
    kind = header.get("event")
    if kind == "task-failed":
        code = header.get("error_code")
        message = header.get("error_message")
        detail = ": ".join(
            part for part in (code, message) if isinstance(part, str) and part
        )
        raise QwenInferenceError(detail or "Qwen inference task failed")
    return kind if isinstance(kind, str) else None


class QwenInferenceSession(TranscriptionSession):
    def __init__(self, socket, task_id: str) -> None:
        self._socket = socket
        self._task_id = task_id
        self._closed = False
        self._finished = False
        self._last_sent: dict[int, str] = {}

    async def send_pcm(self, pcm: bytes) -> None:
        if not pcm or len(pcm) % 2:
            raise ValueError("PCM chunks must contain complete 16-bit samples")
        if not self._closed and not self._finished:
            await self._socket.send(pcm)

    async def transcripts(self) -> AsyncIterator[str]:
        while True:
            event = await receive_event(self._socket)
            kind = event_type(event, self._task_id)
            if kind == "task-finished":
                self._finished = True
                return
            if kind != "result-generated":
                continue
            payload = event.get("payload")
            output = payload.get("output") if isinstance(payload, dict) else None
            sentence = output.get("sentence") if isinstance(output, dict) else None
            if not isinstance(sentence, dict) or sentence.get("heartbeat") is True:
                continue
            text = sentence.get("text")
            sentence_id = sentence.get("sentence_id")
            if not isinstance(text, str) or not text or not isinstance(sentence_id, int):
                continue
            if self._last_sent.get(sentence_id) != text:
                self._last_sent[sentence_id] = text
                yield text

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        if not self._finished:
            try:
                await self._socket.send(
                    json.dumps(
                        {
                            "header": {
                                "action": "finish-task",
                                "task_id": self._task_id,
                                "streaming": "duplex",
                            },
                            "payload": {"input": {}},
                        }
                    )
                )
            except Exception:
                pass
        await self._socket.close()


class QwenInferenceTranscriptionProvider(TranscriptionProvider):
    MODEL_TYPE = "qwen-audio-speech-to-text-inference"

    @property
    def model_type(self) -> str:
        return self.MODEL_TYPE

    async def create_session(self, config: TranscriptionConfig) -> TranscriptionSession:
        if config.model_type != self.model_type:
            raise TranscriptionConfigurationError(
                f"Unsupported Qwen inference model type: {config.model_type}"
            )

        socket = await connect(
            build_inference_url(config.base_url),
            additional_headers={"Authorization": f"Bearer {config.api_key}"},
            proxy=None,
        )
        task_id = str(uuid.uuid4())
        try:
            await socket.send(
                json.dumps(
                    {
                        "header": {
                            "action": "run-task",
                            "task_id": task_id,
                            "streaming": "duplex",
                        },
                        "payload": {
                            "task_group": "audio",
                            "task": "asr",
                            "function": "recognition",
                            "model": config.model_id,
                            "parameters": {"format": "pcm", "sample_rate": 16000},
                            "input": {},
                        },
                    }
                )
            )
            while True:
                event = await receive_event(socket)
                kind = event_type(event, task_id)
                if kind == "task-started":
                    return QwenInferenceSession(socket, task_id)
                if kind == "task-finished":
                    raise QwenInferenceError("Qwen inference task ended before it started")
        except BaseException:
            await socket.close()
            raise
