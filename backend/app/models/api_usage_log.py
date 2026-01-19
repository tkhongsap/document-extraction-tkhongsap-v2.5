"""
API Usage Log Model
Tracks API key usage history for analytics and debugging
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Index, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from .base import generate_uuid


class ApiUsageLog(Base):
    """API Usage Logs table - tracks every API request for analytics"""
    __tablename__ = "api_usage_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    api_key_id = Column(String, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    
    # Request details
    endpoint = Column(String(255), nullable=False)  # e.g., "/api/v1/extract", "/api/v1/batch"
    method = Column(String(10), nullable=False, default="POST")  # HTTP method
    
    # Response details
    status_code = Column(Integer, nullable=False)  # HTTP status code
    response_time_ms = Column(Integer, nullable=True)  # Response time in milliseconds
    
    # Usage tracking
    pages_processed = Column(Integer, nullable=True, default=0)  # Pages consumed by this request
    
    # Request metadata (optional, for debugging)
    request_metadata = Column(JSONB, nullable=True)  # Store document type, file size, etc.
    
    # Error tracking
    error_message = Column(Text, nullable=True)  # Error message if status_code >= 400
    
    # Client info
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    api_key = relationship("ApiKey", back_populates="usage_logs")
    
    # Indexes for performance and analytics
    __table_args__ = (
        Index("idx_api_usage_api_key_id", "api_key_id"),
        Index("idx_api_usage_created_at", "created_at"),
        Index("idx_api_usage_endpoint", "endpoint"),
        Index("idx_api_usage_status_code", "status_code"),
        # Composite index for common queries
        Index("idx_api_usage_key_date", "api_key_id", "created_at"),
    )
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "apiKeyId": self.api_key_id,
            "endpoint": self.endpoint,
            "method": self.method,
            "statusCode": self.status_code,
            "responseTimeMs": self.response_time_ms,
            "pagesProcessed": self.pages_processed,
            "requestMetadata": self.request_metadata,
            "errorMessage": self.error_message,
            "ipAddress": self.ip_address,
            "userAgent": self.user_agent,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
    
    @classmethod
    def create_log(
        cls,
        api_key_id: str,
        endpoint: str,
        status_code: int,
        method: str = "POST",
        response_time_ms: int = None,
        pages_processed: int = 0,
        request_metadata: dict = None,
        error_message: str = None,
        ip_address: str = None,
        user_agent: str = None,
    ) -> "ApiUsageLog":
        """Factory method to create a new usage log entry"""
        return cls(
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
