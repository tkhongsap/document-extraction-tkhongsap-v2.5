"""
API Key Authentication Middleware
Validates API keys for public endpoints with rate limiting support

Features:
- Extract API key from X-API-Key or Authorization: Bearer headers
- Secure hash comparison for key validation
- Redis-based rate limiting (with in-memory fallback)
- Standardized error responses (401, 403, 429)
"""
from fastapi import Header, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Tuple
from datetime import datetime

from app.core.database import get_db
from app.core.config import get_settings
from app.core.errors import (
    MissingApiKeyError,
    InvalidApiKeyError,
    ExpiredApiKeyError,
    InactiveApiKeyError,
    QuotaExceededError,
    TooManyRequestsError,
)
from app.models.api_key import ApiKey
from app.services.api_key_service import ApiKeyService
from app.services.rate_limit_service import (
    get_rate_limiter,
    RateLimitConfig,
    RATE_LIMIT_CONFIGS,
)


def extract_api_key(
    x_api_key: Optional[str] = None,
    authorization: Optional[str] = None,
) -> Optional[str]:
    """
    Extract API key from request headers.
    
    Supports two formats:
    1. X-API-Key: dk_xxxxx header
    2. Authorization: Bearer dk_xxxxx header
    
    Args:
        x_api_key: Value of X-API-Key header
        authorization: Value of Authorization header
        
    Returns:
        Extracted API key string or None
    """
    # First try X-API-Key header
    if x_api_key:
        return x_api_key.strip()
    
    # Then try Authorization: Bearer header
    if authorization:
        auth = authorization.strip()
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()  # Remove "Bearer " prefix
            # Only accept API keys (dk_ prefix) from Bearer auth
            if token.startswith("dk_"):
                return token
    
    return None


async def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> ApiKey:
    """
    Verify API key from request header.
    
    Extracts key from either X-API-Key or Authorization: Bearer headers,
    validates against database using secure hash comparison.
    
    Args:
        x_api_key: API key from X-API-Key header
        authorization: Authorization header (for Bearer token)
        db: Database session
        
    Returns:
        ApiKey: Validated API key model object
        
    Raises:
        MissingApiKeyError: If no API key provided
        InvalidApiKeyError: If API key doesn't exist or hash mismatch
        InactiveApiKeyError: If API key is deactivated
        ExpiredApiKeyError: If API key has expired
    """
    # Extract API key from headers
    raw_key = extract_api_key(x_api_key, authorization)
    
    if not raw_key:
        raise MissingApiKeyError(
            detail="API key is required. Provide X-API-Key header or Authorization: Bearer token."
        )
    
    # Validate format
    if not raw_key.startswith("dk_"):
        raise InvalidApiKeyError(
            detail="Invalid API key format. Keys must start with 'dk_' prefix."
        )
    
    # Validate against database
    api_key_service = ApiKeyService(db)
    api_key = await api_key_service.validate_api_key(raw_key)
    
    if not api_key:
        raise InvalidApiKeyError(
            detail="Invalid API key. Please check your key and try again."
        )
    
    # Check if active
    if not api_key.is_active:
        raise InactiveApiKeyError(
            detail="API key has been deactivated. Please contact support."
        )
    
    # Check expiration
    if api_key.expires_at and api_key.expires_at < datetime.utcnow():
        raise ExpiredApiKeyError(
            detail="API key has expired. Please generate a new key.",
            expired_at=api_key.expires_at.isoformat(),
        )
    
    # Update last used timestamp
    await api_key_service.record_usage(api_key.id)
    
    return api_key


