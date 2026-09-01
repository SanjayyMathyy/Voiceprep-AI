import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True, index=True)
    
    target_role = Column(String(255), nullable=False)
    interview_type = Column(String(50), nullable=False) # behavioral, technical, role_specific
    difficulty = Column(String(50), default="medium", nullable=False) # easy, medium, hard
    total_questions = Column(Integer, default=5, nullable=False)
    
    state = Column(String(50), default="IDLE", nullable=False)
    overall_score = Column(Float, nullable=True)
    
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="sessions")
    resume = relationship("Resume", back_populates="sessions")
    questions = relationship("InterviewQuestion", back_populates="session", cascade="all, delete-orphan", order_by="InterviewQuestion.order_index")
    report = relationship("InterviewReport", back_populates="session", uselist=False, cascade="all, delete-orphan")
