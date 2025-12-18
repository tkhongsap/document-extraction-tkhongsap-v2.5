"""
User Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.storage import StorageService
from app.models.user import User
from app.schemas.user import UserUpdate, TierUpdate

router = APIRouter(prefix="/api/user", tags=["user"])


@router.patch("/language")
async def update_user_language(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user language preference"""
    if not data.language or data.language not in ("en", "th"):
        raise HTTPException(status_code=400, detail="Language must be 'en' or 'th'")
    
    storage = StorageService(db)
    await storage.update_user_language(user.id, data.language)
    
    return {"success": True}


@router.post("/change-tier")
async def change_user_tier(
    data: TierUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change user's subscription tier"""
    storage = StorageService(db)
    
    try:
        updated_user = await storage.update_user_tier(user.id, data.tier)
        
        return {
            "success": True,
            "tier": updated_user.tier,
            "monthly_limit": updated_user.monthly_limit,
            "monthly_usage": updated_user.monthly_usage,
            "message": f"Successfully changed to {data.tier} tier"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
