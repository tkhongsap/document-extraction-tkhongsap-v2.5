"""
Extraction Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ExtractionBase(BaseModel):
    file_name: str = Field(alias="fileName")
    file_size: int = Field(alias="fileSize")
    document_type: str = Field(alias="documentType")
    pages_processed: int = Field(alias="pagesProcessed")
    extracted_data: Dict[str, Any] = Field(alias="extractedData")
    
    class Config:
        populate_by_name = True


class ExtractionCreate(ExtractionBase):
    user_id: Optional[str] = Field(default=None, alias="userId")
    document_id: Optional[str] = Field(default=None, alias="documentId")
    status: str = "completed"


class ExtractionResponse(ExtractionBase):
    id: str
    user_id: str
    document_id: Optional[str] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class ExtractedField(BaseModel):
    key: str
    value: str
    confidence: float


class TemplateExtractionResponse(BaseModel):
    success: bool
    header_fields: List[ExtractedField] = Field(alias="headerFields")
    line_items: Optional[List[Dict[str, Any]]] = Field(default=None, alias="lineItems")
    extracted_data: Dict[str, Any] = Field(alias="extractedData")
    confidence_scores: Optional[Dict[str, float]] = Field(default=None, alias="confidenceScores")
    pages_processed: int = Field(alias="pagesProcessed")
    file_name: str = Field(alias="fileName")
    file_size: int = Field(alias="fileSize")
    mime_type: str = Field(alias="mimeType")
    document_id: Optional[str] = Field(default=None, alias="documentId")
    
    class Config:
        populate_by_name = True


class ParsedPageResponse(BaseModel):
    page_number: int = Field(alias="pageNumber")
    markdown: str
    text: str
    confidence: Optional[float] = None
    
    class Config:
        populate_by_name = True


class GeneralExtractionResponse(BaseModel):
    success: bool
    markdown: str
    text: str
    page_count: int = Field(alias="pageCount")
    pages: List[ParsedPageResponse]
    file_name: str = Field(alias="fileName")
    file_size: int = Field(alias="fileSize")
    mime_type: str = Field(alias="mimeType")
    overall_confidence: Optional[float] = Field(default=None, alias="overallConfidence")
    confidence_stats: Optional[Dict[str, float]] = Field(default=None, alias="confidenceStats")
    document_id: Optional[str] = Field(default=None, alias="documentId")
    
    class Config:
        populate_by_name = True
