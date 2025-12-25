"""
Chunks Routes - Document Chunking API
Endpoints for creating, searching, and managing document chunks for RAG
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.chunking_service import ChunkingService
from app.models.user import User


router = APIRouter(prefix="/api/chunks", tags=["chunks"])


# Request/Response Models
class CreateChunksRequest(BaseModel):
    """Request to create chunks from resume data"""
    extraction_id: str = Field(..., description="Extraction ID to create chunks for")
    extracted_data: dict = Field(..., description="Extracted resume data")
    document_id: Optional[str] = Field(None, description="Optional document ID")
    generate_embeddings: bool = Field(True, description="Whether to generate embeddings")


class CreateChunksResponse(BaseModel):
    """Response after creating chunks"""
    success: bool
    chunks_created: int
    chunk_types: dict
    message: str


class SearchChunksRequest(BaseModel):
    """Request to search chunks by similarity"""
    query: str = Field(..., description="Search query text", min_length=1)
    limit: int = Field(10, description="Maximum number of results", ge=1, le=100)
    chunk_types: Optional[List[str]] = Field(None, description="Filter by chunk types")
    similarity_threshold: float = Field(0.7, description="Minimum similarity score", ge=0, le=1)


class ChunkResult(BaseModel):
    """Single chunk search result"""
    id: str
    userId: str
    documentId: Optional[str]
    extractionId: Optional[str]
    chunkIndex: int
    chunkType: Optional[str]
    text: str
    metadata: Optional[dict]
    createdAt: Optional[str]
    similarity: float


class SearchChunksResponse(BaseModel):
    """Response from chunk search"""
    success: bool
    query: str
    results: List[ChunkResult]
    total_results: int


class ChunkStatsResponse(BaseModel):
    """Response with chunk statistics"""
    success: bool
    stats: dict


# Endpoints

@router.post("/create", response_model=CreateChunksResponse)
async def create_chunks(
    request: CreateChunksRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create chunks from extracted resume data.
    Uses semantic chunking to split resume into logical sections.
    
    Each section (personal_info, summary, experience, education, skills, etc.)
    becomes a separate chunk with its own embedding for better RAG retrieval.
    """
    try:
        chunking_service = ChunkingService(db)
        
        # Create chunks with embeddings
        chunks = await chunking_service.chunk_and_save_resume(
            user_id=current_user.id,
            extraction_id=request.extraction_id,
            extracted_data=request.extracted_data,
            document_id=request.document_id,
            generate_embeddings=request.generate_embeddings
        )
        
        # Count chunk types
        chunk_types = {}
        for chunk in chunks:
            chunk_type = chunk.chunk_type or "unknown"
            chunk_types[chunk_type] = chunk_types.get(chunk_type, 0) + 1
        
        return CreateChunksResponse(
            success=True,
            chunks_created=len(chunks),
            chunk_types=chunk_types,
            message=f"Successfully created {len(chunks)} chunks"
        )
        
    except Exception as e:
        print(f"[Chunks API] Error creating chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=SearchChunksResponse)
async def search_chunks(
    request: SearchChunksRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Search chunks by semantic similarity.
    Uses vector embeddings to find chunks similar to the query text.
    
    Useful for:
    - Finding candidates with specific skills
    - Searching by experience or job titles
    - Matching candidates to job descriptions
    """
    try:
        chunking_service = ChunkingService(db)
        
        results = await chunking_service.search_similar_chunks(
            query=request.query,
            user_id=current_user.id,
            limit=request.limit,
            chunk_types=request.chunk_types,
            similarity_threshold=request.similarity_threshold
        )
        
        return SearchChunksResponse(
            success=True,
            query=request.query,
            results=[ChunkResult(**r) for r in results],
            total_results=len(results)
        )
        
    except Exception as e:
        print(f"[Chunks API] Error searching chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=ChunkStatsResponse)
async def get_chunk_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get chunk statistics for the current user.
    Returns count of chunks by type.
    """
    try:
        chunking_service = ChunkingService(db)
        stats = await chunking_service.count_user_chunks(current_user.id)
        
        return ChunkStatsResponse(
            success=True,
            stats=stats
        )
        
    except Exception as e:
        print(f"[Chunks API] Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/extraction/{extraction_id}")
async def get_chunks_for_extraction(
    extraction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all chunks for a specific extraction.
    """
    try:
        chunking_service = ChunkingService(db)
        chunks = await chunking_service.get_chunks_for_extraction(extraction_id)
        
        # Verify ownership
        if chunks and chunks[0].user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {
            "success": True,
            "extractionId": extraction_id,
            "chunks": [chunk.to_dict() for chunk in chunks],
            "total": len(chunks)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Chunks API] Error getting chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/extraction/{extraction_id}")
async def delete_chunks_for_extraction(
    extraction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete all chunks for a specific extraction.
    """
    try:
        chunking_service = ChunkingService(db)
        
        # First verify ownership by checking chunks
        chunks = await chunking_service.get_chunks_for_extraction(extraction_id)
        if chunks and chunks[0].user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete chunks
        deleted_count = await chunking_service.delete_chunks_for_extraction(extraction_id)
        
        return {
            "success": True,
            "extractionId": extraction_id,
            "deletedCount": deleted_count,
            "message": f"Deleted {deleted_count} chunks"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Chunks API] Error deleting chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))