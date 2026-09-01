from abc import ABC, abstractmethod
from typing import BinaryIO

class StorageProvider(ABC):
    @abstractmethod
    async def upload_file(self, file_content: bytes, destination_path: str, content_type: str) -> str:
        """Uploads a file and returns the accessible URL or file path"""
        pass

    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        """Deletes a file from storage"""
        pass
