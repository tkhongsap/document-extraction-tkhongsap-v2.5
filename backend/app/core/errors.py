"""
Standardized API Error Responses
Provides consistent error format across all API endpoints
"""
from fastapi import HTTPException
from typing import Optional, Dict, Any


class ApiError(HTTPException):
    """Base API Error with standardized response format"""
    
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": error_code,
                    "message": message,
                    **self.details,
                }
            }
        )


# =============================================================================
# 401 Unauthorized Errors
# =============================================================================

class UnauthorizedError(ApiError):
    """401 Unauthorized - Authentication required or invalid credentials"""
    
    def __init__(
        self,
        message: str = "Authentication required",
        error_code: str = "UNAUTHORIZED",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            status_code=401,
            error_code=error_code,
            message=message,
            details=details,
        )


class MissingApiKeyError(UnauthorizedError):
    """API key not provided in request"""
    
    def __init__(self):
        super().__init__(
            error_code="MISSING_API_KEY",
            message="API key is required. Provide via X-API-Key header or Authorization: Bearer <key>",
            details={
                "headers": ["X-API-Key", "Authorization: Bearer <key>"],
            }
        )


class InvalidApiKeyError(UnauthorizedError):
    """API key is invalid or not found"""
    
    def __init__(self):
        super().__init__(
            error_code="INVALID_API_KEY",
            message="Invalid API key. Please check your key and try again.",
        )


class ExpiredApiKeyError(UnauthorizedError):
    """API key has expired"""
    
    def __init__(self, expired_at: str):
        super().__init__(
            error_code="EXPIRED_API_KEY",
            message="API key has expired",
            details={"expired_at": expired_at},
        )


class InactiveApiKeyError(UnauthorizedError):
    """API key is inactive/disabled"""
    
    def __init__(self):
        super().__init__(
            error_code="INACTIVE_API_KEY",
            message="API key is inactive. Please contact support or regenerate your key.",
        )


# =============================================================================
# 403 Forbidden Errors
# =============================================================================

class ForbiddenError(ApiError):
    """403 Forbidden - Access denied"""
    
    def __init__(
        self,
        message: str = "Access denied",
        error_code: str = "FORBIDDEN",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            status_code=403,
            error_code=error_code,
            message=message,
            details=details,
        )


class QuotaExceededError(ForbiddenError):
    """Monthly quota exceeded"""
    
    def __init__(self, usage: int, limit: int, reset_at: Optional[str] = None):
        super().__init__(
            error_code="QUOTA_EXCEEDED",
            message="Monthly API quota exceeded",
            details={
                "usage": usage,
                "limit": limit,
                "available": max(0, limit - usage),
                "reset_at": reset_at,
            }
        )


class InsufficientQuotaError(ForbiddenError):
    """Not enough quota for this request"""
    
    def __init__(self, required: int, available: int):
        super().__init__(
            error_code="INSUFFICIENT_QUOTA",
            message=f"Insufficient quota. This request requires {required} pages but only {available} available.",
            details={
                "required": required,
                "available": available,
            }
        )


class ScopeNotAllowedError(ForbiddenError):
    """API key doesn't have required scope/permission"""
    
    def __init__(self, required_scope: str, available_scopes: list):
        super().__init__(
            error_code="SCOPE_NOT_ALLOWED",
            message=f"API key doesn't have '{required_scope}' permission",
            details={
                "required_scope": required_scope,
                "available_scopes": available_scopes,
            }
        )


# =============================================================================
# 429 Too Many Requests Errors
# =============================================================================

class RateLimitError(ApiError):
    """429 Too Many Requests - Rate limit exceeded"""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        error_code: str = "RATE_LIMIT_EXCEEDED",
        details: Optional[Dict[str, Any]] = None,
        retry_after: int = 60,
    ):
        details = details or {}
        details["retry_after"] = retry_after
        
        super().__init__(
            status_code=429,
            error_code=error_code,
            message=message,
            details=details,
        )


class TooManyRequestsError(RateLimitError):
    """Too many requests per minute"""
    
    def __init__(
        self,
        limit: int,
        window_seconds: int = 60,
        retry_after: int = 60,
    ):
        super().__init__(
            error_code="TOO_MANY_REQUESTS",
            message=f"Rate limit exceeded. Maximum {limit} requests per {window_seconds} seconds.",
            details={
                "limit": limit,
                "window_seconds": window_seconds,
            },
            retry_after=retry_after,
        )


# =============================================================================
# 400 Bad Request Errors
# =============================================================================

class BadRequestError(ApiError):
    """400 Bad Request - Invalid input"""
    
    def __init__(
        self,
        message: str = "Bad request",
        error_code: str = "BAD_REQUEST",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            status_code=400,
            error_code=error_code,
            message=message,
            details=details,
        )


class InvalidFileTypeError(BadRequestError):
    """Unsupported file type"""
    
    def __init__(self, mime_type: str, allowed_types: list):
        super().__init__(
            error_code="INVALID_FILE_TYPE",
            message=f"Unsupported file type: {mime_type}",
            details={
                "provided_type": mime_type,
                "allowed_types": allowed_types,
            }
        )


class FileTooLargeError(BadRequestError):
    """File exceeds size limit"""
    
    def __init__(self, file_size: int, max_size: int):
        super().__init__(
            error_code="FILE_TOO_LARGE",
            message=f"File size ({file_size} bytes) exceeds maximum ({max_size} bytes)",
            details={
                "file_size": file_size,
                "max_size": max_size,
                "max_size_mb": max_size / (1024 * 1024),
            }
        )


# =============================================================================
# 500 Internal Server Errors
# =============================================================================

class InternalError(ApiError):
    """500 Internal Server Error"""
    
    def __init__(
        self,
        message: str = "Internal server error",
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            status_code=500,
            error_code=error_code,
            message=message,
            details=details,
        )


class ExtractionError(InternalError):
    """Document extraction failed"""
    
    def __init__(self, reason: str):
        super().__init__(
            error_code="EXTRACTION_FAILED",
            message="Document extraction failed",
            details={"reason": reason},
        )
