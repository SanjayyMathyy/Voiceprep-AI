"""
STT (Speech-to-Text) Service — Groq Whisper

Uses Groq's ultra-fast Whisper API to transcribe audio bytes.
Falls back gracefully if no API key is configured.

Supported audio formats: wav, mp3, mp4, mpeg, mpga, m4a, ogg, webm
"""
import io
import logging
from typing import Optional, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)


class STTService:
    """
    Transcribes audio bytes using Groq Whisper (whisper-large-v3-turbo).
    Average latency: ~200-400ms.
    """

    @staticmethod
    async def transcribe_with_detail(
        audio_bytes: bytes, mime_type: str = "audio/wav"
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Transcribe audio bytes and return (transcript, error_message).
        """
        if not audio_bytes or len(audio_bytes) < 300:
            return None, f"Audio too short ({len(audio_bytes) if audio_bytes else 0} bytes)"

        if not settings.GROQ_API_KEY:
            return None, "GROQ_API_KEY is not set in backend .env"

        try:
            from groq import AsyncGroq

            client = AsyncGroq(api_key=settings.GROQ_API_KEY)

            clean_mime, ext = STTService._clean_mime_and_ext(mime_type)
            filename = f"audio.{ext}"

            logger.info("STT: Sending %d bytes to Groq Whisper as '%s' (mime=%s, model=%s)",
                        len(audio_bytes), filename, clean_mime, settings.GROQ_WHISPER_MODEL)

            transcription = await client.audio.transcriptions.create(
                file=(filename, io.BytesIO(audio_bytes), clean_mime),
                model=settings.GROQ_WHISPER_MODEL,
                language=settings.STT_LANGUAGE,
                response_format="text",
            )

            if isinstance(transcription, str):
                text = transcription.strip()
            else:
                text = getattr(transcription, "text", "") or ""
                text = text.strip()

            logger.info("STT: Groq Whisper result (%d chars): %s", len(text), text[:120])
            return (text if text else None), None

        except Exception as e:
            logger.error("STT: Groq Whisper transcription failed: %s", e)
            return None, str(e)

    @staticmethod
    async def transcribe(audio_bytes: bytes, mime_type: str = "audio/wav") -> Optional[str]:
        """Convenience method that returns just the transcript string."""
        text, _ = await STTService.transcribe_with_detail(audio_bytes, mime_type)
        return text

    @staticmethod
    def _clean_mime_and_ext(mime_type: str) -> Tuple[str, str]:
        """
        Strips parameters (like ;codecs=opus) and maps to clean MIME + extension for Groq.
        """
        raw = (mime_type or "audio/wav").split(";")[0].strip().lower()

        ext_map = {
            "audio/wav": ("audio/wav", "wav"),
            "audio/x-wav": ("audio/wav", "wav"),
            "audio/wave": ("audio/wav", "wav"),
            "audio/webm": ("audio/webm", "webm"),
            "audio/ogg": ("audio/ogg", "ogg"),
            "audio/mp3": ("audio/mpeg", "mp3"),
            "audio/mpeg": ("audio/mpeg", "mp3"),
            "audio/mp4": ("audio/mp4", "mp4"),
            "audio/m4a": ("audio/m4a", "m4a"),
            "audio/x-m4a": ("audio/m4a", "m4a"),
        }

        return ext_map.get(raw, ("audio/wav", "wav"))
