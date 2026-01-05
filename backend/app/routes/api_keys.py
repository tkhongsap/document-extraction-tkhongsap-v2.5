"""
API Keys Routes
CRUD endpoints for managing API keys
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.api_key_service import ApiKeyService
from app.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyUpdate,
    ApiKeyResponse,
    ApiKeyCreateResponse,
    ApiKeyListResponse,
    ApiKeyDeleteResponse,
    ApiKeyRegenerateResponse,
    ApiKeyUsageStatsResponse,
)


router = APIRouter(prefix="/api/keys", tags=["api-keys"])


# ============================================================================
# CRUD Endpoints
# ============================================================================

@router.post("", response_model=ApiKeyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    request: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new API key.
    
    ⚠️ IMPORTANT: The plain key is returned ONLY in this response.
    Store it securely - it cannot be retrieved again!
    
    Returns:
        - API key metadata
        - Plain key (show once, then store securely)
    """
    service = ApiKeyService(db)
    
    try:
        api_key, plain_key = await service.create_api_key(
            user_id=current_user.id,
            name=request.name,
            monthly_limit=request.monthly_limit,
            scopes=request.scopes or "extract,read",
            expires_at=request.expires_at,
        )
        
        return ApiKeyCreateResponse(
            success=True,
            message="API key created successfully. Store the key securely - it won't be shown again!",
            apiKey=ApiKeyResponse.from_model(api_key),
            plainKey=plain_key,
        )
    except Exception as e:
        import traceback
        print(f"[API Keys] Error creating key: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create API key: {str(e)}"
        )


@router.get("", response_model=ApiKeyListResponse)
async def list_api_keys(
    include_inactive: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all API keys for the current user.
    
    Keys are returned with masked values (only prefix is visible).
    
    Query params:
        - include_inactive: Include soft-deleted keys (default: false)
    """
    service = ApiKeyService(db)
    
    api_keys = await service.list_api_keys(
        user_id=current_user.id,
        include_inactive=include_inactive,
    )
    
    return ApiKeyListResponse(
        success=True,
        apiKeys=[ApiKeyResponse.from_model(k) for k in api_keys],
        total=len(api_keys),
    )


@router.get("/{key_id}", response_model=ApiKeyResponse)
async def get_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific API key by ID.
    
    Only returns metadata - the actual key is never retrievable.
    """
    service = ApiKeyService(db)
    
    api_key = await service.get_api_key_by_id(key_id, current_user.id)
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return ApiKeyResponse.from_model(api_key)


@router.patch("/{key_id}", response_model=ApiKeyResponse)
async def update_api_key(
    key_id: str,
    request: ApiKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update an API key's settings.
    
    Updatable fields:
        - name: Friendly name
        - monthly_limit: Usage limit
        - scopes: Permissions
        - is_active: Enable/disable
        - expires_at: Expiration date
    """
    service = ApiKeyService(db)
    
    api_key = await service.update_api_key(
        key_id=key_id,
        user_id=current_user.id,
        name=request.name,
        monthly_limit=request.monthly_limit,
        scopes=request.scopes,
        is_active=request.is_active,
        expires_at=request.expires_at,
    )
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return ApiKeyResponse.from_model(api_key)


@router.delete("/{key_id}", response_model=ApiKeyDeleteResponse)
async def delete_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Soft delete an API key.
    
    The key is deactivated but not removed from the database.
    This allows for audit trails and potential recovery.
    """
    service = ApiKeyService(db)
    
    success = await service.delete_api_key(key_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return ApiKeyDeleteResponse(
        success=True,
        message="API key deleted successfully"
    )


# ============================================================================
# Key Regeneration
# ============================================================================

@router.post("/{key_id}/regenerate", response_model=ApiKeyRegenerateResponse)
async def regenerate_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Regenerate an API key.
    
    This creates a new key value while keeping the same settings.
    The old key is immediately invalidated.
    
    ⚠️ IMPORTANT: The new plain key is returned ONLY in this response.
    Store it securely - it cannot be retrieved again!
    """
    service = ApiKeyService(db)
    
    result = await service.regenerate_api_key(key_id, current_user.id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    api_key, plain_key = result
    
    return ApiKeyRegenerateResponse(
        success=True,
        message="API key regenerated successfully. Store the new key securely - it won't be shown again!",
        apiKey=ApiKeyResponse.from_model(api_key),
        plainKey=plain_key,
    )


# ============================================================================
# Usage Statistics
# ============================================================================

@router.get("/{key_id}/stats", response_model=ApiKeyUsageStatsResponse)
async def get_api_key_stats(
    key_id: str,
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get usage statistics for an API key.
    
    Query params:
        - days: Number of days to look back (default: 30)
    
    Returns:
        - Total requests
        - Successful/failed requests
        - Total pages processed
        - Average response time
    """
    service = ApiKeyService(db)
    
    # Verify key exists and belongs to user
    api_key = await service.get_api_key_by_id(key_id, current_user.id)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    stats = await service.get_usage_stats(key_id, current_user.id, days)
    
    return ApiKeyUsageStatsResponse(
        success=True,
        stats=stats,
    )
