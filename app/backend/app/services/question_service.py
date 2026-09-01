import logging
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.services.llm.base import LLMProvider
from app.services.llm.factory import get_llm_provider

logger = logging.getLogger(__name__)


class GeneratedQuestion(BaseModel):
    question_text: str = Field(..., description="The spoken interview question (natural, concise, 1-2 conversational sentences)")
    intent: str = Field(..., description="The specific objective, skill, or architectural domain being evaluated")
    rubric: List[str] = Field(..., description="3-5 key criteria the candidate's answer must cover for a top rating")
    difficulty: str = Field("medium", description="Difficulty level (easy, medium, hard)")
    is_followup: bool = Field(False, description="Whether this is an adaptive follow-up question")


class QuestionService:
    def __init__(self, llm: Optional[LLMProvider] = None):
        self.llm = llm or get_llm_provider()

    def _build_rich_resume_dossier(self, resume_data: Optional[Dict[str, Any]]) -> str:
        """Constructs a detailed, structured summary of the candidate's actual resume."""
        if not resume_data:
            return "No resume provided. Generate role-relevant questions for the target position."

        sections = []

        # Candidate Summary
        if resume_data.get("summary"):
            sections.append(f"Profile Summary: {resume_data['summary']}")

        # Technical & Core Skills
        tech_skills = resume_data.get("technical_skills") or resume_data.get("skills") or []
        if tech_skills:
            sections.append(f"Core Technologies & Skills: {', '.join(tech_skills[:15])}")

        # Projects with descriptions and tech stacks
        projects = resume_data.get("projects") or []
        if projects:
            proj_lines = []
            for p in projects[:4]:
                if isinstance(p, dict):
                    name = p.get("name", "Project")
                    desc = p.get("description", "")
                    tech = ", ".join(p.get("technologies", []))
                    proj_lines.append(f"  • {name} (Tech: {tech}): {desc}")
                elif isinstance(p, str):
                    proj_lines.append(f"  • {p}")
            if proj_lines:
                sections.append("Key Projects on Resume:\n" + "\n".join(proj_lines))

        # Work Experience & Roles
        experience = resume_data.get("experience") or []
        if experience:
            exp_lines = []
            for exp in experience[:3]:
                if isinstance(exp, dict):
                    company = exp.get("company", "Company")
                    role = exp.get("role", "Engineer")
                    dur = exp.get("duration", "")
                    highlights = "; ".join(exp.get("highlights", [])[:3])
                    exp_lines.append(f"  • {role} at {company} ({dur}): {highlights}")
                elif isinstance(exp, str):
                    exp_lines.append(f"  • {exp}")
            if exp_lines:
                sections.append("Work Experience on Resume:\n" + "\n".join(exp_lines))

        # Achievements or Certifications
        achievements = resume_data.get("achievements") or []
        if achievements:
            sections.append("Achievements: " + "; ".join(achievements[:3]))

        return "\n\n".join(sections) if sections else "Candidate profile available."

    def _get_stage_focus(self, question_index: int, total_questions: int = 5, interview_type: str = "technical") -> str:
        """Determines the specific architectural/behavioral pillar for each question step."""
        if interview_type == "behavioral":
            stages = {
                1: "Icebreaker & Career Highlight: Probe a major project or leadership accomplishment mentioned on their resume.",
                2: "Conflict Resolution & Collaboration (STAR): Ask about technical disagreements, cross-functional collaboration, or managing differing opinions.",
                3: "Delivering Under Pressure & Deadlines (STAR): Ask about handling tight timelines, scope changes, or production emergencies.",
                4: "Mistakes & Learning (STAR): Ask about a significant technical mistake or failed initiative and the lessons learned.",
                5: "Mentorship, Culture & Long-term Vision: Ask about technical leadership, mentoring others, or setting code quality standards.",
            }
        else:
            # Technical / Role-specific interview progression
            stages = {
                1: "Resume Project Deep-Dive: Directly reference ONE specific project by name from their resume. Ask about their architectural design choices, why they picked specific tech stack components, and key technical challenges.",
                2: "Core Role Competency & Technical Edge Cases: Test deep conceptual knowledge relevant to the target role (e.g. concurrency, state management, caching, database indexing, API protocols, memory management).",
                3: "System Scalability & Production Resilience: Present a realistic failure scenario, 10x traffic spike, or distributed system bottleneck based on the technologies they use. Ask how they would architect the solution.",
                4: "Behavioral & Engineering Trade-offs (STAR): Ask how they balanced technical debt vs shipping speed, or handled a tough architectural trade-off with team stakeholders.",
                5: "Debugging, Incident Response & Optimization: Ask about diagnosing a difficult production outage, memory leak, or performance bottleneck in their domain.",
            }

        return stages.get(question_index, f"Question {question_index}: In-depth technical and problem-solving evaluation tailored to the role.")

    async def generate_next_question(
        self,
        target_role: str,
        interview_type: str,
        difficulty: str,
        resume_data: Optional[Dict[str, Any]] = None,
        previous_questions: Optional[List[Dict[str, Any]]] = None,
        question_index: int = 1,
        total_questions: int = 5,
    ) -> GeneratedQuestion:
        resume_dossier = self._build_rich_resume_dossier(resume_data)
        stage_focus = self._get_stage_focus(question_index, total_questions, interview_type)

        prev_q_list = []
        for i, q in enumerate(previous_questions or []):
            q_text = q.get("question_text", "")
            q_intent = q.get("intent", "")
            prev_q_list.append(f"  {i+1}. [Intent: {q_intent}] \"{q_text}\"")

        prev_q_text = "\n".join(prev_q_list) if prev_q_list else "  (None - this is the first question)"

        system_prompt = (
            "You are a top-tier Principal Hiring Manager and Staff Interviewer conducting a realistic, conversational voice interview. "
            "Your goal is to conduct an engaging, highly personalized, and distinct interview. "
            "NEVER repeat topics, questions, or themes from previous questions in the session. "
            "Directly ground your questions in the candidate's actual projects, technologies, and experience."
        )

        user_prompt = f"""
TARGET POSITION: {target_role}
INTERVIEW TYPE: {interview_type.upper()}
DIFFICULTY LEVEL: {difficulty.upper()}
QUESTION NUMBER: {question_index} of {total_questions}

CANDIDATE'S RESUME PROFILE:
{resume_dossier}

PREVIOUS QUESTIONS ALREADY ASKED IN THIS SESSION (DO NOT REPEAT OR OVERLAP WITH THESE):
{prev_q_text}

MANDATORY STAGE OBJECTIVE FOR QUESTION #{question_index}:
{stage_focus}

CRITICAL RULES:
1. DIVERSITY: Question #{question_index} MUST test a completely different topic and skill than all previous questions.
2. CONCRETENESS: If referencing a project, name the EXACT project title (e.g. from the resume) and specific technologies.
3. VOICE-OPTIMIZED: Keep the question natural and conversational for spoken voice audio (1 to 2 crisp sentences). Avoid convoluted multi-part paragraphs.
4. RUBRIC: Provide 3 to 4 specific evaluation criteria that define what an exceptional, senior-level response must address.
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            logger.info("Generating question #%d for %s (focus: %s)", question_index, target_role, stage_focus[:50])
            res = await self.llm.complete_structured(
                messages=messages,
                response_model=GeneratedQuestion
            )
            res.difficulty = difficulty
            res.is_followup = False
            return res
        except Exception as e:
            logger.warning("LLM question generation fallback triggered: %s", e)
            return self._generate_dynamic_fallback(target_role, interview_type, difficulty, question_index, resume_data)

    def _generate_dynamic_fallback(
        self,
        target_role: str,
        interview_type: str,
        difficulty: str,
        question_index: int,
        resume_data: Optional[Dict[str, Any]] = None
    ) -> GeneratedQuestion:
        """Generates dynamic, role-tailored fallback questions if LLM is unavailable."""
        projects = []
        if resume_data and isinstance(resume_data.get("projects"), list):
            for p in resume_data["projects"]:
                if isinstance(p, dict) and p.get("name"):
                    projects.append(p["name"])

        project_name = projects[0] if projects else "one of your key recent projects"

        fallbacks = {
            1: GeneratedQuestion(
                question_text=f"I saw that you worked on {project_name}. Could you walk me through the overall architectural decisions you made and why you selected your primary tech stack?",
                intent="Project Architecture & Technical Ownership",
                rubric=["Clear explanation of system components", "Justification for technology choices", "Handling of constraints and tradeoffs", "Quantifiable impact or metrics"],
                difficulty=difficulty,
                is_followup=False
            ),
            2: GeneratedQuestion(
                question_text=f"As a {target_role}, how do you approach diagnosing and resolving severe performance bottlenecks or latency spikes under high concurrent user load?",
                intent="Performance Optimization & Concurrency",
                rubric=["Systematic profiling methodology", "Database query and indexing optimization", "Caching strategies (Redis, CDN)", "Asynchronous processing"],
                difficulty=difficulty,
                is_followup=False
            ),
            3: GeneratedQuestion(
                question_text=f"Imagine a critical third-party service or database dependency goes down during peak traffic in your {target_role} system. How would you design for graceful degradation and automated recovery?",
                intent="Fault Tolerance & High Availability",
                rubric=["Circuit breakers and rate limiting", "Retry with exponential backoff and jitter", "Fallback mechanisms and cached reads", "Data consistency considerations"],
                difficulty=difficulty,
                is_followup=False
            ),
            4: GeneratedQuestion(
                question_text="Tell me about a time you had a fundamental technical disagreement with another engineer or stakeholder on architecture. How did you resolve it?",
                intent="Technical Leadership & Stakeholder Alignment (STAR)",
                rubric=["Data-driven, respectful communication", "Listening to counter-arguments and understanding constraints", "Finding a pragmatic compromise", "Focus on user and business outcomes"],
                difficulty=difficulty,
                is_followup=False
            ),
            5: GeneratedQuestion(
                question_text=f"Looking back at complex systems you've built for {target_role}, what was the most difficult production bug or outage you investigated, and how did you identify the root cause?",
                intent="Root Cause Analysis & Production Debugging",
                rubric=["Log analysis and distributed tracing", "Hypothesis testing and isolation", "Root cause determination vs symptom fixing", "Post-mortem prevention measures"],
                difficulty=difficulty,
                is_followup=False
            ),
        }

        return fallbacks.get(question_index, fallbacks[1])

    async def generate_followup_question(
        self,
        target_role: str,
        question_text: str,
        candidate_answer: str,
        missing_points: List[str]
    ) -> GeneratedQuestion:
        system_prompt = (
            "You are an AI interviewer conducting an adaptive voice interview. "
            "The candidate gave an initial answer that omitted important technical depth or concrete metrics. "
            "Generate a polite, natural follow-up question (1 concise sentence) asking them to elaborate specifically on the missing points."
        )
        user_prompt = f"""
Original Question: {question_text}
Candidate's Answer: {candidate_answer}
Missing / Shallow Points: {', '.join(missing_points)}

Generate a conversational, 1-sentence follow-up question probing these exact missing technical details.
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            res = await self.llm.complete_structured(
                messages=messages,
                response_model=GeneratedQuestion
            )
            res.is_followup = True
            return res
        except Exception:
            missing_text = missing_points[0] if missing_points else "the quantifiable impact, edge cases, and technical trade-offs"
            return GeneratedQuestion(
                question_text=f"That gives good context. Could you dive deeper into {missing_text}?",
                intent="Follow-up on depth and technical rigor",
                rubric=["Concrete technical explanation", "Measurable outcomes and trade-offs"],
                difficulty="medium",
                is_followup=True
            )
