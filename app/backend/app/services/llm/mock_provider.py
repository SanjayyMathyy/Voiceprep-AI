from typing import List, Dict, Any, Type, TypeVar
from pydantic import BaseModel
from app.services.llm.base import LLMProvider
from app.schemas.resume import StructuredResume, WorkExperience, Education, Project

T = TypeVar("T", bound=BaseModel)

class MockLLMProvider(LLMProvider):
    """Fallback smart mock provider when GROQ_API_KEY is not supplied in local mode"""
    
    async def complete_structured(
        self,
        messages: List[Dict[str, str]],
        response_model: Type[T],
        temperature: float = 0.2
    ) -> T:
        user_msg = ""
        for m in messages:
            if m.get("role") == "user":
                user_msg += m.get("content", "") + " "

        if response_model == StructuredResume:
            # Extract basic info from text heuristics
            lines = [l.strip() for l in user_msg.split("\n") if l.strip()]
            candidate_name = "Candidate"
            for line in lines[:5]:
                if len(line.split()) in [2, 3] and not any(c in line for c in ["@", ":", "/", "http"]):
                    candidate_name = line
                    break
            
            mock_resume = StructuredResume(
                name=candidate_name if candidate_name != "Candidate" else "Alex Morgan",
                email="alex.morgan@example.com",
                phone="+1 (555) 019-2834",
                summary="Passionate software engineer with hands-on experience in full-stack architecture, distributed systems, and real-time voice applications.",
                skills=["Python", "FastAPI", "React", "TypeScript", "SQLAlchemy", "PostgreSQL", "Docker", "WebSockets"],
                technical_skills=["System Design", "Microservices", "REST APIs", "Async Programming", "Database Optimization"],
                experience=[
                    WorkExperience(
                        company="TechNova Solutions",
                        role="Senior Full Stack Engineer",
                        duration="2022 - Present",
                        highlights=["Led architecture for real-time streaming pipeline", "Reduced API latency by 45% using Redis caching"]
                    ),
                    WorkExperience(
                        company="CloudScale Labs",
                        role="Backend Developer",
                        duration="2020 - 2022",
                        highlights=["Developed scalable REST & WebSocket APIs in FastAPI and Node.js", "Maintained 99.9% uptime for core user services"]
                    )
                ],
                education=[
                    Education(
                        institution="University of Technology",
                        degree="B.S. in Computer Science",
                        year="2020"
                    )
                ],
                projects=[
                    Project(
                        name="AI Voice Interview Coach",
                        description="Real-time voice simulation with adaptive follow-ups and performance evaluation.",
                        technologies=["React", "FastAPI", "Web Speech API", "Groq"]
                    )
                ],
                certifications=["AWS Certified Solutions Architect", "Professional Scrum Master"],
                achievements=["Winner of 2023 National Hackathon", "Published open-source library with 1k+ GitHub stars"]
            )
            return mock_resume # type: ignore

        # Default fallback instance
        try:
            return response_model() # type: ignore
        except Exception:
            return response_model.model_validate({}) # type: ignore

    async def complete_text(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7
    ) -> str:
        return "Thank you for sharing your answer. Let's move deeper into the technical architecture."
