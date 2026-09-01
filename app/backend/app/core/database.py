from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# asyncpg only supports a small subset of connection string parameters.
# Parameters like sslmode, channel_binding, options, application_name etc.
# must be stripped and passed via connect_args instead.
_ASYNCPG_UNSUPPORTED_PARAMS = {
    "sslmode", "channel_binding", "options", "application_name",
    "connect_timeout", "keepalives", "keepalives_idle",
    "keepalives_interval", "keepalives_count", "target_session_attrs"
}

def _get_db_url_and_connect_args():
    url = settings.DATABASE_URL
    connect_args = {}

    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        return url, connect_args

    if "postgresql" in url or "postgres" in url:
        # Ensure we use the asyncpg dialect prefix
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        # Parse the URL and strip all unsupported query parameters
        parsed = urlparse(url)
        qs = parse_qs(parsed.query, keep_blank_values=True)

        # Check if SSL was required before stripping
        needs_ssl = (
            qs.get("sslmode", [""])[0] in ("require", "verify-ca", "verify-full")
            or "neon.tech" in (parsed.hostname or "")
            or "supabase" in (parsed.hostname or "")
        )

        # Remove unsupported params
        clean_qs = {k: v for k, v in qs.items() if k not in _ASYNCPG_UNSUPPORTED_PARAMS}

        # Rebuild clean URL
        clean_query = urlencode(clean_qs, doseq=True)
        url = urlunparse(parsed._replace(query=clean_query))

        # Pass ssl via connect_args (the correct asyncpg way)
        if needs_ssl:
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
