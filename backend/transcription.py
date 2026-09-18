from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass


class TranscriptionConfigurationError(ValueError):
    """Raised when the renderer sends an invalid transcription configuration."""


@dataclass(frozen=True, slots=True)
class TranscriptionConfig:
    model_id: str
    api_key: str
    base_url: str
    model_type: str

    @classmethod
    def from_payload(cls, payload: object) -> "TranscriptionConfig":
        if not isinstance(payload, dict):
            raise TranscriptionConfigurationError("Configuration must be an object")
        return cls(
            model_id=cls._required_string(payload, "modelId"),
            api_key=cls._required_string(payload, "apiKey"),
            base_url=cls._required_string(payload, "baseURL"),
            model_type=cls._required_string(payload, "modelType"),
        )

    @staticmethod
    def _required_string(payload: dict[object, object], field: str) -> str:
        value = payload.get(field)
        if not isinstance(value, str) or not (value := value.strip()):
            raise TranscriptionConfigurationError(f"{field} is required")
        return value


class TranscriptionSession(ABC):
    """One bidirectional streaming transcription session."""

    @abstractmethod
    async def send_pcm(self, pcm: bytes) -> None:
        """Accept raw 16 kHz, mono, signed 16-bit little-endian PCM."""
        raise NotImplementedError

    @abstractmethod
    def transcripts(self) -> AsyncIterator[str]:
        """Yield recognized text as it becomes available."""
        raise NotImplementedError

    @abstractmethod
    async def close(self) -> None:
        """Release the resources held by this session."""
        raise NotImplementedError


class TranscriptionProvider(ABC):
    """Provider interface implemented by each streaming transcription API."""

    @property
    @abstractmethod
    def model_type(self) -> str:
        """Return the frontend model type handled by this provider."""
        raise NotImplementedError

    @abstractmethod
    async def create_session(self, config: TranscriptionConfig) -> TranscriptionSession:
        """Create and configure one provider session."""
        raise NotImplementedError
