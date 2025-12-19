"""
Embedding Service
Uses OpenAI API to generate vector embeddings for semantic search
"""
import os
from typing import List, Optional
import httpx
from app.core.config import get_settings


class EmbeddingService:
    """Service for generating text embeddings using OpenAI API"""
    
    def __init__(self, model: str = "text-embedding-3-small"):
        """
        Initialize embedding service
        
        Args:
            model: OpenAI embedding model to use
                   - text-embedding-3-small (1536 dims, cheaper)
                   - text-embedding-3-large (3072 dims, more accurate)
                   - text-embedding-ada-002 (1536 dims, legacy)
        """
        self.model = model
        self.settings = get_settings()
        self.api_key = self.settings.openai_api_key
        self.api_base = "https://api.openai.com/v1"
        
    def _check_api_key(self):
        """Verify API key is configured"""
        if not self.api_key:
            raise ValueError(
                "OpenAI API key not configured. "
                "Set OPENAI_API_KEY environment variable."
            )
    
    async def create_embedding(self, text: str) -> List[float]:
        """
        Create embedding for a single text
        
        Args:
            text: Text to embed (max ~8191 tokens for text-embedding-3-small)
            
        Returns:
            List of floats representing the embedding vector
        """
        self._check_api_key()
        
        # Truncate text if too long (rough estimate: 4 chars per token)
        max_chars = 30000  # ~7500 tokens, leaving some buffer
        if len(text) > max_chars:
            text = text[:max_chars]
        
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
            batch_size: Number of texts per API call (max 2048)
            
        Returns:
            List of embedding vectors
        """
        self._check_api_key()
        
        all_embeddings = []
        
        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            
            # Truncate each text
            max_chars = 30000
            batch_texts = [t[:max_chars] if len(t) > max_chars else t for t in batch_texts]
            
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
                # Sort by index to maintain order
                sorted_data = sorted(data["data"], key=lambda x: x["index"])
                batch_embeddings = [item["embedding"] for item in sorted_data]
                all_embeddings.extend(batch_embeddings)
        
        return all_embeddings
    
    def get_model_dimensions(self) -> int:
        """Get the embedding dimensions for the current model"""
        dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
        }
        return dimensions.get(self.model, 1536)


# Singleton instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service(model: str = "text-embedding-3-small") -> EmbeddingService:
    """Get or create embedding service instance"""
    global _embedding_service
    if _embedding_service is None or _embedding_service.model != model:
        _embedding_service = EmbeddingService(model=model)
    return _embedding_service
