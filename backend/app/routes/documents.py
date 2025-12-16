"""
Document Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.storage import StorageService
from app.services.object_storage import ObjectStorageService, ObjectAclPolicy
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentSaveRequest, DocumentCreate

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=dict)
async def get_documents(
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's documents"""
    storage = StorageService(db)
    documents = await storage.get_documents_by_user_id(user.id, limit)
    return {"documents": [DocumentResponse.model_validate(d) for d in documents]}


@router.get("/{document_id}", response_model=dict)
async def get_document(
    document_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific document by ID"""
    storage = StorageService(db)
    document = await storage.get_document(document_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {"document": DocumentResponse.model_validate(document)}


@router.post("", response_model=dict, status_code=201)
async def save_document(
    data: DocumentSaveRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save document after upload"""
    object_storage = ObjectStorageService()
    
    try:
        object_path = await object_storage.try_set_object_entity_acl_policy(
            data.upload_url,
            ObjectAclPolicy(owner=user.id, visibility="private"),
        )
        
        storage = StorageService(db)
        document = await storage.create_document(DocumentCreate(
            user_id=user.id,
            file_name=data.file_name,
            file_size=data.file_size,
            mime_type=data.mime_type,
            object_path=object_path,
        ))
        
        return {"document": DocumentResponse.model_validate(document)}
    except Exception as e:
        print(f"Error saving document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("-with-extractions", response_model=dict)
async def get_documents_with_extractions(
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get documents grouped by filename with their extractions"""
    storage = StorageService(db)
    documents = await storage.get_extractions_grouped_by_document(user.id, limit)
    return {"documents": documents}
