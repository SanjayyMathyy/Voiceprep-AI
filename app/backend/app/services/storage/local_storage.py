import os
from pathlib import Path
from app.services.storage.base import StorageProvider
from app.core.config import settings

class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir: str = settings.LOCAL_STORAGE_DIR):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def upload_file(self, file_content: bytes, destination_path: str, content_type: str) -> str:
        full_path = self.base_dir / destination_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_path, "wb") as f:
            f.write(file_content)
            
        return str(full_path)

    async def delete_file(self, file_path: str) -> bool:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            return True
        return False
