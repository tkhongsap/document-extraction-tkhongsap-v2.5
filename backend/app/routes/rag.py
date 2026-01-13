"""
RAG (Retrieval-Augmented Generation) API Routes
For resume Q&A with semantic search
"""
import time
import json
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..schemas.rag import (
    RAGQueryRequest,
    RAGQueryResponse,
    RAGStreamChunk,
    RAGHealthResponse,
    ResumeSource,
)
from ..services import get_rag_service, get_embedding_service, get_llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rag", tags=["RAG"])


@router.post("/query", response_model=RAGQueryResponse)
async def query_resumes(
    request: RAGQueryRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Query resumes using RAG (Retrieval-Augmented Generation)
    
    This endpoint:
    1. Converts your question to an embedding
    2. Finds relevant resumes via semantic search
    3. Uses retrieved context to generate an answer with LLM
    
    Supports both Thai and English queries.
    
    Example queries:
    - "หาผู้สมัครที่มีประสบการณ์ Python 5 ปีขึ้นไป"
    - "Find candidates with AWS certification"
    - "ใครเหมาะกับตำแหน่ง Senior Data Engineer"
    - "สรุปประสบการณ์ของผู้สมัครทั้งหมด"
    """
    start_time = time.time()
    
    try:
        rag_service = get_rag_service(
            db=db, 
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold,
<<<<<<< HEAD
=======
            use_chunks=request.use_chunks,
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
        )
        
        # Execute RAG query
        result = await rag_service.query(
            query=request.query,
            temperature=request.temperature,
        )
        
        # Build source list
        sources = [
            ResumeSource(
                resume_id=source.get("id", 0),
                name=source.get("name", "Unknown"),
                similarity_score=source.get("similarity_score", 0.0),
                position=source.get("current_role"),
                email=None,
            )
            for source in result.sources
        ]
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        return RAGQueryResponse(
            answer=result.answer,
            query=request.query,
            sources=sources,
            context=None,
            tokens_used=result.usage.get("total_tokens") if result.usage else None,
            model=result.model,
            processing_time_ms=processing_time_ms,
        )
        
    except ValueError as e:
        logger.warning(f"RAG query validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"RAG query error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing RAG query: {str(e)}"
        )


@router.post("/query/stream")
async def query_resumes_stream(
    request: RAGQueryRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Stream RAG query response using Server-Sent Events (SSE)
    
    Returns a stream of chunks:
    - type: 'sources' - Retrieved resume sources
    - type: 'content' - LLM response chunks
    - type: 'done' - Final metadata
    - type: 'error' - Error message
    
    Use this for real-time UI updates.
    """
    async def generate_stream():
        try:
            rag_service = get_rag_service(
                db=db, 
                top_k=request.top_k,
                similarity_threshold=request.similarity_threshold,
<<<<<<< HEAD
=======
                use_chunks=request.use_chunks,
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
            )
            
            # Stream the response
            async for chunk in rag_service.query_stream(
                query=request.query,
                temperature=request.temperature,
            ):
                # Convert to SSE format
                chunk_data = RAGStreamChunk(
                    type=chunk["type"],
                    content=chunk.get("content"),
                    sources=[
                        ResumeSource(
                            resume_id=s.get("id", 0),
                            name=s.get("name", "Unknown"),
                            similarity_score=s.get("similarity_score", 0.0),
                            position=s.get("current_role"),
                            email=None,
                        )
                        for s in chunk.get("sources", [])
                    ] if chunk.get("sources") else None,
                    error=chunk.get("error"),
                    metadata=chunk.get("metadata"),
                )
                
                yield f"data: {chunk_data.model_dump_json()}\n\n"
                
        except Exception as e:
            logger.error(f"RAG stream error: {e}", exc_info=True)
            error_chunk = RAGStreamChunk(type="error", error=str(e))
            yield f"data: {error_chunk.model_dump_json()}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/health", response_model=RAGHealthResponse)
async def rag_health_check():
    """
    Check RAG service health
    
    Verifies:
    - Embedding service availability
    - LLM service availability
    """
    try:
        embedding_service = get_embedding_service()
        llm_service = get_llm_service()
        
        return RAGHealthResponse(
            status="healthy",
            embedding_provider=embedding_service.provider,
            llm_provider="openai",
            llm_model=llm_service.model,
            message="RAG service is ready"
        )
    except Exception as e:
        logger.error(f"RAG health check failed: {e}")
        return RAGHealthResponse(
            status="unhealthy",
            embedding_provider="unknown",
            llm_provider="unknown",
            llm_model="unknown",
            message=str(e)
        )


@router.get("/examples")
async def get_query_examples():
    """
    Get example queries for the RAG system
    
    Returns sample queries in Thai and English for common use cases.
    """
    return {
        "examples": [
            {
                "category": "skill_search",
                "queries": [
                    "หาผู้สมัครที่มีประสบการณ์ Python 5 ปีขึ้นไป",
                    "Find candidates with AWS certification",
                    "ใครมีทักษะ Machine Learning",
                    "List candidates who know React and TypeScript",
                ]
            },
            {
                "category": "position_matching",
                "queries": [
                    "ใครเหมาะกับตำแหน่ง Senior Data Engineer",
                    "Find suitable candidates for DevOps Lead position",
                    "หาคนสำหรับตำแหน่ง Full Stack Developer",
                ]
            },
            {
                "category": "experience_analysis",
                "queries": [
                    "สรุปประสบการณ์ของผู้สมัครทั้งหมด",
                    "Compare experience levels of all candidates",
                    "ใครมีประสบการณ์ทำงานบริษัทใหญ่",
                ]
            },
            {
                "category": "education",
                "queries": [
                    "หาผู้สมัครที่จบปริญญาโท",
                    "Find candidates from top universities",
                    "ใครมีวุฒิด้าน Computer Science",
                ]
            },
            {
                "category": "comparison",
                "queries": [
                    "เปรียบเทียบผู้สมัคร 3 อันดับแรก",
                    "Who is the most experienced in cloud technologies?",
                    "จัดอันดับผู้สมัครตาม years of experience",
                ]
            }
        ],
        "tips": [
            "ใช้ภาษาไทยหรืออังกฤษได้ทั้งสองภาษา",
            "ถามแบบเจาะจงจะได้คำตอบที่ตรงประเด็นกว่า",
            "ระบุ skill หรือ year ที่ต้องการจะช่วยกรองผลลัพธ์",
            "ใช้ top_k เพื่อกำหนดจำนวน resume ที่ต้องการค้นหา"
        ]
    }
