"""
API Key Authentication Middleware
Validates API keys for public endpoints
"""
from fastapi import Header, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.services.api_key_service import ApiKeyService
from app.models.api_key import ApiKey


# Keep ApiKeyPlaceholder for backward compatibility (alias to ApiKey)
ApiKeyPlaceholder = ApiKey


async def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db)
) -> ApiKey:
    """
    Verify API key from request header
    
    Args:
        x_api_key: API key from X-API-Key header
        db: Database session
        
    Returns:
        ApiKey: Validated API key object with user info
        
    Raises:
        HTTPException: If API key is invalid or missing
    """
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="API key is required. Please provide X-API-Key header."
        )
    
    # Validate API key using ApiKeyService
    api_key_service = ApiKeyService(db)
    api_key = await api_key_service.validate_api_key(x_api_key)
    
    if not api_key:
        raise HTTPException(
            status_code=401, 
            detail="Invalid or inactive API key"
        )
    
    # Check if expired (is_valid() already checks this, but be explicit)
    if api_key.expires_at and api_key.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=401, 
            detail="API key has expired"
        )
    
    return api_key


async def check_api_key_quota(
    api_key: ApiKey,
    pages_required: int = 1
) -> bool:
    """
    Check if API key has sufficient quota for the request
    
    Args:
        api_key: API key object
        pages_required: Number of pages required for this request
        
    Returns:
        bool: True if quota is sufficient
        
    Raises:
        HTTPException: If quota exceeded
    """
    if api_key.monthly_usage + pages_required > api_key.monthly_limit:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "API key monthly quota exceeded",
                "usage": api_key.monthly_usage,
                "limit": api_key.monthly_limit,
                "required": pages_required,
                "available": api_key.monthly_limit - api_key.monthly_usage
            }
        )
    
    return True


async def get_optional_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db)
) -> Optional[ApiKey]:
    """
    Optional API key verification for endpoints that support both session and API key auth
    
    Returns None if no API key provided (will fall back to session auth)
    """
    if not x_api_key:
        return None
    
    return await verify_api_key(x_api_key, db)
