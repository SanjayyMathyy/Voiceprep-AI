"""
STT (Speech-to-Text) REST API endpoint

POST /api/v1/stt/transcribe
  - Accepts a multipart audio file upload
  - Transcribes with Groq Whisper
  - Returns { "transcript": "..." }

This HTTP approach is far more reliable than sending audio over WebSocket
binary frames, which suffer from ordering/timing/disconnect issues.
"""
import logging
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
from app.core.security import get_current_user
from app.models.user import User
from app.services.stt_service import STTService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stt", tags=["Speech-to-Text"])


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file (wav, webm, ogg, mp4)"),
    mime_type: str = Form(default="audio/wav"),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe a candidate audio recording using Groq Whisper.

    - Accepts standard audio formats (WAV 16-bit PCM is recommended)
    - Returns the transcript text or the exact error description
    """
    audio_bytes = await audio.read()
    content_type = audio.content_type or mime_type

    logger.info(
        "STT HTTP: Received %d bytes from user %s (mime=%s, filename=%s)",
        len(audio_bytes), current_user.id, content_type, audio.filename
    )

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file received.")

    if len(audio_bytes) < 300:
        logger.warning("STT HTTP: Audio too small (%d bytes)", len(audio_bytes))
        return JSONResponse(
            status_code=422,
            content={"transcript": None, "error": "Audio recording was too short. Please speak for at least 1 second."}
        )

    transcript, error_detail = await STTService.transcribe_with_detail(
        audio_bytes=audio_bytes,
        mime_type=content_type
    )

    if transcript and transcript.strip():
        logger.info("STT HTTP: Transcript (%d chars): %s", len(transcript), transcript[:100])
        return {"transcript": transcript.strip(), "error": None, "bytes": len(audio_bytes)}
    else:
        logger.warning("STT HTTP: Whisper returned empty/error: %s", error_detail)
        return JSONResponse(
            status_code=200,
            content={
                "transcript": None,
                "error": error_detail or "Could not transcribe audio. Whisper detected no speech. Please speak louder/closer to the mic.",
                "bytes": len(audio_bytes)
            }
        )

