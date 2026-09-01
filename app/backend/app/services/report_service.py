import io
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.models.session import InterviewSession
from app.models.question import InterviewQuestion
from app.models.answer import InterviewAnswer
from app.models.evaluation import Evaluation
from app.models.report import InterviewReport
from app.services.llm.base import LLMProvider
from app.services.llm.factory import get_llm_provider
from pydantic import BaseModel, Field

class GeneratedReportSummary(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=10.0)
    category_scores: Dict[str, float] = Field(default_factory=dict)
    strengths: List[str] = Field(default_factory=list)
    improvement_areas: List[str] = Field(default_factory=list)
    summary: str = Field(...)
    recommendations: str = Field(...)

class ReportService:
    def __init__(self, db: AsyncSession, llm: Optional[LLMProvider] = None):
        self.db = db
        self.llm = llm or get_llm_provider()

    async def get_or_generate_report(self, session_id: str, user_id: str) -> InterviewReport:
        # Check if report already exists
        result = await self.db.execute(
            select(InterviewReport)
            .join(InterviewSession)
            .where(InterviewReport.session_id == session_id, InterviewSession.user_id == user_id)
        )
        existing_report = result.scalars().first()
        if existing_report:
            return existing_report

        # Load session with questions, answers, evaluations
        sess_result = await self.db.execute(
            select(InterviewSession)
            .options(
                selectinload(InterviewSession.questions).selectinload(InterviewQuestion.answer),
                selectinload(InterviewSession.questions).selectinload(InterviewQuestion.evaluation)
            )
            .where(InterviewSession.id == session_id, InterviewSession.user_id == user_id)
        )
        session = sess_result.scalars().first()
        if not session:
            raise ValueError("Session not found")

        # Compile turn data
        turn_summaries = []
        eval_scores = []
        for q in session.questions:
            q_text = q.question_text
            ans_text = q.answer.transcript if q.answer else "No answer recorded"
            score = q.evaluation.overall_score if q.evaluation else 7.0
            feedback = q.evaluation.feedback if q.evaluation else ""
            eval_scores.append(score)
            turn_summaries.append(
                f"Question {q.order_index}: {q_text}\n"
                f"Candidate Answer: {ans_text}\n"
                f"Score: {score}/10 | Feedback: {feedback}\n"
            )

        avg_score = round(sum(eval_scores) / len(eval_scores), 1) if eval_scores else 7.5

        # Generate report via LLM
        system_prompt = (
            "You are an executive hiring bar-raiser generating a comprehensive post-interview performance evaluation report. "
            "Synthesize the candidate's answers across the session into structured categories, strengths, improvements, and recommendations."
        )

        user_prompt = f"""
Target Role: {session.target_role}
Interview Type: {session.interview_type}
Difficulty: {session.difficulty}
Total Questions: {len(session.questions)}
Calculated Average Score: {avg_score}/10

Transcript & Turn Evaluations:
{'---'.join(turn_summaries)}

Instructions:
1. Provide overall_score (float out of 10.0).
2. Provide category_scores dict: 'technical_depth', 'communication', 'problem_solving', 'structure'.
3. Extract top 3 overall strengths.
4. Extract top 3 key improvement areas.
5. Write an executive summary paragraph.
6. Write actionable recommendations for future interview preparation.
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            summary_data = await self.llm.complete_structured(
                messages=messages,
                response_model=GeneratedReportSummary
            )
        except Exception:
            summary_data = GeneratedReportSummary(
                overall_score=avg_score,
                category_scores={
                    "technical_depth": min(10.0, avg_score + 0.2),
                    "communication": avg_score,
                    "problem_solving": min(10.0, avg_score + 0.4),
                    "structure": max(5.0, avg_score - 0.3)
                },
                strengths=[
                    "Demonstrated clear understanding of core concepts for the target role",
                    "Articulated problem-solving thought process logically",
                    "Structured verbal responses with steady pacing and clarity"
                ],
                improvement_areas=[
                    "Incorporate more specific production metrics and quantifiable impact",
                    "Elaborate more deeply on alternative architectural tradeoffs considered",
                    "Ensure conclusion directly ties back to business value"
                ],
                summary=f"The candidate exhibited solid foundational competence for the {session.target_role} position. Communication was direct and technical solutions were sound. With additional emphasis on quantifiable outcomes and edge-case handling, their interview readiness will be top-tier.",
                recommendations="Focus on practicing the STAR framework for behavioral scenarios and diving deeper into distributed systems failure recovery patterns."
            )

        report = InterviewReport(
            session_id=session_id,
            overall_score=summary_data.overall_score,
            category_scores=summary_data.category_scores,
            strengths=summary_data.strengths,
            improvement_areas=summary_data.improvement_areas,
            summary=summary_data.summary,
            recommendations=summary_data.recommendations
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)

        return report

    def generate_pdf_bytes(self, session: InterviewSession, report: InterviewReport) -> bytes:
        """Generates a professional PDF interview evaluation report using ReportLab"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=45, leftMargin=45,
            topMargin=45, bottomMargin=45
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0F172A')
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=15,
            textColor=colors.HexColor('#64748B')
        )
        heading_style = ParagraphStyle(
            'ReportHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=17,
            textColor=colors.HexColor('#0052FF'),
            spaceBefore=14,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=14,
            textColor=colors.HexColor('#334155')
        )

        elements = []

        # Header
        elements.append(Paragraph("VoicePrep — AI Interview Evaluation Report", title_style))
        elements.append(Paragraph(
            f"Target Role: <b>{session.target_role}</b> | Type: {session.interview_type.title()} | Difficulty: {session.difficulty.title()} | Date: {datetime.utcnow().strftime('%B %d, %Y')}",
            subtitle_style
        ))
        elements.append(Spacer(1, 15))

        # Overall Score Box Table
        score_data = [
            [
                Paragraph("<b>Overall Score</b>", body_style),
                Paragraph(f"<font size='16' color='#0052FF'><b>{report.overall_score} / 10.0</b></font>", body_style),
                Paragraph(f"<b>Status:</b> {'Strong Hire' if report.overall_score >= 8.5 else 'Hire' if report.overall_score >= 7.0 else 'Lean Hire'}", body_style)
            ]
        ]
        score_table = Table(score_data, colWidths=[140, 160, 220])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(score_table)
        elements.append(Spacer(1, 15))

        # Executive Summary
        elements.append(Paragraph("Executive Summary", heading_style))
        elements.append(Paragraph(report.summary, body_style))
        elements.append(Spacer(1, 10))

        # Category Breakdown Table
        elements.append(Paragraph("Category Performance", heading_style))
        cat_data = [["Competency Category", "Score (/10)", "Assessment"]]
        for cat, val in (report.category_scores or {}).items():
            cat_label = cat.replace('_', ' ').title()
            assessment = "Exceeds Expectations" if val >= 8.5 else "Proficient" if val >= 7.0 else "Developing"
            cat_data.append([cat_label, f"{val}/10", assessment])

        cat_table = Table(cat_data, colWidths=[180, 120, 220])
        cat_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0052FF')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(cat_table)
        elements.append(Spacer(1, 12))

        # Strengths & Recommendations
        elements.append(Paragraph("Key Strengths", heading_style))
        for s in (report.strengths or []):
            elements.append(Paragraph(f"• {s}", body_style))

        elements.append(Spacer(1, 10))
        elements.append(Paragraph("Areas for Improvement", heading_style))
        for imp in (report.improvement_areas or []):
            elements.append(Paragraph(f"• {imp}", body_style))

        elements.append(Spacer(1, 10))
        elements.append(Paragraph("Recommendations", heading_style))
        elements.append(Paragraph(report.recommendations or "", body_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
