"""
API Key Authentication Middleware
Validates API keys for public endpoints
"""
from fastapi import Header, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from app.core.database import get_db


# Placeholder for API Key model - will be replaced when API Key schema is created
class ApiKeyPlaceholder:
    """Temporary placeholder for API Key model"""
    def __init__(self, id: str, user_id: str, name: str, monthly_limit: int, monthly_usage: int):
        self.id = id
        self.user_id = user_id
        self.name = name
        self.monthly_limit = monthly_limit
        self.monthly_usage = monthly_usage
        self.is_active = True
        self.last_used_at = None


async def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db)
) -> ApiKeyPlaceholder:
    """
    Verify API key from request header
    
    This is a placeholder implementation that will be replaced when:
    1. API Key schema is created in database
    2. API Key CRUD service is implemented
    
    Args:
        x_api_key: API key from X-API-Key header
        db: Database session
        
    Returns:
        ApiKeyPlaceholder: API key object with user info
        
    Raises:
        HTTPException: If API key is invalid or missing
    """
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="API key is required. Please provide X-API-Key header."
        )
    
    # TODO: Replace with actual API Key service when available
    # Expected implementation:
    # from app.services.api_key_service import ApiKeyService
    # api_key_service = ApiKeyService(db)
    # api_key = await api_key_service.validate_api_key(x_api_key)
    
    # Placeholder: Return mock API key for development
    # This allows the endpoint structure to be created before API Key system
    raise HTTPException(
        status_code=501,
        detail={
            "message": "API Key authentication not yet implemented",
            "status": "pending_api_key_schema",
            "note": "Please wait for API Key schema migration and service implementation"
        }
    )
    
    # When API Key service is ready, the above exception will be replaced with:
    # if not api_key or not api_key.is_active:
    #     raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    # 
    # if api_key.expires_at and api_key.expires_at < datetime.utcnow():
    #     raise HTTPException(status_code=401, detail="API key has expired")
    # 
    # return api_key


async def check_api_key_quota(
    api_key: ApiKeyPlaceholder,
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
    # TODO: Replace with actual quota check when API Key service is available
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
) -> Optional[ApiKeyPlaceholder]:
    """
    Optional API key verification for endpoints that support both session and API key auth
    
    Returns None if no API key provided (will fall back to session auth)
    """
    if not x_api_key:
        return None
    
    return await verify_api_key(x_api_key, db)
