"""
Document Model
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from .base import generate_uuid


class Document(Base):
    """Documents table - stores uploaded documents metadata"""
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    file_name = Column(Text, nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(Text, nullable=False)
    object_path = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="documents")
    extractions = relationship("Extraction", back_populates="document")
