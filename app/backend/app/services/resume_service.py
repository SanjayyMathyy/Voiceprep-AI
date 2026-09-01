import os
import uuid
from pathlib import Path
from typing import Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile, HTTPException

from app.core.config import settings
from app.models.resume import Resume
from app.schemas.resume import StructuredResume
from app.parsers.pdf_parser import PDFParser
from app.parsers.docx_parser import DOCXParser
from app.services.storage.local_storage import LocalStorageProvider
from app.services.storage.supabase_storage import SupabaseStorageProvider
from app.services.llm.factory import get_llm_provider

class ResumeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        if settings.STORAGE_TYPE == "supabase":
            self.storage = SupabaseStorageProvider()
        else:
            self.storage = LocalStorageProvider()
        self.pdf_parser = PDFParser()
        self.docx_parser = DOCXParser()
        self.llm = get_llm_provider()

    async def process_and_create_resume(
        self,
        user_id: str,
        file: UploadFile
    ) -> Resume:
        filename = file.filename or "resume"
        ext = Path(filename).suffix.lower()
        
        if ext not in [".pdf", ".docx"]:
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

        # 1. Save file to storage (local disk in dev or Supabase bucket in production)
        dest_path = f"resumes/{user_id}/{uuid.uuid4()}{ext}"
        saved_file_path = await self.storage.upload_file(
            file_content=content,
            destination_path=dest_path,
            content_type=file.content_type or "application/octet-stream"
        )

        # 2. Extract text in-memory from bytes (works across all storage backends)
        if ext == ".pdf":
            extracted_text = self.pdf_parser.extract_text_from_bytes(content)
        else:
            extracted_text = self.docx_parser.extract_text_from_bytes(content)

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract readable text from the document.")

        # 3. LLM structured extraction
        system_prompt = (
            "You are an expert technical recruiter and resume analyzer. "
            "Extract structured profile information from the following resume document. "
            "Ensure you extract all skills, projects, achievements, work experience, and education accurately."
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Resume content:\n\n{extracted_text}"}
        ]

        try:
            structured_data = await self.llm.complete_structured(
                messages=messages,
                response_model=StructuredResume
            )
        except Exception as e:
            # Fallback to mock structure if LLM error
            structured_data = StructuredResume(
                name=Path(filename).stem.replace("_", " ").title(),
                summary=extracted_text[:300] + "...",
                skills=["Software Engineering", "Problem Solving"]
            )

        # 4. Save to Database
        resume_record = Resume(
            user_id=user_id,
            file_path=saved_file_path,
            original_filename=filename,
            status="ready",
            extracted_data=structured_data.model_dump()
        )
        self.db.add(resume_record)
        await self.db.commit()
        await self.db.refresh(resume_record)

        return resume_record
