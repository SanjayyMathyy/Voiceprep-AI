import io
import fitz  # PyMuPDF
from app.parsers.base import BaseDocumentParser

class PDFParser(BaseDocumentParser):
    def extract_text(self, file_path: str) -> str:
        """Parse PDF from a file path (local storage)."""
        text_content = []
        try:
            with fitz.open(file_path) as doc:
                for page in doc:
                    text = page.get_text()
                    if text.strip():
                        text_content.append(text)
        except Exception as e:
            raise ValueError(f"Failed to parse PDF document: {str(e)}")
        return "\n\n".join(text_content).strip()

    def extract_text_from_bytes(self, content: bytes) -> str:
        """Parse PDF directly from bytes (cloud storage — no disk write)."""
        text_content = []
        try:
            with fitz.open(stream=io.BytesIO(content), filetype="pdf") as doc:
                for page in doc:
                    text = page.get_text()
                    if text.strip():
                        text_content.append(text)
        except Exception as e:
            raise ValueError(f"Failed to parse PDF from bytes: {str(e)}")
        return "\n\n".join(text_content).strip()
