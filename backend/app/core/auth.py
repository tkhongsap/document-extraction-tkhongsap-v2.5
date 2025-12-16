"""
Authentication utilities and dependencies
"""
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from app.services.storage import StorageService
from app.models import User

security = HTTPBearer(auto_error=False)


async def get_current_user_id(request: Request) -> Optional[str]:
    """
    Get current user ID from session.
    For development, returns a test user ID.
    """
    # Check session for user
    session = request.session
    user_data = session.get("user")
    
    if user_data and "sub" in user_data:
        return user_data["sub"]
    
    return None


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get current authenticated user.
    Raises 401 if not authenticated.
    """
    user_id = await get_current_user_id(request)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    storage = StorageService(db)
    user = await storage.get_user(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user


async def get_optional_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Dependency to get current user if authenticated, None otherwise.
    """
    user_id = await get_current_user_id(request)
    
    if not user_id:
        return None
    
    storage = StorageService(db)
    return await storage.get_user(user_id)


async def ensure_usage_reset(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to ensure user's monthly usage is reset if needed.
    Returns the user (possibly with reset usage).
    """
    storage = StorageService(db)
    return await storage.check_and_reset_if_needed(user.id)
