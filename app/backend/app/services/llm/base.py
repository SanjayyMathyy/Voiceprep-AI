from abc import ABC, abstractmethod
from typing import List, Dict, Any, Type, TypeVar, Optional, AsyncGenerator
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

class LLMProvider(ABC):
    @abstractmethod
    async def complete_structured(
        self,
        messages: List[Dict[str, str]],
        response_model: Type[T],
        temperature: float = 0.2
    ) -> T:
        """Return structured output matching a Pydantic model"""
        pass

    @abstractmethod
    async def complete_text(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7
    ) -> str:
        """Return a string completion"""
        pass
