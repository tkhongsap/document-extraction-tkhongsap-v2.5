"""
Document Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from .extraction import ExtractionResponse


class DocumentBase(BaseModel):
    file_name: str
    file_size: int
    mime_type: str


class DocumentCreate(DocumentBase):
    user_id: str
    object_path: str


class DocumentSaveRequest(BaseModel):
    upload_url: str = Field(alias="uploadURL")
    file_name: str = Field(alias="fileName")
    file_size: int = Field(alias="fileSize")
    mime_type: str = Field(alias="mimeType")
    
    class Config:
        populate_by_name = True


class DocumentResponse(DocumentBase):
    id: str
    user_id: str
    object_path: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class DocumentWithExtractions(BaseModel):
    file_name: str = Field(alias="fileName")
    file_size: int = Field(alias="fileSize")
    document_type: str = Field(alias="documentType")
    extractions: List["ExtractionResponse"]
    latest_extraction: "ExtractionResponse" = Field(alias="latestExtraction")
    total_extractions: int = Field(alias="totalExtractions")
    
    class Config:
        populate_by_name = True


# Update forward references
from .extraction import ExtractionResponse
DocumentWithExtractions.model_rebuild()
