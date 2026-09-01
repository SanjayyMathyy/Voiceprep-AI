from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class WorkExperience(BaseModel):
    company: str
    role: str
    duration: str
    highlights: List[str] = Field(default_factory=list)

class Education(BaseModel):
    institution: str
    degree: str
    year: Optional[str] = None

class Project(BaseModel):
    name: str
    description: str
    technologies: List[str] = Field(default_factory=list)

class StructuredResume(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    technical_skills: List[str] = Field(default_factory=list)
    experience: List[WorkExperience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)

class ResumeResponse(BaseModel):
    id: str
    original_filename: str
    status: str
    created_at: datetime
    extracted_data: Optional[StructuredResume] = None

    class Config:
        from_attributes = True
