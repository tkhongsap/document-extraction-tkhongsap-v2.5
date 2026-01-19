"""
Document Chunk Model with Vector Embedding for RAG
Stores chunked document content with embeddings for semantic search
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from pgvector.sqlalchemy import Vector

from app.core.database import Base
from .base import generate_uuid


class DocumentChunk(Base):
    """Document chunks table - chunked content with vector embeddings for RAG"""
    __tablename__ = "document_chunks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    extraction_id = Column(String, ForeignKey("extractions.id"), nullable=True)
    
    # Chunk position info
    chunk_index = Column(Integer, nullable=False, default=0)
    page_number = Column(Integer, nullable=True)
    start_offset = Column(Integer, nullable=True)
    end_offset = Column(Integer, nullable=True)
    
    # Chunk type for filtering (e.g., 'personal_info', 'experience', 'skills', 'education')
    chunk_type = Column(String, nullable=True)
    
    # Chunk content
    text = Column(Text, nullable=False)
    
    # Vector embedding for semantic search
    # OpenAI text-embedding-3-small: 1536 dimensions
    embedding = Column(Vector(1536), nullable=True)
    embedding_model = Column(String, default='text-embedding-3-small')
    embedding_text = Column(Text, nullable=True)  # Text used for embedding (may differ from main text)
    
    # Chunk metadata (flexible JSON for additional info)
    # Note: Named 'chunk_metadata' to avoid SQLAlchemy reserved 'metadata'
    chunk_metadata = Column("metadata", JSONB, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="document_chunks")
    document = relationship("Document", backref="chunks")
    extraction = relationship("Extraction", backref="chunks")
    
    def to_dict(self, include_embedding: bool = False) -> dict:
        """Convert chunk to dictionary for API response"""
        result = {
            "id": self.id,
            "userId": self.user_id,
            "documentId": self.document_id,
            "extractionId": self.extraction_id,
            "chunkIndex": self.chunk_index,
            "pageNumber": self.page_number,
            "startOffset": self.start_offset,
            "endOffset": self.end_offset,
            "chunkType": self.chunk_type,
            "text": self.text,
            "embeddingModel": self.embedding_model,
            "metadata": self.chunk_metadata,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
        
        if include_embedding and self.embedding is not None:
            result["embedding"] = list(self.embedding)
            
        return result