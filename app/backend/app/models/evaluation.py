import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    question_id = Column(String(36), ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    overall_score = Column(Float, nullable=False)
    criteria_scores = Column(JSON, nullable=True) # Dict of specific criteria: score
    strengths = Column(JSON, nullable=True) # List of strengths
    weaknesses = Column(JSON, nullable=True) # List of weaknesses
    missing_points = Column(JSON, nullable=True) # List of missed points
    feedback = Column(Text, nullable=False)
    follow_up_required = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    question = relationship("InterviewQuestion", back_populates="evaluation")
