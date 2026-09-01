from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

def _get_db_url_and_connect_args():
    """
    Normalise DATABASE_URL for asyncpg compatibility:
    - SQLite: pass check_same_thread=False
    - PostgreSQL (Neon/Supabase): asyncpg uses ssl= not sslmode=.
      Replace ?sslmode=require with ?ssl=require and set ssl connect_arg.
    """
    url = settings.DATABASE_URL
    connect_args = {}

    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    elif "postgresql" in url or "postgres" in url:
        # asyncpg does not accept sslmode — replace with ssl
        url = url.replace("sslmode=require", "ssl=require")
        url = url.replace("sslmode=prefer", "ssl=prefer")
        url = url.replace("sslmode=disable", "")
        # Force ssl=True connect_arg for Neon/Supabase which always require TLS
        if "ssl=require" in url or "neon.tech" in url or "supabase" in url:
            connect_args = {"ssl": "require"}

    return url, connect_args

_db_url, _connect_args = _get_db_url_and_connect_args()

engine = create_async_engine(
    _db_url,
    echo=settings.DEBUG,
    connect_args=_connect_args,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db():
    """Dependency for obtaining async DB session per request"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
