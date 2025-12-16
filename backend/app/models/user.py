"""
User Model
"""
from sqlalchemy import Column, String, Integer, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from .base import generate_uuid


class User(Base):
    """User storage table"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    tier = Column(Text, nullable=False, default="free")
    monthly_usage = Column(Integer, nullable=False, default=0)
    monthly_limit = Column(Integer, nullable=False, default=100)
    language = Column(String(2), nullable=False, default="en")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_reset_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    documents = relationship("Document", back_populates="user")
    extractions = relationship("Extraction", back_populates="user")
    usage_history = relationship("UsageHistory", back_populates="user")
