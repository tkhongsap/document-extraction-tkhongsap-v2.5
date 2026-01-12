"""
API Key Service
Handles API key generation, hashing, validation, and CRUD operations

Security Architecture (2-Tier Hashing):
- Round 1: Plain Key → HMAC-SHA256 (SECRET_1) → Private Key 1 (stored encrypted)
- Round 1: Plain Key → SHA256 → Public Key 1 (stored plain)
- Round 2: Public Key 1 → HMAC-SHA256 (SECRET_2) → Private Key 2 (for verification)
- Round 2: Public Key 1 → SHA256 → Public Key 2 (for user display)
"""
import secrets
import hashlib
import hmac
from typing import Optional, List, Tuple, Dict
from datetime import datetime
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key import ApiKey
from app.models.api_usage_log import ApiUsageLog
from app.core.config import get_settings


# API Key format constants
API_KEY_PREFIX = "dk_"  # Document AI Key
API_KEY_LENGTH = 32  # 32 random characters after prefix


class ApiKeyService:
    """Service for managing API keys with 2-tier security"""
    
    # Security secrets (ควรเก็บใน environment variables)
    # ใช้ secret คนละตัวสำหรับแต่ละรอบ
    _SECRET_TIER_1 = None  # For Round 1 (most secure)
    _SECRET_TIER_2 = None  # For Round 2 (verification)
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
        # Load secrets from settings
        if ApiKeyService._SECRET_TIER_1 is None:
            settings = get_settings()
            # ใช้ secrets ต่างกันสำหรับแต่ละ tier
            ApiKeyService._SECRET_TIER_1 = getattr(settings, 'API_KEY_SECRET_TIER_1', settings.session_secret + '_tier1')
            ApiKeyService._SECRET_TIER_2 = getattr(settings, 'API_KEY_SECRET_TIER_2', settings.session_secret + '_tier2')
    
    # =========================================================================
    # Key Generation & Hashing (2-Tier Architecture)
    # =========================================================================
    
    def generate_api_key(self) -> Tuple[str, Dict[str, str], str]:
        """
        Generate a new API key with 2-tier security hashing.
        
        Returns:
            Tuple of (plain_key, key_hashes, prefix)
            - plain_key: The full key to show to user ONCE (dk_xxxx...)
            - key_hashes: Dict containing all derived keys
            - prefix: First 8 chars for identification (dk_xxxx)
        """
        # Generate 32 random characters (URL-safe base64)
        random_part = secrets.token_urlsafe(24)[:API_KEY_LENGTH]
        
        # Full plain key
        plain_key = f"{API_KEY_PREFIX}{random_part}"
        
        # Prefix for identification (first 8 chars including dk_)
        prefix = plain_key[:8]
        
        # 2-Tier hashing with different secrets
        key_hashes = self.derive_two_tier_keys(plain_key)
        
        return plain_key, key_hashes, prefix
    
    def derive_two_tier_keys(self, plain_key: str) -> Dict[str, str]:
        """
        Derive keys using 2-tier hashing with different secrets.
        
        Round 1: Plain Key → Hash with SECRET_1 → Private Key 1 (most secure)
                            → Hash plain      → Public Key 1
        
        Round 2: Public Key 1 → Hash with SECRET_2 → Private Key 2 (verification)
                              → Hash plain        → Public Key 2 (display)
        
        Args:
            plain_key: The plain text API key
            
        Returns:
            Dict containing:
            - private_key_1: HMAC-SHA256 with SECRET_1 (เก็บลับที่สุด)
            - public_key_1: SHA256 of plain key (ใช้เป็น input รอบ 2)
            - private_key_2: HMAC-SHA256 with SECRET_2 (ใช้ verify)
            - public_key_2: SHA256 of public_key_1 (แสดงให้ user)
        """
        # ===== ROUND 1: Derive from Plain Key =====
        # Private Key 1: HMAC-SHA256 with SECRET_TIER_1 (เก็บลับที่สุด)
        private_key_1 = hmac.new(
            self._SECRET_TIER_1.encode('utf-8'),
            plain_key.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Public Key 1: Simple SHA256 of plain key
        public_key_1 = hashlib.sha256(plain_key.encode('utf-8')).hexdigest()
        
        # ===== ROUND 2: Derive from Public Key 1 =====
        # Private Key 2: HMAC-SHA256 with SECRET_TIER_2 (ใช้สำหรับ verification)
        private_key_2 = hmac.new(
            self._SECRET_TIER_2.encode('utf-8'),
            public_key_1.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Public Key 2: Simple SHA256 of public_key_1
        public_key_2 = hashlib.sha256(public_key_1.encode('utf-8')).hexdigest()
        
        return {
            'private_key_1': private_key_1,  # เก็บลับที่สุด (encrypted in DB)
            'public_key_1': public_key_1,    # เก็บแบบปกติ
            'private_key_2': private_key_2,  # ใช้สำหรับ verification
            'public_key_2': public_key_2,    # แสดงให้ user เห็นได้
        }
    
    def verify_key(self, plain_key: str, stored_private_key_2: str) -> bool:
        """
        Verify a plain key against stored private_key_2.
        
        Args:
            plain_key: The plain text API key from user
            stored_private_key_2: The private_key_2 stored in database
            
        Returns:
            True if the key matches
        """
        # Derive keys from plain key
        derived_keys = self.derive_two_tier_keys(plain_key)
        
        # Compare private_key_2
        return derived_keys['private_key_2'] == stored_private_key_2
    
    @staticmethod
    def hash_key(plain_key: str) -> str:
        """
        Legacy method - kept for backward compatibility.
        Use derive_two_tier_keys() for new keys.
        """
        return hashlib.sha256(plain_key.encode('utf-8')).hexdigest()
    
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
        Create a new API key with 2-tier security.
        
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
        # Generate key with 2-tier hashing
        plain_key, key_hashes, prefix = self.generate_api_key()
        
        # Convert timezone-aware datetime to naive UTC if needed
        if expires_at is not None and expires_at.tzinfo is not None:
            expires_at = expires_at.replace(tzinfo=None)
        
        # Create database record with 2-tier keys
        api_key = ApiKey(
            user_id=user_id,
            name=name,
            prefix=prefix,
            # 2-Tier security keys
            private_key_1=key_hashes['private_key_1'],  # เก็บลับที่สุด
            public_key_1=key_hashes['public_key_1'],
            private_key_2=key_hashes['private_key_2'],  # ใช้สำหรับ verification
            public_key_2=key_hashes['public_key_2'],    # แสดงให้ user
            # Legacy field (set to None for new keys)
            hashed_key=None,
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
    
    async def get_api_key_by_private_key_2(self, private_key_2: str) -> Optional[ApiKey]:
        """
        Get an API key by its private_key_2 (2-tier authentication).
        
        Args:
            private_key_2: The private_key_2 derived from plain key
            
        Returns:
            ApiKey if found, None otherwise
        """
        result = await self.db.execute(
            select(ApiKey).where(ApiKey.private_key_2 == private_key_2)
        )
        return result.scalar_one_or_none()
    
    async def get_api_key_by_hash(self, hashed_key: str) -> Optional[ApiKey]:
        """
        Get an API key by its legacy hash (for backward compatibility).
        
        Args:
            hashed_key: The SHA256 hash of the plain key (legacy)
            
        Returns:
            ApiKey if found, None otherwise
        """
        result = await self.db.execute(
            select(ApiKey).where(ApiKey.hashed_key == hashed_key)
        )
        return result.scalar_one_or_none()
    
    async def validate_api_key(self, plain_key: str) -> Optional[ApiKey]:
        """
        Validate an API key using 2-tier security (with legacy support).
        Also updates last_used_at timestamp.
        
        Args:
            plain_key: The plain text API key from user
            
        Returns:
            ApiKey if valid and active, None otherwise
        """
        # Try 2-tier verification first (new keys)
        derived_keys = self.derive_two_tier_keys(plain_key)
        api_key = await self.get_api_key_by_private_key_2(derived_keys['private_key_2'])
        
        # Fallback to legacy hash verification (old keys)
        if not api_key:
            hashed_key = self.hash_key(plain_key)
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
