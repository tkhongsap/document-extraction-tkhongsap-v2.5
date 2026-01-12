"""
Rate Limiting Service
Redis-based rate limiting for API endpoints
Falls back to in-memory store if Redis is unavailable
"""
import time
import asyncio
from typing import Optional, Dict, Tuple, Any
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime

# Try to import redis, fallback to in-memory if not available
try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    aioredis = None  # type: ignore


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting"""
    requests_per_minute: int = 60  # Default: 60 requests per minute
    window_seconds: int = 60  # Sliding window size
    burst_limit: int = 10  # Allow burst of requests


@dataclass
class RateLimitResult:
    """Result of rate limit check"""
    allowed: bool
    limit: int
    remaining: int
    reset_at: int  # Unix timestamp
    retry_after: int  # Seconds until reset


class InMemoryRateLimiter:
    """
    In-memory rate limiter using sliding window algorithm.
    Used as fallback when Redis is not available.
    Note: Not suitable for distributed systems.
    """
    
    def __init__(self):
        # Store: {key: [(timestamp, count), ...]}
        self._requests: Dict[str, list] = defaultdict(list)
        self._lock = asyncio.Lock()
    
    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int,
    ) -> RateLimitResult:
        """
        Check if request is within rate limit using sliding window.
        
        Args:
            key: Unique identifier (usually api_key_id)
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds
            
        Returns:
            RateLimitResult with allowed status and metadata
        """
        async with self._lock:
            now = time.time()
            window_start = now - window_seconds
            
            # Remove expired entries
            self._requests[key] = [
                (ts, count) for ts, count in self._requests[key]
                if ts > window_start
            ]
            
            # Count requests in current window
            total_requests = sum(count for _, count in self._requests[key])
            
            # Check if under limit
            if total_requests < limit:
                # Add current request
                self._requests[key].append((now, 1))
                remaining = limit - total_requests - 1
                
                return RateLimitResult(
                    allowed=True,
                    limit=limit,
                    remaining=max(0, remaining),
                    reset_at=int(now + window_seconds),
                    retry_after=0,
                )
            else:
                # Rate limited
                oldest_request = min(ts for ts, _ in self._requests[key]) if self._requests[key] else now
                retry_after = int(oldest_request + window_seconds - now) + 1
                
                return RateLimitResult(
                    allowed=False,
                    limit=limit,
                    remaining=0,
                    reset_at=int(oldest_request + window_seconds),
                    retry_after=max(1, retry_after),
                )
    
    async def reset(self, key: str) -> None:
        """Reset rate limit for a key"""
        async with self._lock:
            self._requests.pop(key, None)
    
    async def close(self) -> None:
        """Cleanup (no-op for in-memory)"""
        pass


class RedisRateLimiter:
    """
    Redis-based rate limiter using sliding window log algorithm.
    Suitable for distributed systems.
    """
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._client: Optional[Any] = None
    
    async def _get_client(self) -> Any:
        """Get or create Redis client"""
        if self._client is None:
            self._client = aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._client
    
    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int,
    ) -> RateLimitResult:
        """
        Check rate limit using Redis sorted set with sliding window.
        
        Uses a sorted set where:
        - Score = timestamp
        - Value = unique request ID (timestamp + random)
        
        Args:
            key: Unique identifier (usually api_key_id)
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds
            
        Returns:
            RateLimitResult with allowed status and metadata
        """
        client = await self._get_client()
        
        now = time.time()
        window_start = now - window_seconds
        redis_key = f"ratelimit:{key}"
        
        # Use pipeline for atomic operations
        pipe = client.pipeline()
        
        # Remove old entries outside the window
        pipe.zremrangebyscore(redis_key, 0, window_start)
        
        # Count current requests in window
        pipe.zcard(redis_key)
        
        # Execute pipeline
        results = await pipe.execute()
        current_count = results[1]
        
        if current_count < limit:
            # Add current request with unique ID
            request_id = f"{now}:{id(now)}"
            await client.zadd(redis_key, {request_id: now})
            await client.expire(redis_key, window_seconds + 1)
            
            remaining = limit - current_count - 1
            
            return RateLimitResult(
                allowed=True,
                limit=limit,
                remaining=max(0, remaining),
                reset_at=int(now + window_seconds),
                retry_after=0,
            )
        else:
            # Rate limited - find when oldest request expires
            oldest = await client.zrange(redis_key, 0, 0, withscores=True)
            if oldest:
                oldest_time = oldest[0][1]
                retry_after = int(oldest_time + window_seconds - now) + 1
            else:
                retry_after = window_seconds
            
            return RateLimitResult(
                allowed=False,
                limit=limit,
                remaining=0,
                reset_at=int(now + retry_after),
                retry_after=max(1, retry_after),
            )
    
    async def reset(self, key: str) -> None:
        """Reset rate limit for a key"""
        client = await self._get_client()
        await client.delete(f"ratelimit:{key}")
    
    async def close(self) -> None:
        """Close Redis connection"""
        if self._client:
            await self._client.close()
            self._client = None


class RateLimitService:
    """
    Rate limiting service that uses Redis if available, 
    otherwise falls back to in-memory storage.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url
        self._limiter = None
        self._initialized = False
    
    async def _get_limiter(self):
        """Get or create rate limiter instance"""
        if self._limiter is None:
            if self.redis_url and REDIS_AVAILABLE:
                try:
                    self._limiter = RedisRateLimiter(self.redis_url)
                    # Test connection
                    client = await self._limiter._get_client()
                    await client.ping()
                    print("[RateLimit] Using Redis-based rate limiter")
                except Exception as e:
                    print(f"[RateLimit] Redis unavailable ({e}), falling back to in-memory")
                    self._limiter = InMemoryRateLimiter()
            else:
                print("[RateLimit] Using in-memory rate limiter (not suitable for distributed systems)")
                self._limiter = InMemoryRateLimiter()
            
            self._initialized = True
        
        return self._limiter
    
    async def check_rate_limit(
        self,
        identifier: str,
        config: Optional[RateLimitConfig] = None,
    ) -> RateLimitResult:
        """
        Check if request is within rate limit.
        
        Args:
            identifier: Unique identifier (api_key_id, user_id, or IP)
            config: Rate limit configuration (uses defaults if not provided)
            
        Returns:
            RateLimitResult with allowed status
        """
        config = config or RateLimitConfig()
        limiter = await self._get_limiter()
        
        return await limiter.check_rate_limit(
            key=identifier,
            limit=config.requests_per_minute,
            window_seconds=config.window_seconds,
        )
    
    async def reset(self, identifier: str) -> None:
        """Reset rate limit for an identifier"""
        limiter = await self._get_limiter()
        await limiter.reset(identifier)
    
    async def close(self) -> None:
        """Close connections"""
        if self._limiter:
            await self._limiter.close()


# Global rate limiter instance
_rate_limiter: Optional[RateLimitService] = None


def get_rate_limiter(redis_url: Optional[str] = None) -> RateLimitService:
    """Get or create global rate limiter instance"""
    global _rate_limiter
    
    if _rate_limiter is None:
        _rate_limiter = RateLimitService(redis_url)
    
    return _rate_limiter


# Default rate limit configurations by tier
RATE_LIMIT_CONFIGS = {
    "free": RateLimitConfig(requests_per_minute=10, window_seconds=60),
    "pro": RateLimitConfig(requests_per_minute=60, window_seconds=60),
    "enterprise": RateLimitConfig(requests_per_minute=300, window_seconds=60),
    "api_key_default": RateLimitConfig(requests_per_minute=30, window_seconds=60),
}
