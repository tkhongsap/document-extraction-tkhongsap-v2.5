"""
Object Storage Routes
"""
from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.services.object_storage import ObjectStorageService
from app.models.user import User
from app.schemas.common import UploadURLResponse
from fastapi import HTTPException

router = APIRouter(prefix="/api/objects", tags=["objects"])


@router.post("/upload", response_model=UploadURLResponse)
async def get_upload_url(
    user: User = Depends(get_current_user),
):
    """Get upload URL for documents"""
    try:
        object_storage = ObjectStorageService()
        upload_url = await object_storage.get_object_entity_upload_url()
        return UploadURLResponse(uploadURL=upload_url)
    except Exception as e:
        print(f"Error getting upload URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))
