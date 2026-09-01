from fastapi import APIRouter, Query, Response, HTTPException
from fastapi.responses import StreamingResponse
import io
from app.services.tts_service import TTSService

router = APIRouter(prefix="/tts", tags=["Neural TTS"])

@router.get("/voices")
async def list_neural_voices():
    """Returns the list of natural human neural voices."""
    return TTSService.get_available_voices()

@router.get("/synthesize")
async def synthesize_speech(
    text: str = Query(..., min_length=1, max_length=2000),
    voice: str = Query(default="en-US-JennyNeural"),
    speed: float = Query(default=1.0, ge=0.5, le=2.0)
):
    """
    Synthesizes natural human speech from text and streams the MP3 audio.
    """
    try:
        # Convert numeric speed to edge-tts rate format (e.g. "+0%", "+10%", "-10%")
        diff = int(round((speed - 1.0) * 100))
        rate_str = f"+{diff}%" if diff >= 0 else f"{diff}%"

        audio_bytes = await TTSService.synthesize_speech(text=text, voice=voice, rate=rate_str)
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=voice.mp3",
                "Cache-Control": "public, max-age=3600"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")
