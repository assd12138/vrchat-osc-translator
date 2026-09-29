import asyncio
import json
from collections.abc import AsyncIterator
from urllib.parse import urlencode, urlsplit, urlunsplit

from aiohttp import ClientResponse, ClientSession, ClientTimeout

from transcription import (
    TranscriptionConfig,
    TranscriptionConfigurationError,
    TranscriptionProvider,
    TranscriptionSession,
)


class AudioCppTranscriptionError(RuntimeError):
    """The audio.cpp live transcription request failed."""


def segment_end(text: str) -> int | None:
    """Split long transcripts into phrases that the translation queue can consume."""
    limit = 100
    punctuation = ".!?。！？；;\n"
    first = min(
        (index for index, char in enumerate(text) if char in punctuation),
        default=-1,
    )
    if 0 <= first < limit:
        return first + 1
    if len(text) < limit:
        return None
    space = text.rfind(" ", limit // 2, limit)
    return space + 1 if space >= 0 else limit


def build_live_url(base_url: str, model_id: str) -> str:
    parsed = urlsplit(base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise TranscriptionConfigurationError("audio.cpp baseURL must be an http(s) URL")
    if parsed.query or parsed.fragment:
        raise TranscriptionConfigurationError(
            "audio.cpp baseURL must not include a query or fragment"
        )

    path = parsed.path.rstrip("/")
    if path.endswith("/audio/transcriptions/live"):
        pass
    elif path.endswith("/v1"):
        path += "/audio/transcriptions/live"
    else:
        path += "/v1/audio/transcriptions/live"
    return urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            path,
            urlencode(
                {
                    "model": model_id,
                    "sample_rate": 16000,
                    "channels": 1,
                    "sample_format": "s16le",
                }
            ),
            "",
        )
    )


class AudioCppTranscriptionSession(TranscriptionSession):
    def __init__(
        self,
        client: ClientSession,
        response: ClientResponse,
        audio: asyncio.Queue[bytes | None],
    ) -> None:
        self._client = client
        self._response = response
        self._audio = audio
        self._closed = False
        self._input_finished = False

    async def send_pcm(self, pcm: bytes) -> None:
        if not pcm or len(pcm) % 2:
            raise ValueError("PCM chunks must contain complete 16-bit samples")
        if self._closed or self._input_finished:
            return
        await self._audio.put(pcm)

    async def finish_input(self) -> None:
        if self._closed or self._input_finished:
            return
        self._input_finished = True
        await self._audio.put(None)

    async def transcripts(self) -> AsyncIterator[str]:
        complete_text = ""
        committed_length = 0
        last_partial = ""
        last_update = asyncio.get_running_loop().time()
        data_lines: list[str] = []
        async for raw_line in self._response.content:
            line = raw_line.decode("utf-8").rstrip("\r\n")
            if line.startswith(":"):
                continue
            if line.startswith("data:"):
                data_lines.append(line[5:].lstrip())
                continue
            if line:
                continue
            if not data_lines:
                continue
            payload = "\n".join(data_lines)
            data_lines.clear()
            if payload == "[DONE]":
                return
            try:
                event = json.loads(payload)
            except json.JSONDecodeError as error:
                raise AudioCppTranscriptionError("audio.cpp sent invalid SSE JSON") from error
            if not isinstance(event, dict):
                raise AudioCppTranscriptionError("audio.cpp sent an invalid SSE event")
            kind = event.get("type")
            if kind == "error":
                message = event.get("message") or event.get("error")
                if isinstance(message, dict):
                    message = message.get("message")
                raise AudioCppTranscriptionError(
                    str(message) if message else "audio.cpp transcription failed"
                )
            if kind == "transcript.text.delta":
                delta = event.get("delta")
                if isinstance(delta, str) and delta:
                    complete_text += delta
            elif kind == "transcript.text.done":
                text = event.get("text")
                if isinstance(text, str) and text.startswith(
                    complete_text[:committed_length]
                ):
                    complete_text = text
            else:
                continue

            pending = complete_text[committed_length:]
            while (end := segment_end(pending)) is not None:
                phrase = pending[:end].strip()
                committed_length += end
                pending = complete_text[committed_length:]
                if phrase and phrase != last_partial:
                    yield phrase
                last_partial = ""
                last_update = asyncio.get_running_loop().time()

            if kind == "transcript.text.done":
                phrase = pending.strip()
                if phrase and phrase != last_partial:
                    yield phrase
                committed_length = len(complete_text)
                last_partial = ""
            elif len(pending.strip()) >= 8:
                now = asyncio.get_running_loop().time()
                phrase = pending.strip()
                if now - last_update >= 1 and phrase != last_partial:
                    last_partial = phrase
                    last_update = now
                    yield phrase
        raise AudioCppTranscriptionError("audio.cpp closed the SSE stream before [DONE]")

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._response.close()
        await self._client.close()


class AudioCppTranscriptionProvider(TranscriptionProvider):
    MODEL_TYPE = "audio-cpp-live"

    @property
    def model_type(self) -> str:
        return self.MODEL_TYPE

    async def create_session(self, config: TranscriptionConfig) -> TranscriptionSession:
        if config.model_type != self.model_type:
            raise TranscriptionConfigurationError(
                f"Unsupported audio.cpp model type: {config.model_type}"
            )
        url = build_live_url(config.base_url, config.model_id)
        client = ClientSession(timeout=ClientTimeout(total=None, sock_connect=10))
        audio: asyncio.Queue[bytes | None] = asyncio.Queue(maxsize=32)

        async def audio_body() -> AsyncIterator[bytes]:
            while (chunk := await audio.get()) is not None:
                yield chunk

        headers = {
            "Accept": "text/event-stream",
            "Content-Type": "application/octet-stream",
            "Authorization": f"Bearer {config.api_key}",
        }
        try:
            response = await client.post(
                url,
                data=audio_body(),
                headers=headers,
                chunked=True,
                expect100=False,
                allow_redirects=False,
            )
            if response.status != 200:
                detail = (await response.text())[:500]
                response.close()
                raise AudioCppTranscriptionError(
                    f"audio.cpp returned HTTP {response.status}: {detail}"
                )
            return AudioCppTranscriptionSession(client, response, audio)
        except BaseException:
            await client.close()
            raise
