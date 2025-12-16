"""
Extraction Model
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from .base import generate_uuid


class Extraction(Base):
    """Extractions table - stores extraction history"""
    __tablename__ = "extractions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    file_name = Column(Text, nullable=False)
    file_size = Column(Integer, nullable=False)
    document_type = Column(Text, nullable=False)
    pages_processed = Column(Integer, nullable=False)
    extracted_data = Column(JSON, nullable=False)
    status = Column(Text, nullable=False, default="completed")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="extractions")
    document = relationship("Document", back_populates="extractions")
