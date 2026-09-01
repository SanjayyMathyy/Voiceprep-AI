import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class InterviewReport(Base):
    __tablename__ = "interview_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    overall_score = Column(Float, nullable=False)
    category_scores = Column(JSON, nullable=True) # Dict of category: score
    strengths = Column(JSON, nullable=True) # List of overall strengths
    improvement_areas = Column(JSON, nullable=True) # List of areas for improvement
    summary = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("InterviewSession", back_populates="report")
