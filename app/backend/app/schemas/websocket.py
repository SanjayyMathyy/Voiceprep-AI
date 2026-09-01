from pydantic import BaseModel
from typing import Optional, Literal, Dict, Any

# Client -> Server Messages
class WSClientMessage(BaseModel):
    type: Literal["start_interview", "answer", "pause", "resume", "end_interview"]
    question_id: Optional[str] = None
    transcript: Optional[str] = None
    duration_seconds: Optional[int] = 0

# Server -> Client Messages
class WSServerMessage(BaseModel):
    type: Literal[
        "interview_started",
        "question",
        "evaluation_started",
        "evaluation_complete",
        "next_question",
        "follow_up",
        "interview_completed",
        "error"
    ]
    question_id: Optional[str] = None
    text: Optional[str] = None
    evaluation: Optional[Dict[str, Any]] = None
    progress: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
