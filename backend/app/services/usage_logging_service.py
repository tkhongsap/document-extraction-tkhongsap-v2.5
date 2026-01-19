"""
Usage Logging Service
Logs API usage to api_usage_logs table for analytics and monitoring
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Optional, Dict, Any
import json

from app.models.api_usage_log import ApiUsageLog


class UsageLoggingService:
    """Service for logging API usage"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def log_request(
        self,
        api_key_id: str,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: Optional[int] = None,
        pages_processed: Optional[int] = None,
        request_metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> ApiUsageLog:
        """
        Log an API request to the database
        
        Args:
            api_key_id: ID of the API key used
            endpoint: Endpoint path (e.g., "/api/v1/public/extract/process")
            method: HTTP method (GET, POST, etc.)
            status_code: HTTP status code
            response_time_ms: Response time in milliseconds
            pages_processed: Number of pages consumed
            request_metadata: Additional metadata (document type, file size, etc.)
            error_message: Error message if request failed
            ip_address: Client IP address
            user_agent: Client user agent string
            
        Returns:
            ApiUsageLog: Created log entry
        """
        log_entry = ApiUsageLog(
            api_key_id=api_key_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            pages_processed=pages_processed or 0,
            request_metadata=request_metadata,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.utcnow(),
        )
        
        self.db.add(log_entry)
        await self.db.commit()
        await self.db.refresh(log_entry)
        
        return log_entry
    
    async def get_api_key_usage_stats(
        self,
        api_key_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Get usage statistics for a specific API key
        
        Args:
            api_key_id: API key ID
            start_date: Start date for filtering (optional)
            end_date: End date for filtering (optional)
            
        Returns:
            Dictionary with usage statistics
        """
        query = select(
            func.count(ApiUsageLog.id).label("total_requests"),
            func.sum(ApiUsageLog.pages_processed).label("total_pages"),
            func.avg(ApiUsageLog.response_time_ms).label("avg_response_time"),
            func.count(
                func.case((ApiUsageLog.status_code >= 400, 1))
            ).label("error_count"),
        ).where(ApiUsageLog.api_key_id == api_key_id)
        
        if start_date:
            query = query.where(ApiUsageLog.created_at >= start_date)
        if end_date:
            query = query.where(ApiUsageLog.created_at <= end_date)
        
        result = await self.db.execute(query)
        row = result.first()
        
        return {
            "api_key_id": api_key_id,
            "total_requests": row.total_requests or 0,
            "total_pages": int(row.total_pages or 0),
            "avg_response_time_ms": float(row.avg_response_time or 0),
            "error_count": row.error_count or 0,
            "success_rate": (
                ((row.total_requests - row.error_count) / row.total_requests * 100)
                if row.total_requests and row.total_requests > 0
                else 0
            ),
        }
    
    async def get_endpoint_usage_stats(
        self,
        api_key_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> list:
        """
        Get usage statistics grouped by endpoint
        
        Args:
            api_key_id: API key ID
            start_date: Start date for filtering (optional)
            end_date: End date for filtering (optional)
            
        Returns:
            List of endpoint statistics
        """
        query = select(
            ApiUsageLog.endpoint,
            func.count(ApiUsageLog.id).label("request_count"),
            func.sum(ApiUsageLog.pages_processed).label("total_pages"),
            func.avg(ApiUsageLog.response_time_ms).label("avg_response_time"),
        ).where(
            ApiUsageLog.api_key_id == api_key_id
        ).group_by(
            ApiUsageLog.endpoint
        )
        
        if start_date:
            query = query.where(ApiUsageLog.created_at >= start_date)
        if end_date:
            query = query.where(ApiUsageLog.created_at <= end_date)
        
        result = await self.db.execute(query)
        rows = result.all()
        
        return [
            {
                "endpoint": row.endpoint,
                "request_count": row.request_count,
                "total_pages": int(row.total_pages or 0),
                "avg_response_time_ms": float(row.avg_response_time or 0),
            }
            for row in rows
        ]
    
    async def get_recent_logs(
        self,
        api_key_id: str,
        limit: int = 100,
    ) -> list:
        """
        Get recent API usage logs
        
        Args:
            api_key_id: API key ID
            limit: Maximum number of logs to return
            
        Returns:
            List of recent log entries
        """
        query = select(ApiUsageLog).where(
            ApiUsageLog.api_key_id == api_key_id
        ).order_by(
            ApiUsageLog.created_at.desc()
        ).limit(limit)
        
        result = await self.db.execute(query)
        logs = result.scalars().all()
        
        return [
            {
                "id": log.id,
                "endpoint": log.endpoint,
                "method": log.method,
                "status_code": log.status_code,
                "response_time_ms": log.response_time_ms,
                "pages_processed": log.pages_processed,
                "error_message": log.error_message,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
