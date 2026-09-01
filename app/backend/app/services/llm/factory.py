from app.services.llm.base import LLMProvider
from app.services.llm.groq_provider import GroqProvider
from app.services.llm.mock_provider import MockLLMProvider
from app.core.config import settings

def get_llm_provider() -> LLMProvider:
    """Returns GroqProvider if GROQ_API_KEY is present, otherwise falls back to MockLLMProvider"""
    if settings.GROQ_API_KEY:
        try:
            return GroqProvider(api_key=settings.GROQ_API_KEY, model=settings.GROQ_MODEL)
        except Exception:
            return MockLLMProvider()
    return MockLLMProvider()
