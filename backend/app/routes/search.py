"""
Search Routes - Semantic search for resumes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.resume_service import ResumeService
from app.models.user import User

router = APIRouter(prefix="/api/search", tags=["search"])


# ============================================================================
# Request/Response Schemas
# ============================================================================

class SemanticSearchRequest(BaseModel):
    """Request body for semantic search"""
    query: str = Field(..., description="Natural language search query", min_length=3, max_length=1000)
    limit: int = Field(10, ge=1, le=50, description="Maximum results to return")
    threshold: float = Field(0.5, ge=0.0, le=1.0, description="Minimum similarity score")


class SkillSearchRequest(BaseModel):
    """Request body for skill-based search"""
    skills: List[str] = Field(..., description="List of required skills", min_items=1)
    limit: int = Field(10, ge=1, le=50, description="Maximum results to return")


class ResumeSearchResult(BaseModel):
    """Search result item"""
    id: str
    userId: str
    extractionId: Optional[str]
    name: str
    email: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    currentRole: Optional[str]
    yearsExperience: Optional[int]
    skills: Optional[List[str]]
    summary: Optional[str]
    sourceFileName: Optional[str]
    createdAt: Optional[str]
    similarity: Optional[float] = None


class SearchResponse(BaseModel):
    """Search response"""
    results: List[ResumeSearchResult]
    total: int
    query: str


# ============================================================================
# Routes
# ============================================================================

@router.post("/resumes/semantic", response_model=SearchResponse)
async def search_resumes_semantic(
    request: SemanticSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Semantic search for resumes using natural language
    
    Examples:
    - "Python developer with 5 years experience"
    - "Data scientist in Bangkok with machine learning skills"
    - "Project manager with PMP certification"
    """
    try:
        resume_service = ResumeService(db)
        
        results = await resume_service.search_semantic(
            query=request.query,
            user_id=current_user.id,  # Only search user's own resumes
            limit=request.limit,
            threshold=request.threshold,
        )
        
        return SearchResponse(
            results=results,
            total=len(results),
            query=request.query,
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid search request: {str(e)}",
        )
    except Exception as e:
        print(f"[Search] Error in semantic search: {e}")
        raise HTTPException(
            status_code=500,
            detail="Search failed. Please check if OpenAI API key is configured.",
        )


@router.post("/resumes/skills", response_model=SearchResponse)
async def search_resumes_by_skills(
    request: SkillSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Search resumes by required skills
    
    Returns resumes sorted by number of matching skills
    """
    try:
        resume_service = ResumeService(db)
        
        resumes = await resume_service.search_by_skills(
            skills=request.skills,
            user_id=current_user.id,
            limit=request.limit,
        )
        
        results = [
            ResumeSearchResult(
                id=r.id,
                userId=r.user_id,
                extractionId=r.extraction_id,
                name=r.name,
                email=r.email,
                phone=r.phone,
                location=r.location,
                currentRole=r.current_role,
                yearsExperience=r.years_experience,
                skills=r.skills,
                summary=r.summary,
                sourceFileName=r.source_file_name,
                createdAt=r.created_at.isoformat() if r.created_at else None,
            )
            for r in resumes
        ]
        
        return SearchResponse(
            results=results,
            total=len(results),
            query=f"skills: {', '.join(request.skills)}",
        )
    
    except Exception as e:
        print(f"[Search] Error in skill search: {e}")
        raise HTTPException(
            status_code=500,
            detail="Search failed",
        )


@router.get("/resumes", response_model=SearchResponse)
async def list_resumes(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all resumes for the current user
    """
    try:
        resume_service = ResumeService(db)
        
        resumes = await resume_service.get_by_user(
            user_id=current_user.id,
            limit=limit,
            offset=offset,
        )
        
        total = await resume_service.count_by_user(current_user.id)
        
        results = [
            ResumeSearchResult(
                id=r.id,
                userId=r.user_id,
                extractionId=r.extraction_id,
                name=r.name,
                email=r.email,
                phone=r.phone,
                location=r.location,
                currentRole=r.current_role,
                yearsExperience=r.years_experience,
                skills=r.skills,
                summary=r.summary,
                sourceFileName=r.source_file_name,
                createdAt=r.created_at.isoformat() if r.created_at else None,
            )
            for r in resumes
        ]
        
        return SearchResponse(
            results=results,
            total=total,
            query="all",
        )
    
    except Exception as e:
        print(f"[Search] Error listing resumes: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to list resumes",
        )


@router.get("/resumes/{resume_id}")
async def get_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific resume by ID
    """
    try:
        resume_service = ResumeService(db)
        resume = await resume_service.get_by_id(resume_id)
        
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Check ownership
        if resume.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return resume.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Search] Error getting resume: {e}")
        raise HTTPException(status_code=500, detail="Failed to get resume")


@router.delete("/resumes/{resume_id}")
async def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a resume
    """
    try:
        resume_service = ResumeService(db)
        resume = await resume_service.get_by_id(resume_id)
        
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Check ownership
        if resume.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        await resume_service.delete(resume_id)
        
        return {"message": "Resume deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Search] Error deleting resume: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete resume")


@router.post("/resumes/{resume_id}/regenerate-embedding")
async def regenerate_resume_embedding(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Regenerate embedding for a resume
    Useful after updating resume data or changing embedding model
    """
    try:
        resume_service = ResumeService(db)
        resume = await resume_service.get_by_id(resume_id)
        
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Check ownership
        if resume.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        updated_resume = await resume_service.regenerate_embedding(resume_id)
        
        if not updated_resume:
            raise HTTPException(
                status_code=500, 
                detail="Failed to regenerate embedding. Check OpenAI API key."
            )
        
        return {
            "message": "Embedding regenerated successfully",
            "resumeId": resume_id,
            "embeddingModel": updated_resume.embedding_model,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Search] Error regenerating embedding: {e}")
        raise HTTPException(status_code=500, detail="Failed to regenerate embedding")
