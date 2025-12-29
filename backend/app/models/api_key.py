"""
API Key Model
Stores API keys for programmatic access to the extraction API
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from .base import generate_uuid


class ApiKey(Base):
    """API Keys table - stores hashed API keys for programmatic access"""
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Key identification
    name = Column(String(255), nullable=False)  # User-friendly name for the key
    prefix = Column(String(8), nullable=False)  # First 8 chars of key for identification (e.g., "dae_abc1")
    hashed_key = Column(String(255), nullable=False, unique=True)  # SHA-256 hash of the full key
    
    # Usage limits
    monthly_limit = Column(Integer, nullable=False, default=1000)  # Pages per month
    monthly_usage = Column(Integer, nullable=False, default=0)  # Current month usage
    
    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Expiration (optional)
    expires_at = Column(DateTime, nullable=True)
    
    # Scopes/permissions (stored as comma-separated string)
    scopes = Column(Text, nullable=False, default="extract,read")  # Default: extract + read
    
    # Timestamps
    last_used_at = Column(DateTime, nullable=True)
    last_reset_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    usage_logs = relationship("ApiUsageLog", back_populates="api_key", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index("idx_api_keys_hashed_key", "hashed_key"),
        Index("idx_api_keys_user_id", "user_id"),
        Index("idx_api_keys_prefix", "prefix"),
        Index("idx_api_keys_is_active", "is_active"),
    )
    
    def to_dict(self, include_prefix: bool = True):
        """Convert to dictionary for API response (never expose hashed_key)"""
        result = {
            "id": self.id,
            "userId": self.user_id,
            "name": self.name,
            "monthlyLimit": self.monthly_limit,
            "monthlyUsage": self.monthly_usage,
            "isActive": self.is_active,
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
            "scopes": self.scopes.split(",") if self.scopes else [],
            "lastUsedAt": self.last_used_at.isoformat() if self.last_used_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_prefix:
            result["prefix"] = self.prefix
        return result
    
    def is_expired(self) -> bool:
        """Check if the API key has expired"""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if the API key is valid (active and not expired)"""
        return self.is_active and not self.is_expired()
    
    def has_scope(self, scope: str) -> bool:
        """Check if the API key has a specific scope"""
        if not self.scopes:
            return False
        return scope in self.scopes.split(",")
    
    def has_usage_remaining(self) -> bool:
        """Check if there's usage quota remaining"""
        return self.monthly_usage < self.monthly_limit
