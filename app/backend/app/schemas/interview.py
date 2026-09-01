from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime

class CreateSessionRequest(BaseModel):
    resume_id: Optional[str] = None
    target_role: str
    interview_type: Literal["behavioral", "technical", "role_specific"] = "technical"
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    total_questions: int = Field(default=5, ge=1, le=15)

class QuestionResponse(BaseModel):
    id: str
    question_text: str
    intent: Optional[str] = None
    difficulty: str
    order_index: int
    is_followup: bool

    class Config:
        from_attributes = True

class EvaluationResponse(BaseModel):
    id: str
    overall_score: float
    criteria_scores: Optional[Dict[str, Any]] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    missing_points: Optional[List[str]] = None
    feedback: str
    follow_up_required: bool

    class Config:
        from_attributes = True

class InterviewSessionResponse(BaseModel):
    id: str
    target_role: str
    interview_type: str
    difficulty: str
    total_questions: int
    state: str
    overall_score: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
