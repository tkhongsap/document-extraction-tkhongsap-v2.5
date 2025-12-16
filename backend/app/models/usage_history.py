"""
Usage History Model
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from .base import generate_uuid


class UsageHistory(Base):
    """Usage history table - stores monthly usage snapshots"""
    __tablename__ = "usage_history"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    month = Column(String(7), nullable=False)  # Format: "2025-01"
    pages_used = Column(Integer, nullable=False)
    tier = Column(Text, nullable=False)
    monthly_limit = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="usage_history")
