"""
LLM Service
Client for OpenAI GPT models for chat completions and RAG
"""
import os
from typing import List, Optional, Dict, Any, AsyncGenerator
import httpx
from dataclasses import dataclass
from app.core.config import get_settings


@dataclass
class Message:
    """Chat message"""
    role: str  # 'system', 'user', 'assistant'
    content: str


@dataclass
class LLMResponse:
    """LLM response"""
    content: str
    model: str
    usage: Dict[str, int]
    finish_reason: str


class LLMService:
    """Service for interacting with OpenAI GPT models"""
    
    def __init__(
        self,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ):
        """
        Initialize LLM service
        
        Args:
            model: Model to use (default: gpt-4o-mini)
            api_key: OpenAI API key
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens in response
        """
        self.settings = get_settings()
        self.api_key = api_key or self.settings.openai_api_key
        self.model = model or os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.api_base = "https://api.openai.com/v1"
    
    def _check_api_key(self):
        """Verify API key is configured"""
        if not self.api_key:
            raise ValueError(
                "OpenAI API key not configured. "
                "Set OPENAI_API_KEY environment variable."
            )
    
    async def chat(
        self,
        messages: List[Message],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> LLMResponse:
        """
        Send chat completion request
        
        Args:
            messages: List of chat messages
            temperature: Override default temperature
            max_tokens: Override default max_tokens
            model: Override default model
            
        Returns:
            LLMResponse with content and metadata
        """
        self._check_api_key()
        
        # Format messages
        formatted_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model or self.model,
                    "messages": formatted_messages,
                    "temperature": temperature or self.temperature,
                    "max_tokens": max_tokens or self.max_tokens,
                },
                timeout=60.0,
            )
            
            if response.status_code != 200:
                error_detail = response.json().get("error", {}).get("message", response.text)
                raise Exception(f"OpenAI API error: {error_detail}")
            
            data = response.json()
            choice = data["choices"][0]
            
            return LLMResponse(
                content=choice["message"]["content"],
                model=data["model"],
                usage=data.get("usage", {}),
                finish_reason=choice.get("finish_reason", ""),
            )
    
    async def chat_stream(
        self,
        messages: List[Message],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Send chat completion request with streaming
        
        Args:
            messages: List of chat messages
            temperature: Override default temperature
            max_tokens: Override default max_tokens
            model: Override default model
            
        Yields:
            Content chunks as they arrive
        """
        self._check_api_key()
        
        # Format messages
        formatted_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model or self.model,
                    "messages": formatted_messages,
                    "temperature": temperature or self.temperature,
                    "max_tokens": max_tokens or self.max_tokens,
                    "stream": True,
                },
                timeout=120.0,
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    raise Exception(f"OpenAI API error: {error_text.decode()}")
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]  # Remove "data: " prefix
                        if data_str == "[DONE]":
                            break
                        
                        import json
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue
    
    async def simple_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Simple completion with just a prompt
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            **kwargs: Additional arguments for chat()
            
        Returns:
            Response content string
        """
        messages = []
        if system_prompt:
            messages.append(Message(role="system", content=system_prompt))
        messages.append(Message(role="user", content=prompt))
        
        response = await self.chat(messages, **kwargs)
        return response.content


# Singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service(
    model: Optional[str] = None,
    temperature: float = 0.7,
) -> LLMService:
    """Get or create LLM service instance"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService(model=model, temperature=temperature)
    return _llm_service
