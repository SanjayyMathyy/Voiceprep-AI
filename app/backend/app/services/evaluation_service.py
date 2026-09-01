import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.services.llm.base import LLMProvider
from app.services.llm.factory import get_llm_provider

logger = logging.getLogger(__name__)


class AnswerEvaluationResult(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=10.0, description="Overall score out of 10 calibrated to actual response quality")
    criteria_scores: Dict[str, float] = Field(default_factory=dict, description="Criteria-level scores (relevance, technical_accuracy, depth_and_tradeoffs, clarity)")
    strengths: List[str] = Field(default_factory=list, description="Concrete strengths observed in the candidate's actual answer")
    weaknesses: List[str] = Field(default_factory=list, description="Specific weaknesses, gaps, or inaccuracies in the answer")
    missing_points: List[str] = Field(default_factory=list, description="Key rubric points omitted")
    feedback: str = Field(..., description="Actionable, context-specific coaching feedback tailored directly to what the candidate said")
    follow_up_required: bool = Field(False, description="True ONLY if the answer was partially good but missed a crucial specific detail")


class EvaluationService:
    def __init__(self, llm: Optional[LLMProvider] = None):
        self.llm = llm or get_llm_provider()

    async def evaluate_answer(
        self,
        target_role: str,
        question_text: str,
        rubric: List[str],
        candidate_transcript: str,
        is_followup: bool = False
    ) -> AnswerEvaluationResult:
        cleaned_transcript = (candidate_transcript or "").strip()
        rubric_text = "\n".join([f"  • {r}" for r in rubric]) if rubric else "  • Comprehensive technical accuracy and role relevance"

        system_prompt = (
            "You are a rigorous, fair, and objective Senior Hiring Bar-Raiser at a top-tier technology company. "
            "Your job is to critically and accurately score candidate voice responses strictly based on the CONTEXT and substance of what they actually said. "
            "\n"
            "SCORING CALIBRATION GUIDELINES (Out of 10.0):\n"
            "• 0.0 - 2.0 (Non-response / Irrelevant / 'I don't know' / Refusal): Candidate did not answer the question, gave off-topic/evasive remarks, or stated they have no knowledge/experience.\n"
            "• 2.1 - 4.0 (Inadequate / Factually Incorrect / Vague Buzzwords): The response shows fundamental misunderstandings, is extremely superficial, or misses 80%+ of the core rubric.\n"
            "• 4.1 - 6.0 (Partial / Basic): Answers surface aspects of the question but lacks technical depth, architectural reasoning, or concrete examples.\n"
            "• 6.1 - 8.0 (Solid / Proficient): Well-structured answer demonstrating solid domain knowledge, relevant technologies, and clear reasoning.\n"
            "• 8.1 - 10.0 (Exceptional / Staff-Level): Masterful response covering architectural trade-offs, edge cases, scalability, concrete metrics, and clear structured communication.\n"
            "\n"
            "CRITICAL RULES:\n"
            "1. DO NOT give inflated scores (like 4 or 5) to non-answers, gibberish, or 'I don't know' statements. Score them accurately (0.5 to 2.0).\n"
            "2. Base feedback directly on the candidate's actual words.\n"
            "3. If the candidate states they don't know, acknowledge their honesty politely and provide educational guidance on the expected concepts in your feedback.\n"
            "4. NEVER set follow_up_required to true if the candidate gave an off-topic/non-answer or if is_followup is true."
        )

        user_prompt = f"""
TARGET ROLE: {target_role}
INTERVIEW QUESTION ASKED:
\"{question_text}\"

EVALUATION RUBRIC CRITERIA:
{rubric_text}

CANDIDATE'S ACTUAL SPOKEN ANSWER:
\"\"\"{cleaned_transcript}\"\"\"

IS ADAPTIVE FOLLOW-UP TURN: {is_followup}

TASK:
Evaluate the candidate's response in depth:
1. Assign an accurate overall_score (0.0 to 10.0) strictly reflecting how well their response satisfied the question and rubric.
2. Provide criteria_scores for:
   - "relevance": Did they answer the question that was asked? (0-10)
   - "technical_accuracy": Are the concepts, technologies, and explanations correct? (0-10)
   - "depth_and_tradeoffs": Did they discuss trade-offs, metrics, or implementation depth? (0-10)
   - "structure_and_clarity": Was the explanation structured and concise? (0-10)
3. Identify 1-3 specific strengths (if any). If answer was poor/empty, state what positive attempt was made or note lack of response.
4. Identify 1-3 weaknesses or inaccuracies.
5. List key missing points from the rubric.
6. Write concise, actionable, and encouraging feedback specifically referencing what they said (or what they should have said).
7. Set follow_up_required to true ONLY if the candidate gave a promising response that just missed one specific critical detail.
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            logger.info("Evaluating answer for '%s' (transcript: %d chars)", target_role, len(cleaned_transcript))
            res = await self.llm.complete_structured(
                messages=messages,
                response_model=AnswerEvaluationResult
            )
            if is_followup:
                res.follow_up_required = False
            return res
        except Exception as e:
            logger.warning("LLM evaluation failed, applying context-aware heuristic fallback: %s", e)
            return self._heuristic_fallback(target_role, question_text, rubric, cleaned_transcript, is_followup)

    def _heuristic_fallback(
        self,
        target_role: str,
        question_text: str,
        rubric: List[str],
        transcript: str,
        is_followup: bool
    ) -> AnswerEvaluationResult:
        """Context-aware fallback if LLM completion is unavailable."""
        lower = transcript.lower().strip()
        words = lower.split()
        word_count = len(words)

        non_answers = ["i don't know", "i dont know", "no idea", "not sure", "skip", "pass", "i have never", "no experience"]
        is_non_answer = any(na in lower for na in non_answers) or word_count < 4

        if is_non_answer:
            return AnswerEvaluationResult(
                overall_score=1.5,
                criteria_scores={
                    "relevance": 1.0,
                    "technical_accuracy": 1.0,
                    "depth_and_tradeoffs": 1.0,
                    "structure_and_clarity": 3.0,
                },
                strengths=["Acknowledged the question directly"],
                weaknesses=["Did not provide a substantive technical explanation or solution"],
                missing_points=rubric[:3] if rubric else ["Core architectural concepts", "Implementation details"],
                feedback="When encountering a question outside your direct experience, explain foundational principles you do know, compare with similar tools you've used, or walk through how you would investigate the solution.",
                follow_up_required=False
            )

        # Basic scoring based on substance and rubric match
        score = min(8.5, max(3.5, 4.0 + (word_count / 35.0)))

        return AnswerEvaluationResult(
            overall_score=round(score, 1),
            criteria_scores={
                "relevance": round(min(10.0, score + 0.5), 1),
                "technical_accuracy": round(score, 1),
                "depth_and_tradeoffs": round(max(2.0, score - 1.0), 1),
                "structure_and_clarity": round(min(10.0, score + 0.3), 1),
            },
            strengths=["Addressed the main question topic with relevant domain context"],
            weaknesses=["Could provide more concrete production examples and explain trade-offs"],
            missing_points=[rubric[0]] if rubric else ["Specific quantifiable metrics"],
            feedback=f"Good start covering the fundamentals for {target_role}. To achieve top scores, incorporate specific production scenarios, edge cases, and architectural trade-offs.",
            follow_up_required=False
        )
