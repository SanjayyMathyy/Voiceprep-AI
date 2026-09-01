import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import get_current_user, decode_token
from app.models.user import User
from app.models.resume import Resume
from app.models.session import InterviewSession
from app.models.question import InterviewQuestion
from app.models.evaluation import Evaluation
from app.schemas.interview import CreateSessionRequest, InterviewSessionResponse
from app.services.interview_orchestrator import InterviewOrchestrator
from app.services.stt_service import STTService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interviews", tags=["Interviews"])

@router.post("", response_model=InterviewSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_interview_session(
    payload: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Validate resume_id if provided
        valid_resume_id = None
        if payload.resume_id and str(payload.resume_id).strip():
            r_id = str(payload.resume_id).strip()
            res_check = await db.execute(
                select(Resume.id).where(Resume.id == r_id, Resume.user_id == current_user.id)
            )
            if res_check.scalar_one_or_none():
                valid_resume_id = r_id

        session = InterviewSession(
            user_id=current_user.id,
            resume_id=valid_resume_id,
            target_role=payload.target_role,
            interview_type=payload.interview_type,
            difficulty=payload.difficulty,
            total_questions=payload.total_questions,
            state="SESSION_CREATED"
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return InterviewSessionResponse.model_validate(session)
    except Exception as e:
        logger.exception("Failed to create interview session: %s", e)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create interview session: {str(e)}")

@router.get("", response_model=List[InterviewSessionResponse])
async def list_interview_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [InterviewSessionResponse.model_validate(s) for s in sessions]

@router.get("/{session_id}", response_model=InterviewSessionResponse)
async def get_interview_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    return InterviewSessionResponse.model_validate(session)

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    await db.delete(session)
    await db.commit()
    return None

@router.get("/{session_id}/detail")
async def get_interview_detail(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(InterviewSession)
        .options(
            selectinload(InterviewSession.questions).selectinload(InterviewQuestion.answer),
            selectinload(InterviewSession.questions).selectinload(InterviewQuestion.evaluation)
        )
        .where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    
    questions_data = []
    for q in session.questions:
        questions_data.append({
            "id": q.id,
            "question_text": q.question_text,
            "intent": q.intent,
            "order_index": q.order_index,
            "is_followup": q.is_followup,
            "answer": q.answer.transcript if q.answer else None,
            "evaluation": {
                "overall_score": q.evaluation.overall_score,
                "strengths": q.evaluation.strengths,
                "weaknesses": q.evaluation.weaknesses,
                "feedback": q.evaluation.feedback
            } if q.evaluation else None
        })

    return {
        "id": session.id,
        "target_role": session.target_role,
        "interview_type": session.interview_type,
        "difficulty": session.difficulty,
        "total_questions": session.total_questions,
        "state": session.state,
        "overall_score": session.overall_score,
        "started_at": session.started_at,
        "completed_at": session.completed_at,
        "questions": questions_data
    }

@router.get("/{session_id}/report")
@router.post("/{session_id}/report")
async def get_or_generate_session_report(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.report_service import ReportService
    service = ReportService(db)
    try:
        report = await service.get_or_generate_report(session_id=session_id, user_id=current_user.id)
        return {
            "id": report.id,
            "session_id": report.session_id,
            "overall_score": report.overall_score,
            "category_scores": report.category_scores,
            "strengths": report.strengths,
            "improvement_areas": report.improvement_areas,
            "summary": report.summary,
            "recommendations": report.recommendations,
            "created_at": report.created_at
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{session_id}/report/pdf")
async def download_session_report_pdf(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from fastapi.responses import Response
    from app.services.report_service import ReportService

    service = ReportService(db)
    report = await service.get_or_generate_report(session_id=session_id, user_id=current_user.id)
    
    sess_result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    )
    session = sess_result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    pdf_bytes = service.generate_pdf_bytes(session=session, report=report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=VoicePrep_Report_{session.target_role.replace(' ', '_')}.pdf"
        }
    )

@router.websocket("/{session_id}/ws")
async def interview_websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None)
):
    """
    Bidirectional WebSocket endpoint for the live voice interview session.

    Accepts two types of client frames:
      - Text (JSON): control messages (start_interview, tts_completed, answer, ping)
      - Binary:      raw audio chunks to transcribe via Groq Whisper STT

    Binary audio flow:
      1. Client sends binary audio blob (WebM/OGG) for the candidate answer
      2. Server transcribes via Groq Whisper
      3. Server sends {"type": "transcript", "text": "..."} back to client (live preview)
      4. After push-to-talk stop signal, server uses accumulated transcript as the answer
    """
    await websocket.accept()

    user_id = None
    if token:
        user_id = decode_token(token)

    # Accumulate binary audio chunks for the current turn
    audio_buffer: bytearray = bytearray()
    audio_mime_type: str = "audio/webm"
    # Track whether we are currently collecting audio for a turn
    # IMPORTANT: set to True by default so early binary frames aren't dropped
    # before audio_start JSON is processed (race condition in Chrome/Firefox)
    collecting_audio: bool = True
    start_time_secs: int = 0

    try:
        orchestrator = InterviewOrchestrator(session_id=session_id, websocket=websocket)
        await orchestrator.initialize()

        while True:
            # Receive either text or binary frame
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                logger.info("WebSocket client disconnected for session %s", session_id)
                break

            # ── Binary audio frame (microphone chunk) ──────────────────────
            if message.get("type") == "websocket.receive" and message.get("bytes") is not None:
                audio_chunk: bytes = message["bytes"]

                if not audio_chunk:
                    continue

                # Always buffer audio bytes regardless of collecting_audio state.
                # This prevents data loss when binary frame arrives before audio_start JSON.
                audio_buffer.extend(audio_chunk)
                logger.debug(
                    "STT: Binary frame received: %d bytes (total buffered: %d, collecting=%s)",
                    len(audio_chunk), len(audio_buffer), collecting_audio
                )
                continue

            # ── Text JSON control message ──────────────────────────────────
            raw_text: str = message.get("text", "")
            if not raw_text:
                continue

            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            if msg_type == "start_interview":
                await orchestrator.start_interview()

            elif msg_type == "tts_completed":
                await orchestrator.on_tts_completed()

            elif msg_type == "audio_start":
                # Client signals beginning of candidate audio recording
                # Reset buffer now (we may have already received some early binary frames)
                audio_buffer = bytearray()
                audio_mime_type = data.get("mime_type", "audio/webm")
                start_time_secs = data.get("start_time_secs", 0)
                collecting_audio = True
                logger.info("STT: audio_start received (mime=%s) — buffer reset", audio_mime_type)

            elif msg_type == "audio_end":
                # Client signals end of recording — run Whisper transcription
                collecting_audio = False
                duration_seconds = data.get("duration_seconds", max(1, len(audio_buffer) // 16000))

                logger.info(
                    "STT: audio_end received — buffer=%d bytes, mime=%s, duration=%ds",
                    len(audio_buffer), audio_mime_type, duration_seconds
                )

                if audio_buffer and len(audio_buffer) > 200:  # at least 200 bytes (not just a container header)
                    logger.info("STT: Sending %d bytes to Groq Whisper (mime=%s)…", len(audio_buffer), audio_mime_type)

                    # Send interim "transcribing" signal to client
                    await websocket.send_text(json.dumps({
                        "type": "stt_processing",
                        "message": "Transcribing your answer…"
                    }))

                    transcript = await STTService.transcribe(
                        audio_bytes=bytes(audio_buffer),
                        mime_type=audio_mime_type
                    )
                    audio_buffer = bytearray()  # clear buffer after processing

                    logger.info("STT: Whisper result: %r", transcript)

                    if transcript and transcript.strip():
                        # Echo transcript back to client so it can display it
                        await websocket.send_text(json.dumps({
                            "type": "transcript",
                            "text": transcript
                        }))
                        # Process it as the candidate's answer
                        await orchestrator.process_answer(
                            transcript=transcript,
                            duration_seconds=duration_seconds
                        )
                    else:
                        # Whisper returned empty — fall back to client-supplied text if any
                        fallback = data.get("fallback_transcript", "").strip()
                        if fallback:
                            logger.info("STT: Whisper empty, using fallback: %r", fallback)
                            await websocket.send_text(json.dumps({
                                "type": "transcript",
                                "text": fallback
                            }))
                            await orchestrator.process_answer(
                                transcript=fallback,
                                duration_seconds=duration_seconds
                            )
                        else:
                            logger.warning("STT: Both Whisper and fallback returned empty for %d byte audio", len(bytes(audio_buffer)))
                            await websocket.send_text(json.dumps({
                                "type": "stt_error",
                                "message": "Could not transcribe audio. Please speak clearly and try again."
                            }))
                else:
                    logger.warning("STT: audio_end received but buffer is too small (%d bytes) — possibly mic not capturing", len(audio_buffer))
                    await websocket.send_text(json.dumps({
                        "type": "stt_error",
                        "message": "No audio received from microphone. Please check browser mic permissions and try again."
                    }))
                # Reset buffer for next turn
                audio_buffer = bytearray()
                collecting_audio = True  # ready for next binary frames

            elif msg_type == "answer":
                # Legacy: text-mode answer (fallback if STT not used)
                transcript = data.get("transcript", "")
                duration = data.get("duration_seconds", 0)
                await orchestrator.process_answer(transcript=transcript, duration_seconds=duration)

            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.exception("WebSocket error in session %s: %s", session_id, e)
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass
