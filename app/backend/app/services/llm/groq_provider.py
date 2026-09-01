import json
from typing import List, Dict, Any, Type, TypeVar
from pydantic import BaseModel
from groq import AsyncGroq
from app.services.llm.base import LLMProvider
from app.core.config import settings

T = TypeVar("T", bound=BaseModel)

class GroqProvider(LLMProvider):
    def __init__(self, api_key: str = settings.GROQ_API_KEY, model: str = settings.GROQ_MODEL):
        if not api_key:
            raise ValueError("GROQ_API_KEY is not configured")
        self.client = AsyncGroq(api_key=api_key)
        self.model = model

    async def complete_structured(
        self,
        messages: List[Dict[str, str]],
        response_model: Type[T],
        temperature: float = 0.2
    ) -> T:
        schema_json = json.dumps(response_model.model_json_schema())
        system_instruction = (
            f"\nYou MUST return ONLY valid JSON matching this schema:\n{schema_json}\n"
            f"Do not include markdown blocks (no ```json). Output pure JSON directly."
        )
        
        formatted_messages = list(messages)
        if formatted_messages and formatted_messages[0]["role"] == "system":
            formatted_messages[0] = {
                "role": "system",
                "content": formatted_messages[0]["content"] + "\n" + system_instruction
            }
        else:
            formatted_messages.insert(0, {"role": "system", "content": system_instruction})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=formatted_messages,
            temperature=temperature,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        return response_model.model_validate(data)

    async def complete_text(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7
    ) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature
        )
        return response.choices[0].message.content
