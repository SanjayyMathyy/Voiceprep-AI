import io
import edge_tts
from typing import List, Dict, Any

NEURAL_VOICES = [
    {"id": "en-US-JennyNeural", "name": "Jenny (Natural US Female)", "gender": "Female", "locale": "en-US"},
    {"id": "en-US-GuyNeural", "name": "Guy (Professional US Male)", "gender": "Male", "locale": "en-US"},
    {"id": "en-US-AriaNeural", "name": "Aria (Expressive US Female)", "gender": "Female", "locale": "en-US"},
    {"id": "en-US-ChristopherNeural", "name": "Christopher (Executive US Male)", "gender": "Male", "locale": "en-US"},
    {"id": "en-GB-SoniaNeural", "name": "Sonia (British Natural Female)", "gender": "Female", "locale": "en-GB"},
    {"id": "en-GB-RyanNeural", "name": "Ryan (British Professional Male)", "gender": "Male", "locale": "en-GB"},
    {"id": "en-AU-NatashaNeural", "name": "Natasha (Australian Female)", "gender": "Female", "locale": "en-AU"},
    {"id": "en-IN-NeerjaNeural", "name": "Neerja (Indian English Female)", "gender": "Female", "locale": "en-IN"},
]

class TTSService:
    @staticmethod
    def get_available_voices() -> List[Dict[str, Any]]:
        return NEURAL_VOICES

    @staticmethod
    async def synthesize_speech(text: str, voice: str = "en-US-JennyNeural", rate: str = "+0%") -> bytes:
        """
        Synthesizes realistic neural human audio using edge-tts.
        Returns mp3 audio bytes.
        """
        # Validate voice or fallback
        valid_voice_ids = {v["id"] for v in NEURAL_VOICES}
        selected_voice = voice if voice in valid_voice_ids else "en-US-JennyNeural"

        communicate = edge_tts.Communicate(text=text, voice=selected_voice, rate=rate)
        
        audio_stream = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])
                
        audio_stream.seek(0)
        return audio_stream.getvalue()
