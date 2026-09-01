import logging
from typing import Optional
from app.services.storage.base import StorageProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class SupabaseStorageProvider(StorageProvider):
    def __init__(
        self,
        supabase_url: Optional[str] = settings.SUPABASE_URL,
        supabase_key: Optional[str] = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY,
        bucket_name: str = settings.SUPABASE_BUCKET
    ):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.bucket_name = bucket_name
        self.client = None

        if self.supabase_url and self.supabase_key:
            try:
                from supabase import create_client
                self.client = create_client(self.supabase_url, self.supabase_key)
            except Exception as e:
                logger.warning(f"Could not initialize Supabase client: {e}")

    async def upload_file(self, file_content: bytes, destination_path: str, content_type: str) -> str:
        """Uploads file bytes to Supabase Storage bucket and returns public/signed URL."""
        if not self.client:
            raise ValueError("Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")

        try:
            # Upload to Supabase bucket
            self.client.storage.from_(self.bucket_name).upload(
                path=destination_path,
                file=file_content,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            # Retrieve public URL
            public_url_resp = self.client.storage.from_(self.bucket_name).get_public_url(destination_path)
            return public_url_resp
        except Exception as e:
            logger.error(f"Failed to upload file to Supabase Storage: {e}")
            raise ValueError(f"Supabase upload failed: {str(e)}")

    async def delete_file(self, file_path: str) -> bool:
        """Deletes file from Supabase Storage bucket."""
        if not self.client:
            return False

        try:
            self.client.storage.from_(self.bucket_name).remove([file_path])
            return True
        except Exception as e:
            logger.error(f"Failed to delete file from Supabase Storage: {e}")
            return False
