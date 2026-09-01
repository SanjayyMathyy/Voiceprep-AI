from abc import ABC, abstractmethod

class BaseDocumentParser(ABC):
    @abstractmethod
    def extract_text(self, file_path: str) -> str:
        """Extract text from the document file"""
        pass