async def verify_api_key_with_rate_limit(
    request: Request,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> Tuple[ApiKey, dict]:
    """
    Verify API key and check rate limits.
    
    Args:
        request: FastAPI request object
        x_api_key: API key from X-API-Key header
        authorization: Authorization header
        db: Database session
        
    Returns:
        Tuple of (ApiKey, rate_limit_info dict)
        
    Raises:
        TooManyRequestsError: If rate limit exceeded
    """
    # First verify the API key
    api_key = await verify_api_key(x_api_key, authorization, db)
    
    # Get rate limiter
    settings = get_settings()
    redis_url = getattr(settings, 'REDIS_URL', None)
    rate_limiter = get_rate_limiter(redis_url)
    
    # Determine rate limit config based on API key or tier
    config = RATE_LIMIT_CONFIGS.get("api_key_default")
    
    # Check rate limit
    result = await rate_limiter.check_rate_limit(
        identifier=f"api_key:{api_key.id}",
        config=config,
    )
    
    rate_limit_info = {
        "limit": result.limit,
        "remaining": result.remaining,
        "reset_at": result.reset_at,
    }
    
    if not result.allowed:
        raise TooManyRequestsError(
            limit=result.limit,
            retry_after=result.retry_after,
        )
    
    return api_key, rate_limit_info


async def check_api_key_quota(
    api_key: ApiKey,
    pages_required: int = 1,
    db: AsyncSession = None,
) -> bool:
    """
    Check if API key has sufficient quota for the request.
    
    Args:
        api_key: API key object
        pages_required: Number of pages required for this request
        db: Database session (optional, for updating quota)
        
    Returns:
        bool: True if quota is sufficient
        
    Raises:
        QuotaExceededError: If monthly quota exceeded
    """
    available = api_key.monthly_limit - api_key.monthly_usage
    
    if pages_required > available:
        raise QuotaExceededError(
            usage=api_key.monthly_usage,
            limit=api_key.monthly_limit,
        )
    
    return True


async def check_api_key_scope(
    api_key: ApiKey,
    required_scope: str,
) -> bool:
    """
    Check if API key has required scope/permission.
    
    Args:
        api_key: API key object
        required_scope: Required scope string (e.g., 'extract:read', 'extract:write')
        
    Returns:
        bool: True if scope is allowed
        
    Raises:
        ScopeNotAllowedError: If scope not in API key's allowed scopes
    """
    from app.core.errors import ScopeNotAllowedError
    
    # If no scopes defined, allow all (backward compatible)
    if not api_key.scopes:
        return True
    
    # Parse scopes (stored as comma-separated string or JSON array)
    allowed_scopes = []
    if isinstance(api_key.scopes, str):
        allowed_scopes = [s.strip() for s in api_key.scopes.split(",")]
    elif isinstance(api_key.scopes, list):
        allowed_scopes = api_key.scopes
    
    # Check for wildcard or specific scope
    if "*" in allowed_scopes or required_scope in allowed_scopes:
        return True
    
    # Check for prefix match (e.g., 'extract:*' matches 'extract:read')
    scope_prefix = required_scope.split(":")[0] + ":*"
    if scope_prefix in allowed_scopes:
        return True
    
    raise ScopeNotAllowedError(
        detail=f"API key does not have '{required_scope}' permission.",
        required_scope=required_scope,
        available_scopes=allowed_scopes,
    )


async def get_optional_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> Optional[ApiKey]:
    """
    Optional API key verification for endpoints that support both session and API key auth.
    
    Returns None if no API key provided (will fall back to session auth).
    Does not raise error if API key is missing.
    
    Args:
        x_api_key: API key from X-API-Key header
        authorization: Authorization header
        db: Database session
        
    Returns:
        ApiKey if provided and valid, None otherwise
    """
    raw_key = extract_api_key(x_api_key, authorization)
    
    if not raw_key:
        return None
    
    # If key is provided, validate it fully
    return await verify_api_key(x_api_key, authorization, db)


def add_rate_limit_headers(response: JSONResponse, rate_limit_info: dict) -> JSONResponse:
    """
    Add rate limit headers to response.
    
    Headers added:
    - X-RateLimit-Limit: Maximum requests per window
    - X-RateLimit-Remaining: Remaining requests in current window
    - X-RateLimit-Reset: Unix timestamp when window resets
    
    Args:
        response: FastAPI JSONResponse object
        rate_limit_info: Dict with limit, remaining, reset_at
        
    Returns:
        Response with added headers
    """
    response.headers["X-RateLimit-Limit"] = str(rate_limit_info.get("limit", 0))
    response.headers["X-RateLimit-Remaining"] = str(rate_limit_info.get("remaining", 0))
    response.headers["X-RateLimit-Reset"] = str(rate_limit_info.get("reset_at", 0))
    
    return response
