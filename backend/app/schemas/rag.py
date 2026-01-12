"""
RAG (Retrieval-Augmented Generation) Schemas
For resume Q&A system
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class RAGQueryRequest(BaseModel):
    """Request schema for RAG query"""
    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Question to ask about resumes (Thai or English)",
        examples=[
            "หาผู้สมัครที่มีประสบการณ์ Python 5 ปีขึ้นไป",
            "Find candidates with AWS certification",
            "ใครเหมาะกับตำแหน่ง Data Engineer"
        ]
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of relevant resumes to retrieve"
    )
    similarity_threshold: float = Field(
        default=0.2,
        ge=0.0,
        le=1.0,
        description="Minimum similarity score for relevance (0.2-0.4 recommended)"
    )
<<<<<<< HEAD
=======
    use_chunks: bool = Field(
        default=True,
        description="Use semantic chunks for search (True = more precise, False = broader matching)"
    )
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
    include_context: bool = Field(
        default=False,
        description="Include retrieved context in response"
    )
    model: Optional[str] = Field(
        default=None,
        description="LLM model to use (default: gpt-4o-mini)"
    )
    temperature: float = Field(
        default=0.3,
        ge=0.0,
        le=2.0,
        description="LLM temperature for response generation"
    )


class ResumeSource(BaseModel):
    """Source resume information"""
    resume_id: str  # UUID
    name: str
    similarity_score: float
    position: Optional[str] = None
    email: Optional[str] = None


class RAGQueryResponse(BaseModel):
    """Response schema for RAG query"""
    answer: str = Field(
        ...,
        description="Generated answer from LLM"
    )
    query: str = Field(
        ...,
        description="Original query"
    )
    sources: List[ResumeSource] = Field(
        default_factory=list,
        description="Source resumes used for the answer"
    )
    context: Optional[str] = Field(
        default=None,
        description="Retrieved context (if include_context=True)"
    )
    tokens_used: Optional[int] = Field(
        default=None,
        description="Total tokens used in LLM call"
    )
    model: str = Field(
        ...,
        description="LLM model used"
    )
    processing_time_ms: float = Field(
        ...,
        description="Total processing time in milliseconds"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Response timestamp"
    )


class RAGStreamChunk(BaseModel):
    """Chunk for streaming response"""
    type: str = Field(
        ...,
        description="Chunk type: 'content', 'sources', 'done', 'error'"
    )
    content: Optional[str] = Field(
        default=None,
        description="Content chunk (for type='content')"
    )
    sources: Optional[List[ResumeSource]] = Field(
        default=None,
        description="Sources (for type='sources')"
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message (for type='error')"
    )
    metadata: Optional[dict] = Field(
        default=None,
        description="Additional metadata (for type='done')"
    )


class RAGHealthResponse(BaseModel):
    """Health check response for RAG service"""
    status: str
    embedding_provider: str
    llm_provider: str
    llm_model: str
    message: Optional[str] = None
