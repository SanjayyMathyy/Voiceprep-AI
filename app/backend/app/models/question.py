import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_question_id = Column(String(36), ForeignKey("interview_questions.id", ondelete="SET NULL"), nullable=True)
    
    question_text = Column(Text, nullable=False)
    intent = Column(String(255), nullable=True)
    rubric = Column(JSON, nullable=True) # List of rubric criteria
    difficulty = Column(String(50), default="medium", nullable=False)
    order_index = Column(Integer, default=0, nullable=False)
    is_followup = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("InterviewSession", back_populates="questions")
    answer = relationship("InterviewAnswer", back_populates="question", uselist=False, cascade="all, delete-orphan")
    evaluation = relationship("Evaluation", back_populates="question", uselist=False, cascade="all, delete-orphan")
