"""
Pydantic Schemas for API validation
"""
from .user import UserBase, UserCreate, UserResponse, UserUpdate
from .document import (
    DocumentBase, DocumentCreate, DocumentSaveRequest, 
    DocumentResponse, DocumentWithExtractions
)
from .extraction import (
    ExtractionBase, ExtractionCreate, ExtractionResponse,
    ExtractedField, TemplateExtractionResponse,
    ParsedPageResponse, GeneralExtractionResponse
)
from .common import UploadURLResponse, ErrorResponse
from .rag import (
    RAGQueryRequest, RAGQueryResponse, 
    RAGStreamChunk, RAGHealthResponse, ResumeSource
)

__all__ = [
    # User
    "UserBase",
    "UserCreate", 
    "UserResponse",
    "UserUpdate",
    # Document
    "DocumentBase",
    "DocumentCreate",
    "DocumentSaveRequest",
    "DocumentResponse",
    "DocumentWithExtractions",
    # Extraction
    "ExtractionBase",
    "ExtractionCreate",
    "ExtractionResponse",
    "ExtractedField",
    "TemplateExtractionResponse",
    "ParsedPageResponse",
    "GeneralExtractionResponse",
    # Common
    "UploadURLResponse",
    "ErrorResponse",
    # RAG
    "RAGQueryRequest",
    "RAGQueryResponse",
    "RAGStreamChunk",
    "RAGHealthResponse",
    "ResumeSource",
]
