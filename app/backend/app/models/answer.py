import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    question_id = Column(String(36), ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False, unique=True)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    transcript = Column(Text, nullable=False)
    duration_seconds = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    question = relationship("InterviewQuestion", back_populates="answer")
