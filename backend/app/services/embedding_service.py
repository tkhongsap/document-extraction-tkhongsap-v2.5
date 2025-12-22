"""
Embedding Service
Supports both Ollama (local) and OpenAI API for vector embeddings
"""
import os
from typing import List, Optional, Literal
import httpx
from app.core.config import get_settings


EmbeddingProvider = Literal["ollama", "openai"]


class EmbeddingService:
    """Service for generating text embeddings using Ollama or OpenAI API"""
    
    def __init__(
        self, 
        provider: Optional[EmbeddingProvider] = None,
        model: Optional[str] = None,
        api_base: Optional[str] = None
    ):
        """
        Initialize embedding service
        
        Args:
            provider: 'ollama' or 'openai'
            model: Embedding model to use
                   - Ollama: bge-m3:latest (1024 dims)
                   - OpenAI: text-embedding-3-small (1536 dims)
            api_base: API base URL (for Ollama)
        """
        self.settings = get_settings()
        self.provider = provider or os.getenv("EMBEDDING_PROVIDER", "ollama")
        
        # Set defaults based on provider
        if self.provider == "ollama":
            self.api_base = api_base or os.getenv("OLLAMA_API_URL", "http://10.4.93.66:9020")
            self.model = model or os.getenv("OLLAMA_EMBEDDING_MODEL", "bge-m3:latest")
            self.api_key = None
        else:
            self.api_base = "https://api.openai.com/v1"
            self.model = model or "text-embedding-3-small"
            self.api_key = self.settings.openai_api_key
        
    def _check_api_key(self):
        """Verify API key is configured (only for OpenAI)"""
        if self.provider == "openai" and not self.api_key:
            raise ValueError(
                "OpenAI API key not configured. "
                "Set OPENAI_API_KEY environment variable."
            )
    
    async def create_embedding(self, text: str) -> List[float]:
        """
        Create embedding for a single text
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        self._check_api_key()
        
        # Truncate text if too long
        max_chars = 30000
        if len(text) > max_chars:
            text = text[:max_chars]
        
        if self.provider == "ollama":
            return await self._create_ollama_embedding(text)
        else:
            return await self._create_openai_embedding(text)
    
    async def _create_ollama_embedding(self, text: str) -> List[float]:
        """Create embedding using Ollama API"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base}/api/embed",
                headers={"Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "input": text,
                },
                timeout=60.0,
            )
            
            if response.status_code != 200:
                error_detail = response.json().get("error", response.text)
                raise Exception(f"Ollama API error: {error_detail}")
            
            data = response.json()
            # Ollama returns { embeddings: [[...]] } for single input
            embeddings = data.get("embeddings", [])
            if embeddings and len(embeddings) > 0:
                return embeddings[0]
            return data.get("embedding", [])
    
    async def _create_openai_embedding(self, text: str) -> List[float]:
        """Create embedding using OpenAI API"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "input": text,
                },
                timeout=30.0,
            )
            
            if response.status_code != 200:
                error_detail = response.json().get("error", {}).get("message", response.text)
                raise Exception(f"OpenAI API error: {error_detail}")
            
            data = response.json()
            return data["data"][0]["embedding"]
    
    async def create_embeddings_batch(
        self, 
        texts: List[str],
        batch_size: int = 100
    ) -> List[List[float]]:
        """
        Create embeddings for multiple texts
        
        Args:
            texts: List of texts to embed
            batch_size: Number of texts per API call
            
        Returns:
            List of embedding vectors
        """
        self._check_api_key()
        
        all_embeddings = []
        
        # Truncate each text
        max_chars = 30000
        truncated_texts = [t[:max_chars] if len(t) > max_chars else t for t in texts]
        
        if self.provider == "ollama":
            # Ollama: process one by one
            for text in truncated_texts:
                embedding = await self._create_ollama_embedding(text)
                all_embeddings.append(embedding)
        else:
            # OpenAI: batch request
            for i in range(0, len(truncated_texts), batch_size):
                batch_texts = truncated_texts[i:i + batch_size]
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.api_base}/embeddings",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": self.model,
                            "input": batch_texts,
                        },
                        timeout=60.0,
                    )
                    
                    if response.status_code != 200:
                        error_detail = response.json().get("error", {}).get("message", response.text)
                        raise Exception(f"OpenAI API error: {error_detail}")
                    
                    data = response.json()
                    sorted_data = sorted(data["data"], key=lambda x: x["index"])
                    batch_embeddings = [item["embedding"] for item in sorted_data]
                    all_embeddings.extend(batch_embeddings)
        
        return all_embeddings
    
    def get_model_dimensions(self) -> int:
        """Get the embedding dimensions for the current model"""
        dimensions = {
            # OpenAI models
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
            # Ollama models
            "bge-m3:latest": 1024,
            "bge-m3": 1024,
            "nomic-embed-text": 768,
            "mxbai-embed-large": 1024,
        }
        return dimensions.get(self.model, 1024)


# Singleton instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service(
    provider: Optional[EmbeddingProvider] = None,
    model: Optional[str] = None
) -> EmbeddingService:
    """Get or create embedding service instance (defaults to Ollama)"""
    global _embedding_service
    target_provider = provider or os.getenv("EMBEDDING_PROVIDER", "ollama")
    if _embedding_service is None or _embedding_service.provider != target_provider:
        _embedding_service = EmbeddingService(provider=target_provider, model=model)
    return _embedding_service
