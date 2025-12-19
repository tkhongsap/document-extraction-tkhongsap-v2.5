"""
Extraction Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user, ensure_usage_reset
from app.services.storage import StorageService
from app.models.user import User
from app.schemas.extraction import ExtractionResponse, ExtractionCreate
from app.schemas.document import DocumentWithExtractions

router = APIRouter(prefix="/api/extractions", tags=["extractions"])


# Documents with extractions route - must be outside the prefix
docs_with_extractions_router = APIRouter(tags=["extractions"])


@docs_with_extractions_router.get("/api/documents-with-extractions", response_model=dict)
async def get_documents_with_extractions(
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get documents grouped with their extractions"""
    storage = StorageService(db)
    documents = await storage.get_extractions_grouped_by_document(user.id, limit)
    return {"documents": [doc.model_dump(by_alias=True) for doc in documents]}


@router.get("", response_model=dict)
async def get_extractions(
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's extractions"""
    storage = StorageService(db)
    extractions = await storage.get_extractions_by_user_id(user.id, limit)
    return {"extractions": [ExtractionResponse.model_validate(e).model_dump(by_alias=True) for e in extractions]}


@router.get("/{extraction_id}", response_model=dict)
async def get_extraction(
    extraction_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific extraction by ID"""
    storage = StorageService(db)
    extraction = await storage.get_extraction(extraction_id)
    
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not found")
    
    if extraction.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {"extraction": ExtractionResponse.model_validate(extraction)}


@router.post("", response_model=dict)
async def create_extraction(
    data: ExtractionCreate,
    user: User = Depends(ensure_usage_reset),
    db: AsyncSession = Depends(get_db),
):
    """Create a new extraction record"""
    storage = StorageService(db)
    
    # Check monthly limit
    new_usage = user.monthly_usage + data.pages_processed
    if new_usage > user.monthly_limit:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Monthly page limit exceeded",
                "usage": user.monthly_usage,
                "limit": user.monthly_limit,
            }
        )
    
    # Create extraction
    data.user_id = user.id
    extraction = await storage.create_extraction(data)
    
    # Update usage
    await storage.update_user_usage(user.id, data.pages_processed)
    
    return {"extraction": ExtractionResponse.model_validate(extraction)}
