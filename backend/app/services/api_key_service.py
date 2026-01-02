"""
API Key Service
Handles API key generation, hashing, validation, and CRUD operations
"""
import secrets
import hashlib
from typing import Optional, List, Tuple
from datetime import datetime
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key import ApiKey
from app.models.api_usage_log import ApiUsageLog


# API Key format constants
API_KEY_PREFIX = "dk_"  # Document AI Key
API_KEY_LENGTH = 32  # 32 random characters after prefix


class ApiKeyService:
    """Service for managing API keys"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # =========================================================================
    # Key Generation & Hashing
    # =========================================================================
    
    @staticmethod
    def generate_api_key() -> Tuple[str, str, str]:
        """
        Generate a new API key with secure random characters.
        
        Returns:
            Tuple of (plain_key, hashed_key, prefix)
            - plain_key: The full key to show to user ONCE (dk_xxxx...)
            - hashed_key: SHA256 hash for storage
            - prefix: First 8 chars for identification (dk_xxxx)
        """
        # Generate 32 random characters (URL-safe base64)
        random_part = secrets.token_urlsafe(24)[:API_KEY_LENGTH]
        
        # Full plain key
        plain_key = f"{API_KEY_PREFIX}{random_part}"
        
        # Prefix for identification (first 8 chars including dk_)
        prefix = plain_key[:8]
        
        # SHA256 hash for secure storage
        hashed_key = ApiKeyService.hash_key(plain_key)
        
        return plain_key, hashed_key, prefix
    
    @staticmethod
    def hash_key(plain_key: str) -> str:
        """
        Hash an API key using SHA256.
        
        Args:
            plain_key: The plain text API key
            
        Returns:
            SHA256 hex digest of the key
        """
        return hashlib.sha256(plain_key.encode('utf-8')).hexdigest()
    
    @staticmethod
    def verify_key(plain_key: str, hashed_key: str) -> bool:
        """
        Verify a plain key against its hash.
        
        Args:
            plain_key: The plain text API key to verify
            hashed_key: The stored hash to compare against
            
        Returns:
            True if the key matches the hash
        """
        return ApiKeyService.hash_key(plain_key) == hashed_key
    
    # =========================================================================
    # CRUD Operations
    # =========================================================================
    
    async def create_api_key(
        self,
        user_id: str,
        name: str,
        monthly_limit: int = 1000,
        scopes: str = "extract,read",
        expires_at: Optional[datetime] = None,
    ) -> Tuple[ApiKey, str]:
        """
        Create a new API key for a user.
        
        Args:
            user_id: The owner's user ID
            name: A friendly name for the key
            monthly_limit: Monthly usage limit (default 1000)
            scopes: Comma-separated permissions
            expires_at: Optional expiration date
            
        Returns:
            Tuple of (ApiKey model, plain_key)
            Note: plain_key must be shown to user only once!
        """
        # Generate key
        plain_key, hashed_key, prefix = self.generate_api_key()
        
        # Create database record
        api_key = ApiKey(
            user_id=user_id,
            name=name,
            hashed_key=hashed_key,
            prefix=prefix,
            monthly_limit=monthly_limit,
            monthly_usage=0,
            is_active=True,
            scopes=scopes,
            expires_at=expires_at,
        )
        
        self.db.add(api_key)
        await self.db.commit()
        await self.db.refresh(api_key)
        
        return api_key, plain_key
    
    async def get_api_key_by_id(self, key_id: str, user_id: str) -> Optional[ApiKey]:
        """
        Get an API key by ID (must belong to user).
        
        Args:
            key_id: The API key ID
            user_id: The owner's user ID
            
        Returns:
            ApiKey if found and belongs to user, None otherwise
        """
        result = await self.db.execute(
            select(ApiKey).where(
                and_(
                    ApiKey.id == key_id,
                    ApiKey.user_id == user_id,
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def get_api_key_by_hash(self, hashed_key: str) -> Optional[ApiKey]:
        """
        Get an API key by its hash (for authentication).
        
        Args:
            hashed_key: The SHA256 hash of the plain key
            
        Returns:
            ApiKey if found, None otherwise
        """
        result = await self.db.execute(
            select(ApiKey).where(ApiKey.hashed_key == hashed_key)
        )
        return result.scalar_one_or_none()
    
    async def validate_api_key(self, plain_key: str) -> Optional[ApiKey]:
        """
        Validate an API key and return if valid.
        Also updates last_used_at timestamp.
        
        Args:
            plain_key: The plain text API key
            
        Returns:
            ApiKey if valid and active, None otherwise
        """
        # Hash the provided key
        hashed_key = self.hash_key(plain_key)
        
        # Look up by hash
        api_key = await self.get_api_key_by_hash(hashed_key)
        
        if not api_key:
            return None
        
        # Check if key is valid (active and not expired)
        if not api_key.is_valid():
            return None
        
        # Update last_used_at
        api_key.last_used_at = datetime.utcnow()
        await self.db.commit()
        
        return api_key
    
    async def list_api_keys(
        self,
        user_id: str,
        include_inactive: bool = False,
    ) -> List[ApiKey]:
        """
        List all API keys for a user.
        
        Args:
            user_id: The owner's user ID
            include_inactive: Whether to include soft-deleted keys
            
        Returns:
            List of ApiKey objects (never includes hashed_key in response)
        """
        query = select(ApiKey).where(ApiKey.user_id == user_id)
        
        if not include_inactive:
            query = query.where(ApiKey.is_active == True)
        
        query = query.order_by(ApiKey.created_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def update_api_key(
        self,
        key_id: str,
        user_id: str,
        name: Optional[str] = None,
        monthly_limit: Optional[int] = None,
        scopes: Optional[str] = None,
        is_active: Optional[bool] = None,
        expires_at: Optional[datetime] = None,
    ) -> Optional[ApiKey]:
        """
        Update an API key's settings.
        
        Args:
            key_id: The API key ID
            user_id: The owner's user ID
            name: New name (optional)
            monthly_limit: New monthly limit (optional)
            scopes: New scopes (optional)
            is_active: New active status (optional)
            expires_at: New expiration date (optional)
            
        Returns:
            Updated ApiKey if found, None otherwise
        """
        api_key = await self.get_api_key_by_id(key_id, user_id)
        
        if not api_key:
            return None
        
        # Update fields if provided
        if name is not None:
            api_key.name = name
        if monthly_limit is not None:
            api_key.monthly_limit = monthly_limit
        if scopes is not None:
            api_key.scopes = scopes
        if is_active is not None:
            api_key.is_active = is_active
        if expires_at is not None:
            api_key.expires_at = expires_at
        
        api_key.updated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(api_key)
        
        return api_key
    
    async def delete_api_key(self, key_id: str, user_id: str) -> bool:
        """
        Soft delete an API key (set is_active = False).
        
        Args:
            key_id: The API key ID
            user_id: The owner's user ID
            
        Returns:
            True if deleted, False if not found
        """
        api_key = await self.get_api_key_by_id(key_id, user_id)
        
        if not api_key:
            return False
        
        api_key.is_active = False
        api_key.updated_at = datetime.utcnow()
        
        await self.db.commit()
        
        return True
    
    async def regenerate_api_key(
        self,
        key_id: str,
        user_id: str,
    ) -> Optional[Tuple[ApiKey, str]]:
        """
        Regenerate an API key (new key, same settings).
        Old key becomes immediately invalid.
        
        Args:
            key_id: The API key ID
            user_id: The owner's user ID
            
        Returns:
            Tuple of (ApiKey, new_plain_key) if found, None otherwise
        """
        api_key = await self.get_api_key_by_id(key_id, user_id)
        
        if not api_key:
            return None
        
        # Generate new key
        plain_key, hashed_key, prefix = self.generate_api_key()
        
        # Update the key
        api_key.hashed_key = hashed_key
        api_key.prefix = prefix
        api_key.updated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(api_key)
        
        return api_key, plain_key
    
    # =========================================================================
    # Usage Tracking
    # =========================================================================
    
    async def increment_usage(self, api_key: ApiKey, pages: int = 1) -> None:
        """
        Increment the monthly usage counter for an API key.
        
        Args:
            api_key: The ApiKey object
            pages: Number of pages to add
        """
        api_key.monthly_usage += pages
        await self.db.commit()
    
    async def record_usage(self, api_key_id: str) -> None:
        """
        Record that an API key was used (updates last_used_at).
        Called by middleware on each authenticated request.
        
        Args:
            api_key_id: The API key ID
        """
        await self.db.execute(
            update(ApiKey)
            .where(ApiKey.id == api_key_id)
            .values(last_used_at=datetime.utcnow())
        )
        await self.db.commit()
    
    async def check_usage_limit(self, api_key: ApiKey) -> bool:
        """
        Check if an API key has remaining usage quota.
        
        Args:
            api_key: The ApiKey object
            
        Returns:
            True if usage is within limit
        """
        return api_key.monthly_usage < api_key.monthly_limit
    
    async def reset_monthly_usage(self, api_key: ApiKey) -> None:
        """
        Reset monthly usage counter (called on monthly reset).
        
        Args:
            api_key: The ApiKey object
        """
        api_key.monthly_usage = 0
        api_key.last_reset_at = datetime.utcnow()
        await self.db.commit()
    
    async def log_api_usage(
        self,
        api_key_id: str,
        endpoint: str,
        status_code: int,
        method: str = "POST",
        response_time_ms: Optional[int] = None,
        pages_processed: int = 0,
        request_metadata: Optional[dict] = None,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> ApiUsageLog:
        """
        Log an API request for analytics.
        
        Args:
            api_key_id: The API key ID
            endpoint: The endpoint called
            status_code: HTTP status code
            method: HTTP method
            response_time_ms: Response time in milliseconds
            pages_processed: Pages consumed
            request_metadata: Additional metadata
            error_message: Error message if any
            ip_address: Client IP
            user_agent: Client user agent
            
        Returns:
            Created ApiUsageLog
        """
        log = ApiUsageLog.create_log(
            api_key_id=api_key_id,
            endpoint=endpoint,
            status_code=status_code,
            method=method,
            response_time_ms=response_time_ms,
            pages_processed=pages_processed,
            request_metadata=request_metadata,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        
        return log
    
    async def get_usage_stats(
        self,
        api_key_id: str,
        user_id: str,
        days: int = 30,
    ) -> dict:
        """
        Get usage statistics for an API key.
        
        Args:
            api_key_id: The API key ID
            user_id: The owner's user ID
            days: Number of days to look back
            
        Returns:
            Dictionary with usage statistics
        """
        # Verify ownership
        api_key = await self.get_api_key_by_id(api_key_id, user_id)
        if not api_key:
            return {}
        
        from datetime import timedelta
        from sqlalchemy import func
        
        since = datetime.utcnow() - timedelta(days=days)
        
        # Get total requests
        total_result = await self.db.execute(
            select(func.count(ApiUsageLog.id)).where(
                and_(
                    ApiUsageLog.api_key_id == api_key_id,
                    ApiUsageLog.created_at >= since,
                )
            )
        )
        total_requests = total_result.scalar() or 0
        
        # Get successful requests
        success_result = await self.db.execute(
            select(func.count(ApiUsageLog.id)).where(
                and_(
                    ApiUsageLog.api_key_id == api_key_id,
                    ApiUsageLog.created_at >= since,
                    ApiUsageLog.status_code < 400,
                )
            )
        )
        successful_requests = success_result.scalar() or 0
        
        # Get total pages processed
        pages_result = await self.db.execute(
            select(func.sum(ApiUsageLog.pages_processed)).where(
                and_(
                    ApiUsageLog.api_key_id == api_key_id,
                    ApiUsageLog.created_at >= since,
                )
            )
        )
        total_pages = pages_result.scalar() or 0
        
        # Get average response time
        avg_time_result = await self.db.execute(
            select(func.avg(ApiUsageLog.response_time_ms)).where(
                and_(
                    ApiUsageLog.api_key_id == api_key_id,
                    ApiUsageLog.created_at >= since,
                    ApiUsageLog.response_time_ms.isnot(None),
                )
            )
        )
        avg_response_time = avg_time_result.scalar() or 0
        
        return {
            "totalRequests": total_requests,
            "successfulRequests": successful_requests,
            "failedRequests": total_requests - successful_requests,
            "totalPagesProcessed": total_pages,
            "averageResponseTimeMs": round(avg_response_time, 2) if avg_response_time else 0,
            "periodDays": days,
        }
