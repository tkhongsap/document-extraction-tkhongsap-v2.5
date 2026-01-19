"""
Usage Logging Middleware
Automatically logs all API requests to api_usage_logs table
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Callable, Optional
import time
import traceback

from app.core.database import async_session_maker
from app.services.usage_logging_service import UsageLoggingService


class UsageLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically log API usage for public endpoints
    
    This middleware:
    1. Tracks request/response times
    2. Logs to api_usage_logs table
    3. Captures errors and metadata
    4. Only logs requests with valid API keys
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only log public API endpoints
        if not request.url.path.startswith("/api/v1/public/"):
            return await call_next(request)
        
        # Skip health check endpoint
        if request.url.path.endswith("/health"):
            return await call_next(request)
        
        # Start timer
        start_time = time.time()
        
        # Initialize variables
        status_code = 500
        error_message = None
        api_key_id = None
        pages_processed = None
        
        try:
            # Get API key from request state (set by verify_api_key dependency)
            # This will be available after API Key schema is implemented
            api_key = getattr(request.state, "api_key", None)
            if api_key:
                api_key_id = api_key.id
            
            # Process request
            response = await call_next(request)
            status_code = response.status_code
            
            # Try to extract pages_processed from response
            # This would require response body parsing, which is complex
            # For now, we'll rely on manual logging in endpoints
            
        except Exception as e:
            error_message = str(e)
            status_code = 500
            # Re-raise to let FastAPI handle it
            raise
        finally:
            # Calculate response time
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Log to database (only if we have an API key)
            if api_key_id:
                try:
                    async with async_session_maker() as db:
                        logging_service = UsageLoggingService(db)
                        
                        # Get client info
                        ip_address = request.client.host if request.client else None
                        user_agent = request.headers.get("user-agent")
                        
                        # Build request metadata
                        request_metadata = {
                            "path": request.url.path,
                            "query_params": dict(request.query_params),
                            "content_type": request.headers.get("content-type"),
                        }
                        
                        # Log the request
                        await logging_service.log_request(
                            api_key_id=api_key_id,
                            endpoint=request.url.path,
                            method=request.method,
                            status_code=status_code,
                            response_time_ms=response_time_ms,
                            pages_processed=pages_processed,
                            request_metadata=request_metadata,
                            error_message=error_message,
                            ip_address=ip_address,
                            user_agent=user_agent,
                        )
                except Exception as log_error:
                    # Don't let logging errors break the request
                    print(f"[Usage Logging] Failed to log request: {log_error}")
                    traceback.print_exc()
        
        return response


async def log_extraction_usage(
    db: AsyncSession,
    api_key_id: str,
    endpoint: str,
    method: str,
    status_code: int,
    pages_processed: int,
    response_time_ms: int,
    request: Request,
    error_message: Optional[str] = None,
    document_type: Optional[str] = None,
    file_size: Optional[int] = None,
):
    """
    Helper function to manually log extraction requests with detailed metadata
    
    This should be called from within extraction endpoints to log accurate page counts
    
    Args:
        db: Database session
        api_key_id: API key ID
        endpoint: Endpoint path
        method: HTTP method
        status_code: Response status code
        pages_processed: Actual pages processed
        response_time_ms: Response time in milliseconds
        request: FastAPI Request object
        error_message: Error message if any
        document_type: Type of document (resume, invoice, etc.)
        file_size: File size in bytes
    """
    try:
        logging_service = UsageLoggingService(db)
        
        # Get client info
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Build detailed metadata
        request_metadata = {
            "document_type": document_type,
            "file_size": file_size,
            "endpoint": endpoint,
        }
        
        # Log the request
        await logging_service.log_request(
            api_key_id=api_key_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            pages_processed=pages_processed,
            request_metadata=request_metadata,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        print(f"[Usage Logging] Failed to log extraction: {e}")
        traceback.print_exc()
