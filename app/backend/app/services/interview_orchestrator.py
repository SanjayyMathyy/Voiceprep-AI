"""
Interview Orchestrator — Fixed version

Bug fixes:
1. State machine starts at SESSION_CREATED (not IDLE), so start_interview
   needs to handle SESSION_CREATED → PREPARING directly.
2. process_answer: allow EVALUATING when state is LISTENING or ASKING
   (TTS completion race conditions).
3. on_tts_completed: guard against double calls — do nothing if already LISTENING.
4. Error recovery: catch InvalidStateTransitionError and log instead of crashing WS.
"""

import json
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.session import InterviewSession
from app.models.question import InterviewQuestion
from app.models.answer import InterviewAnswer
from app.models.evaluation import Evaluation
from app.models.resume import Resume
from app.state_machine.interview_state import (
    InterviewStateMachine,
    InterviewState,
    InvalidStateTransitionError,
)
from app.services.question_service import QuestionService
from app.services.evaluation_service import EvaluationService
from app.core.database import AsyncSessionLocal

import logging
logger = logging.getLogger(__name__)


class InterviewOrchestrator:
    def __init__(self, session_id: str, websocket: WebSocket):
        self.session_id = session_id
        self.websocket = websocket
        # Start at IDLE — transition to SESSION_CREATED in initialize()
        self.state_machine = InterviewStateMachine(
            initial_state=InterviewState.IDLE
        )
        self.question_service = QuestionService()
        self.evaluation_service = EvaluationService()

        self.current_question: Optional[InterviewQuestion] = None
        self.questions_asked_count = 0
        self.total_questions = 5
        self.target_role = "Software Engineer"
        self.interview_type = "technical"
        self.difficulty = "medium"
        self.resume_data: Optional[Dict[str, Any]] = None
        self.scores: List[float] = []

    async def initialize(self):
        """Load session and resume from DB; put FSM into SESSION_CREATED."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(InterviewSession).where(
                    InterviewSession.id == self.session_id
                )
            )
            session = result.scalars().first()
            if not session:
                raise ValueError(f"Session {self.session_id} not found")

            self.target_role = session.target_role
            self.interview_type = session.interview_type
            self.difficulty = session.difficulty
            self.total_questions = session.total_questions

            if session.resume_id:
                res_result = await db.execute(
                    select(Resume).where(Resume.id == session.resume_id)
                )
                resume = res_result.scalars().first()
                if resume and resume.extracted_data:
                    self.resume_data = resume.extracted_data

        # Safely advance FSM from IDLE to SESSION_CREATED
        self._safe_transition(InterviewState.SESSION_CREATED)

    def _safe_transition(self, target: InterviewState) -> bool:
        """Attempt a state transition; log and return False if invalid instead of crashing."""
        try:
            self.state_machine.transition_to(target)
            return True
        except InvalidStateTransitionError as e:
            logger.warning("FSM transition skipped: %s", e)
            return False

    async def send_event(self, event_type: str, data: Dict[str, Any]):
        """Send a typed JSON event to the WebSocket client."""
        payload = {
            "type": event_type,
            "state": self.state_machine.current_state.value,
            **data,
        }
        await self.websocket.send_text(json.dumps(payload))

    async def start_interview(self):
        """Transition to PREPARING and generate first question."""
        if not self._safe_transition(InterviewState.PREPARING):
            return

        await self.send_event(
            "interview_started",
            {
                "message": f"Welcome! Starting your {self.target_role} interview.",
                "total_questions": self.total_questions,
                "current_question_index": 1,
            },
        )
        await self.ask_next_question()

    async def ask_next_question(self):
        """Generate, persist, and send the next primary interview question."""
        self.questions_asked_count += 1

        # 1. Fetch previously asked questions in this session to prevent repetition
        previous_questions_data = []
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(InterviewQuestion)
                .where(InterviewQuestion.session_id == self.session_id)
                .order_by(InterviewQuestion.order_index)
            )
            existing_questions = result.scalars().all()
            for q in existing_questions:
                previous_questions_data.append({
                    "question_text": q.question_text,
                    "intent": q.intent,
                    "order_index": q.order_index,
                    "is_followup": q.is_followup,
                })

        # 2. Generate question via LLM with full context
        gen_q = await self.question_service.generate_next_question(
            target_role=self.target_role,
            interview_type=self.interview_type,
            difficulty=self.difficulty,
            resume_data=self.resume_data,
            previous_questions=previous_questions_data,
            question_index=self.questions_asked_count,
            total_questions=self.total_questions,
        )

        # 3. Persist to database
        async with AsyncSessionLocal() as db:
            q_record = InterviewQuestion(
                session_id=self.session_id,
                question_text=gen_q.question_text,
                intent=gen_q.intent,
                rubric=gen_q.rubric,
                difficulty=gen_q.difficulty,
                order_index=self.questions_asked_count,
                is_followup=False,
            )
            db.add(q_record)
            await db.commit()
            await db.refresh(q_record)
            self.current_question = q_record

        # 3. Transition to ASKING and emit event
        if not self._safe_transition(InterviewState.ASKING):
            # Already in ASKING (e.g. double-call guard)
            pass

        await self.send_event(
            "question",
            {
                "question_id": self.current_question.id,
                "question_text": self.current_question.question_text,
                "intent": self.current_question.intent,
                "order_index": self.questions_asked_count,
                "total_questions": self.total_questions,
                "is_followup": False,
            },
        )

    async def on_tts_completed(self):
        """
        Called when the browser finishes playing TTS audio.
        Transitions FSM to LISTENING and opens the microphone window.
        Guard: if we're already LISTENING (e.g. TTS was skipped), do nothing.
        """
        current = self.state_machine.current_state
        if current == InterviewState.LISTENING:
            # Already listening — don't re-emit or double-open mic
            return

        if current != InterviewState.ASKING:
            logger.warning(
                "on_tts_completed called in unexpected state: %s", current.value
            )
            return

        self._safe_transition(InterviewState.LISTENING)
        await self.send_event(
            "listening_started",
            {
                "question_id": (
                    self.current_question.id if self.current_question else None
                ),
                "message": "Microphone active. You may now speak your answer.",
            },
        )

    async def process_answer(self, transcript: str, duration_seconds: int = 0):
        """
        Process the candidate's spoken answer transcript.
        Called after Groq Whisper returns a transcription.

        Fixes:
        - Accept ASKING state too (TTS may have not completed before user spoke)
        - Guard against empty transcripts
        """
        if not transcript or not transcript.strip():
            await self.send_event(
                "stt_error",
                {"message": "No speech detected. Please try speaking again."},
            )
            return

        current = self.state_machine.current_state

        if current == InterviewState.ASKING:
            # User spoke before TTS finished — advance FSM gracefully
            self._safe_transition(InterviewState.LISTENING)
        elif current != InterviewState.LISTENING:
            logger.warning(
                "process_answer called in unexpected state: %s — ignoring.",
                current.value,
            )
            return

        if not self.current_question:
            logger.error("process_answer: no current_question set!")
            return

        # Transition to EVALUATING
        self._safe_transition(InterviewState.EVALUATING)
        await self.send_event(
            "evaluation_started",
            {
                "question_id": self.current_question.id,
                "message": "Evaluating your response...",
            },
        )

        # 1. Persist answer
        async with AsyncSessionLocal() as db:
            ans_record = InterviewAnswer(
                question_id=self.current_question.id,
                session_id=self.session_id,
                transcript=transcript.strip(),
                duration_seconds=duration_seconds,
            )
            db.add(ans_record)
            await db.commit()

        # 2. Evaluate via LLM (has built-in fallback)
        eval_result = await self.evaluation_service.evaluate_answer(
            target_role=self.target_role,
            question_text=self.current_question.question_text,
            rubric=self.current_question.rubric or [],
            candidate_transcript=transcript,
            is_followup=self.current_question.is_followup,
        )
        self.scores.append(eval_result.overall_score)

        # 3. Persist evaluation
        async with AsyncSessionLocal() as db:
            eval_record = Evaluation(
                question_id=self.current_question.id,
                overall_score=eval_result.overall_score,
                criteria_scores=eval_result.criteria_scores,
                strengths=eval_result.strengths,
                weaknesses=eval_result.weaknesses,
                missing_points=eval_result.missing_points,
                feedback=eval_result.feedback,
                follow_up_required=eval_result.follow_up_required,
            )
            db.add(eval_record)
            await db.commit()

        # 4. Send evaluation event to client
        await self.send_event(
            "evaluation_complete",
            {
                "question_id": self.current_question.id,
                "evaluation": eval_result.model_dump(),
                "current_score": eval_result.overall_score,
            },
        )

        # 5. Small pause so client can display evaluation UI
        await asyncio.sleep(0.3)

        # 6. Decide next step
        if eval_result.follow_up_required and not self.current_question.is_followup:
            await self.ask_followup(transcript, eval_result.missing_points)
        elif self.questions_asked_count >= self.total_questions:
            await self.complete_interview()
        else:
            self._safe_transition(InterviewState.NEXT_QUESTION)
            await self.ask_next_question()

    async def ask_followup(self, candidate_answer: str, missing_points: List[str]):
        """Generate and deliver an adaptive follow-up question."""
        if not self._safe_transition(InterviewState.FOLLOW_UP_REQUIRED):
            return

        gen_followup = await self.question_service.generate_followup_question(
            target_role=self.target_role,
            question_text=(
                self.current_question.question_text if self.current_question else ""
            ),
            candidate_answer=candidate_answer,
            missing_points=missing_points,
        )

        async with AsyncSessionLocal() as db:
            followup_record = InterviewQuestion(
                session_id=self.session_id,
                parent_question_id=(
                    self.current_question.id if self.current_question else None
                ),
                question_text=gen_followup.question_text,
                intent="Follow-up on depth & detail",
                rubric=gen_followup.rubric,
                difficulty=self.difficulty,
                order_index=self.questions_asked_count,
                is_followup=True,
            )
            db.add(followup_record)
            await db.commit()
            await db.refresh(followup_record)
            self.current_question = followup_record

        self._safe_transition(InterviewState.ASKING)
        await self.send_event(
            "question",
            {
                "question_id": self.current_question.id,
                "question_text": self.current_question.question_text,
                "intent": self.current_question.intent,
                "order_index": self.questions_asked_count,
                "total_questions": self.total_questions,
                "is_followup": True,
            },
        )

    async def complete_interview(self):
        """Finalize interview session in DB and emit completion event."""
        self._safe_transition(InterviewState.COMPLETED)
        avg_score = (
            round(sum(self.scores) / len(self.scores), 1) if self.scores else 7.5
        )

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(InterviewSession).where(
                    InterviewSession.id == self.session_id
                )
            )
            session = result.scalars().first()
            if session:
                session.state = "COMPLETED"
                session.overall_score = avg_score
                session.completed_at = datetime.utcnow()
                await db.commit()

        await self.send_event(
            "interview_completed",
            {
                "session_id": self.session_id,
                "overall_score": avg_score,
                "total_questions_completed": self.questions_asked_count,
                "message": "Congratulations! Your interview session is complete.",
            },
        )
