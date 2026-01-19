"""
Embedding Service
Supports both Ollama (local) and OpenAI API for vector embeddings
With Recursive Character Text Splitting for long texts
"""
import os
from typing import List, Optional, Literal, Dict, Any
import httpx
import numpy as np
from app.core.config import get_settings
from app.utils.text_splitter import RecursiveCharacterTextSplitter, split_text


EmbeddingProvider = Literal["ollama", "openai"]


class EmbeddingService:
    """Service for generating text embeddings using Ollama or OpenAI API"""
    
    def __init__(
        self, 
        provider: Optional[EmbeddingProvider] = None,
        model: Optional[str] = None,
        api_base: Optional[str] = None
    ):
        """Initialize embedding service with HTTP client pooling"""
        self.settings = get_settings()
        # Default to OpenAI for embeddings
        self.provider = provider or os.getenv("EMBEDDING_PROVIDER", "openai")
        
        # Set defaults based on provider
        if self.provider == "ollama":
            self.api_base = api_base or os.getenv("OLLAMA_API_URL", "http://10.4.93.66:9020")
            self.model = model or os.getenv("OLLAMA_EMBEDDING_MODEL", "bge-m3:latest")
            self.api_key = None
            self._dimensions = 1024  # BGE-M3 dimensions
        else:
            # OpenAI (default)
            self.api_base = "https://api.openai.com/v1"
            self.model = model or os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
            self.api_key = self.settings.openai_api_key
            self._dimensions = 1536  # text-embedding-3-small dimensions
        
        # Reusable HTTP client for connection pooling
        self._http_client: Optional[httpx.AsyncClient] = None
    
    def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create reusable HTTP client with connection pooling"""
        if self._http_client is None or self._http_client.is_closed:
            limits = httpx.Limits(
                max_keepalive_connections=5,
                max_connections=10,
                keepalive_expiry=30.0
            )
            self._http_client = httpx.AsyncClient(
                timeout=30.0,
                limits=limits
            )
        return self._http_client
    
    async def close(self):
        """Close HTTP client and cleanup resources"""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
    
    def get_dimensions(self) -> int:
        """Get the embedding dimensions for the current model"""
        return self._dimensions
        
    def _check_api_key(self):
        """Verify API key is configured (only for OpenAI)"""
        if self.provider == "openai" and not self.api_key:
            raise ValueError(
                "OpenAI API key not configured. "
                "Set OPENAI_API_KEY environment variable."
            )
    
    async def create_embedding(self, text: str, use_chunking: bool = True) -> List[float]:
        """
        Create embedding for a single text
        Uses recursive text splitting for long texts and averages chunk embeddings
        
        Args:
            text: Text to embed
            use_chunking: Whether to use chunking for long texts (default: True)
            
        Returns:
            List of floats representing the embedding vector
        """
        self._check_api_key()
        
        if not text or not text.strip():
            # Return zero vector for empty text
            return [0.0] * self._dimensions
        
        # For short texts, embed directly
        max_single_chars = 8000  # Safe limit for single embedding
        if len(text) <= max_single_chars or not use_chunking:
            # Simple truncation for very long texts without chunking
            if len(text) > 30000:
                text = text[:30000]
            if self.provider == "ollama":
                return await self._create_ollama_embedding(text)
            else:
                return await self._create_openai_embedding(text)
        
        # For longer texts, use recursive text splitting
        return await self._create_chunked_embedding(text)
    
    async def _create_chunked_embedding(self, text: str) -> List[float]:
        """
        Create embedding for long text by:
        1. Splitting into chunks using recursive character splitting
        2. Creating embeddings for each chunk
        3. Averaging the embeddings (weighted by chunk length)
        
        Args:
            text: Long text to embed
            
        Returns:
            Averaged embedding vector
        """
        # Split text into chunks
        chunks = split_text(
            text,
            chunk_size=2000,  # ~500 tokens for OpenAI
            chunk_overlap=200,
        )
        
        if not chunks:
            return [0.0] * self._dimensions
        
        if len(chunks) == 1:
            # Single chunk, embed directly
            if self.provider == "ollama":
                return await self._create_ollama_embedding(chunks[0])
            else:
                return await self._create_openai_embedding(chunks[0])
        
        # Get embeddings for all chunks
        chunk_embeddings = []
        chunk_weights = []
        
        for chunk in chunks:
            if self.provider == "ollama":
                embedding = await self._create_ollama_embedding(chunk)
            else:
                embedding = await self._create_openai_embedding(chunk)
            chunk_embeddings.append(embedding)
            chunk_weights.append(len(chunk))  # Weight by character count
        
        # Weighted average of embeddings
        return self._average_embeddings(chunk_embeddings, chunk_weights)
    
    def _average_embeddings(
        self, 
        embeddings: List[List[float]], 
        weights: Optional[List[float]] = None
    ) -> List[float]:
        """
        Compute weighted average of multiple embedding vectors
        
        Args:
            embeddings: List of embedding vectors
            weights: Optional weights for each embedding (default: equal weights)
            
        Returns:
            Averaged embedding vector (normalized)
        """
        if not embeddings:
            return [0.0] * self._dimensions
        
        if len(embeddings) == 1:
            return embeddings[0]
        
        # Convert to numpy for efficient computation
        arr = np.array(embeddings)
        
        if weights:
            weights = np.array(weights)
            weights = weights / weights.sum()  # Normalize weights
            averaged = np.average(arr, axis=0, weights=weights)
        else:
            averaged = np.mean(arr, axis=0)
        
        # Normalize to unit vector (important for cosine similarity)
        norm = np.linalg.norm(averaged)
        if norm > 0:
            averaged = averaged / norm
        
        return averaged.tolist()
    
    async def create_embedding_simple(self, text: str) -> List[float]:
        """
        Create embedding with simple truncation (no chunking)
        Use this for short texts like resume fields
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        return await self.create_embedding(text, use_chunking=False)
    
    async def _create_ollama_embedding(self, text: str) -> List[float]:
        """Create embedding using Ollama API"""
        client = self._get_http_client()
    async def _create_ollama_embedding(self, text: str) -> List[float]:
        """Create embedding using Ollama API"""
        client = self._get_http_client()
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
        client = self._get_http_client()
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
        )
        
        if response.status_code != 200:
            error_detail = response.json().get("error", {}).get("message", response.text)
            raise Exception(f"OpenAI API error: {error_detail}")
        
        data = response.json()
        return data["data"][0]["embedding"]
    
    async def create_embeddings_batch(
        self, 
        texts: List[str],
        batch_size: int = 100,
        use_chunking: bool = False  # Changed default to False for short texts like chunks
    ) -> List[List[float]]:
        """
        Create embeddings for multiple texts efficiently using batch API
        
        Args:
            texts: List of texts to embed
            batch_size: Number of texts per API call (for OpenAI, max 2048)
            use_chunking: Whether to use chunking for long texts (default: False for chunks)
            
        Returns:
            List of embedding vectors
        """
        self._check_api_key()
        
        if not texts:
            return []
        
        # For very long texts, process individually with chunking
        if use_chunking:
            all_embeddings = []
            for text in texts:
                embedding = await self.create_embedding(text, use_chunking=True)
                all_embeddings.append(embedding)
            return all_embeddings
        
        # For short texts, use efficient batch API
        if self.provider == "openai":
            return await self._create_openai_embeddings_batch(texts, batch_size)
        else:
            # Ollama doesn't have batch API, process individually
            all_embeddings = []
            for text in texts:
                embedding = await self._create_ollama_embedding(text)
                all_embeddings.append(embedding)
            return all_embeddings
    
    async def _create_openai_embeddings_batch(
        self,
        texts: List[str],
        batch_size: int = 100
    ) -> List[List[float]]:
        """Create embeddings for multiple texts using OpenAI batch API"""
        all_embeddings = []
        
        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            
            # Truncate long texts
            truncated_texts = []
            for text in batch_texts:
                if not text or not text.strip():
                    truncated_texts.append(" ")  # Empty text placeholder
                elif len(text) > 30000:
                    truncated_texts.append(text[:30000])
                else:
                    truncated_texts.append(text)
            
            client = self._get_http_client()
            response = await client.post(
                f"{self.api_base}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "input": truncated_texts,
                    "model": self.model,
                },
            )
            
            if response.status_code != 200:
                error_detail = response.json().get("error", {}).get("message", response.text)
                raise Exception(f"OpenAI API error: {error_detail}")
            
            data = response.json()
            # Extract embeddings in order
            batch_embeddings = [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]
            all_embeddings.extend(batch_embeddings)
        
        return all_embeddings
    
    async def create_embeddings_batch_simple(
        self, 
        texts: List[str],
        batch_size: int = 100
    ) -> List[List[float]]:
        """
        Create embeddings for multiple short texts (no chunking)
        More efficient for texts under 8000 chars
        
        Args:
            texts: List of texts to embed
            batch_size: Number of texts per API call
            
        Returns:
            List of embedding vectors
        """
        self._check_api_key()
        
        all_embeddings = []
        
        # Simple truncation for short texts
        max_chars = 8000
        processed_texts = [t[:max_chars] if len(t) > max_chars else t for t in texts]
        
        if self.provider == "ollama":
            # Ollama: process one by one
            for text in processed_texts:
                embedding = await self._create_ollama_embedding(text)
                all_embeddings.append(embedding)
        else:
            # OpenAI: batch request for efficiency
            for i in range(0, len(processed_texts), batch_size):
                batch_texts = processed_texts[i:i + batch_size]
                
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
    """Get or create embedding service instance (defaults to OpenAI)"""
    global _embedding_service
    target_provider = provider or os.getenv("EMBEDDING_PROVIDER", "openai")
    if _embedding_service is None or _embedding_service.provider != target_provider:
        _embedding_service = EmbeddingService(provider=target_provider, model=model)
    return _embedding_service
