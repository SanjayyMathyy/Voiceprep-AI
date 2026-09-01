from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "VoicePrep API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Environment — set to "production" on cloud hosts
    ENVIRONMENT: str = "development"

    @property
    def DEBUG(self) -> bool:
        return self.ENVIRONMENT != "production"

    # Database
    # Local dev:   sqlite+aiosqlite:///./voiceprep.db
    # Production:  postgresql+asyncpg://user:pass@host/dbname  (Neon/Supabase)
    DATABASE_URL: str = "sqlite+aiosqlite:///./voiceprep.db"

    # JWT Security — MUST override via env var in production
    JWT_SECRET: str = "voiceprep_dev_secret_key_change_in_production_987654321"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # File Storage
    # "local"    → saves to LOCAL_STORAGE_DIR (dev only, ephemeral on cloud)
    # "supabase" → uploads to Supabase Storage bucket (use in production)
    STORAGE_TYPE: str = "local"
    LOCAL_STORAGE_DIR: str = "./uploads"

    # Supabase (required when STORAGE_TYPE="supabase")
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_BUCKET: str = "resumes"

    # Groq LLM API
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "qwen/qwen3.8-27b"

    # Groq Whisper STT
    GROQ_WHISPER_MODEL: str = "whisper-large-v3-turbo"
    STT_LANGUAGE: str = "en"

    # CORS
    # In production add your Vercel URL, e.g.:
    # CORS_ORIGINS=["https://voiceprep.vercel.app","https://custom-domain.com"]
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "http://localhost:3000",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
