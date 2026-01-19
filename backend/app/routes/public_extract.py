"""
Public Extract API Routes
Public endpoints for document extraction using API Key authentication
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import httpx
import io

from pypdf import PdfReader

from app.core.database import get_db
from app.middlewares.api_auth import verify_api_key, check_api_key_quota
from app.models.api_key import ApiKey
from app.services.api_key_service import ApiKeyService
from app.services.storage import StorageService
from app.services.object_storage import ObjectStorageService, ObjectAclPolicy
from app.services.llama_parse import create_llama_parse_service, LlamaParseError
from app.services.llama_extract import create_llama_extract_service, LlamaExtractError
from app.schemas.document import DocumentCreate
from app.schemas.extraction import ExtractionCreate
from app.utils.extraction_schemas import DocumentType
from app.utils.file_validator import validate_uploaded_file
from app.core.security_errors import FileSecurityError

router = APIRouter(prefix="/api/v1/public/extract", tags=["public-extract"])

# Allowed MIME types
ALLOWED_MIMES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "text/plain",
    "text/html",
]

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def get_pdf_page_count(buffer: bytes) -> int:
    """Get page count from PDF buffer. Returns 1 for non-PDF files."""
    try:
        reader = PdfReader(io.BytesIO(buffer))
        return len(reader.pages)
    except Exception:
        return 1


async def upload_document_and_create_record(
    buffer: bytes,
    file_name: str,
    file_size: int,
    mime_type: str,
    user_id: str,
    db: AsyncSession,
) -> Optional[str]:
    """Helper to upload file and create document record"""
    try:
        object_storage = ObjectStorageService()

        # Get upload URL
        upload_url = await object_storage.get_object_entity_upload_url()

        # Upload file
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.put(
                upload_url,
                content=buffer,
                headers={
                    "Content-Type": mime_type,
                    "Content-Length": str(file_size),
                },
            )

        if response.status_code not in (200, 201):
            raise Exception(f"Failed to upload file to storage: {response.text}")

        # Set ACL and get normalized path
        object_path = await object_storage.try_set_object_entity_acl_policy(
            upload_url,
            ObjectAclPolicy(owner=user_id, visibility="private"),
        )

        # Create document record
        storage = StorageService(db)
        document = await storage.create_document(DocumentCreate(
            user_id=user_id,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
            object_path=object_path,
        ))

        return document.id
    except Exception as e:
        print(f"[Public API] Failed to store document: {e}")
        return None


@router.post("/process")
async def public_template_extraction(
    file: UploadFile = File(...),
    documentType: str = Form(...),
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Public API: Template-based extraction using LlamaExtract
    
    **Authentication**: Requires valid API key in X-API-Key header
    
    **Document Types**: bank, invoice, po, contract, resume
    
    **Usage**: Consumes 1 page from your API key quota per document
    
    **Rate Limits**: Based on your API key tier
    """
    # Validate file
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Validate document type
    valid_types: List[DocumentType] = ["bank", "invoice", "po", "contract", "resume"]
    if documentType not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Validate MIME type
    if file.content_type not in ALLOWED_MIMES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
    
    # Read file content
    buffer = await file.read()
    file_size = len(buffer)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    # Security validation
    try:
        validation_result = await validate_uploaded_file(
            file=file,
            buffer=buffer,
            max_size=MAX_FILE_SIZE,
            allowed_mimes=ALLOWED_MIMES,
            strict_mode=False,
        )
        
        if not validation_result.is_valid:
            error_details = {
                "message": "File validation failed",
                "errors": validation_result.errors,
                "warnings": validation_result.warnings,
            }
            raise HTTPException(status_code=400, detail=error_details)
        
        # Log warnings if any
        if validation_result.warnings:
            print(f"[Security] File validation warnings for {file.filename}: {validation_result.warnings}")
            
    except FileSecurityError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Security validation failed",
                "error": str(e),
                "details": e.details,
            }
        )
    
    # Get page count for quota check
    page_count = get_pdf_page_count(buffer) if file.content_type == "application/pdf" else 1
    
    # Check API key quota
    await check_api_key_quota(api_key, page_count)
    
    try:
        # Upload document
        document_id = await upload_document_and_create_record(
            buffer, 
            file.filename or "document", 
            file_size, 
            file.content_type or "application/octet-stream",
            api_key.user_id,  # Use user_id from API key
            db
        )

        # Extract using LlamaExtract
        llama_extract = create_llama_extract_service()
        result = await llama_extract.extract_document(
            buffer,
            file.filename or "document",
            documentType  # type: ignore
        )
        
        # Update API key usage
        api_key_service = ApiKeyService(db)
        await api_key_service.increment_usage(api_key, result.pages_processed)
        
        # Log the API usage
        await api_key_service.log_api_usage(
            api_key_id=api_key.id,
            endpoint="/api/v1/public/extract/process",
            status_code=200,
            method="POST",
            pages_processed=result.pages_processed,
            request_metadata={"documentType": documentType, "fileName": file.filename},
        )
        
        # Save extraction to database
        storage = StorageService(db)
        extraction = await storage.create_extraction(ExtractionCreate(
            user_id=api_key.user_id,
            document_id=document_id,
            file_name=file.filename or "document",
            file_size=file_size,
            document_type=documentType,
            pages_processed=result.pages_processed,
            extracted_data=result.extracted_data,
            status="completed",
        ))
        
        # Return result
        return {
            "success": result.success,
            "headerFields": [
                {"key": f.key, "value": f.value, "confidence": f.confidence}
                for f in result.header_fields
            ],
            "lineItems": result.line_items,
            "extractedData": result.extracted_data,
            "confidenceScores": result.confidence_scores,
            "pagesProcessed": result.pages_processed,
            "fileName": file.filename,
            "fileSize": file_size,
            "mimeType": file.content_type,
            "documentId": document_id,
            "extractionId": extraction.id,
            "apiKeyUsage": {
                "used": api_key.monthly_usage + result.pages_processed,
                "limit": api_key.monthly_limit,
                "remaining": api_key.monthly_limit - (api_key.monthly_usage + result.pages_processed)
            }
        }
    except LlamaExtractError as e:
        raise HTTPException(
            status_code=e.status_code or 500,
            detail={"message": str(e), "type": "LlamaExtractError"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/general")
async def public_general_extraction(
    file: UploadFile = File(...),
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Public API: General extraction using LlamaParse
    
    **Authentication**: Requires valid API key in X-API-Key header
    
    **Usage**: Consumes pages from your API key quota based on document page count
    
    **Rate Limits**: Based on your API key tier
    
    **Returns**: Markdown and text content with confidence scores
    """
    # Validate file
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Validate MIME type
    if file.content_type not in ALLOWED_MIMES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
    
    # Read file content
    buffer = await file.read()
    file_size = len(buffer)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
        # Security validation
    try:
        validation_result = await validate_uploaded_file(
            file=file,
            buffer=buffer,
            max_size=MAX_FILE_SIZE,
            allowed_mimes=ALLOWED_MIMES,
            strict_mode=False,
        )
        
        if not validation_result.is_valid:
            error_details = {
                "message": "File validation failed",
                "errors": validation_result.errors,
                "warnings": validation_result.warnings,
            }
            raise HTTPException(status_code=400, detail=error_details)
        
        # Log warnings if any
        if validation_result.warnings:
            print(f"[Security] File validation warnings for {file.filename}: {validation_result.warnings}")
            
    except FileSecurityError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Security validation failed",
                "error": str(e),
                "details": e.details,
            }
        )
        # Security validation
    try:
        validation_result = await validate_uploaded_file(
            file=file,
            buffer=buffer,
            max_size=MAX_FILE_SIZE,
            allowed_mimes=ALLOWED_MIMES,
            strict_mode=False,
        )
        
        if not validation_result.is_valid:
            error_details = {
                "message": "File validation failed",
                "errors": validation_result.errors,
                "warnings": validation_result.warnings,
            }
            raise HTTPException(status_code=400, detail=error_details)
        
        # Log warnings if any
        if validation_result.warnings:
            print(f"[Security] File validation warnings for {file.filename}: {validation_result.warnings}")
            
    except FileSecurityError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Security validation failed",
                "error": str(e),
                "details": e.details,
            }
        )
    
    # Get page count before calling LlamaParse API
    page_count = get_pdf_page_count(buffer) if file.content_type == "application/pdf" else 1
    
    # Check API key quota
    await check_api_key_quota(api_key, page_count)
    
    try:
        # Upload document
        document_id = await upload_document_and_create_record(
            buffer, 
            file.filename or "document", 
            file_size, 
            file.content_type or "application/octet-stream",
            api_key.user_id,
            db
        )

        # Parse using LlamaParse
        llama_parse = create_llama_parse_service()
        result = await llama_parse.parse_document(
            buffer,
            file.filename or "document"
        )
        
        # Update API key usage
        api_key_service = ApiKeyService(db)
        await api_key_service.increment_usage(api_key, result.page_count)
        
        # Log the API usage
        await api_key_service.log_api_usage(
            api_key_id=api_key.id,
            endpoint="/api/v1/public/extract/general",
            status_code=200,
            method="POST",
            pages_processed=result.page_count,
            request_metadata={"fileName": file.filename, "mimeType": file.content_type},
        )
        
        # Save extraction to database
        storage = StorageService(db)
        extraction = await storage.create_extraction(ExtractionCreate(
            user_id=api_key.user_id,
            document_id=document_id,
            file_name=file.filename or "document",
            file_size=file_size,
            document_type="general",
            pages_processed=result.page_count,
            extracted_data={
                "markdown": result.markdown,
                "text": result.text,
                "pageCount": result.page_count,
                "overallConfidence": result.overall_confidence,
                "confidenceStats": result.confidence_stats,
            },
            status="completed",
        ))
        
        # Return result
        return {
            "success": True,
            "markdown": result.markdown,
            "text": result.text,
            "pageCount": result.page_count,
            "pages": [
                {
                    "pageNumber": p.page_number,
                    "markdown": p.markdown,
                    "text": p.text,
                    "confidence": p.confidence,
                }
                for p in result.pages
            ],
            "fileName": file.filename,
            "fileSize": file_size,
            "mimeType": file.content_type,
            "overallConfidence": result.overall_confidence,
            "confidenceStats": result.confidence_stats,
            "documentId": document_id,
            "extractionId": extraction.id,
            "apiKeyUsage": {
                "used": api_key.monthly_usage + result.page_count,
                "limit": api_key.monthly_limit,
                "remaining": api_key.monthly_limit - (api_key.monthly_usage + result.page_count)
            }
        }
    except LlamaParseError as e:
        raise HTTPException(
            status_code=e.status_code or 500,
            detail={"message": str(e), "type": "LlamaParseError"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def public_health():
    """
    Public health check endpoint
    
    No authentication required
    
    Returns service status and available features
    """
    return {
        "status": "healthy",
        "service": "public-extract-api",
        "version": "1.0.0",
        "features": {
            "apiKeyAuth": True,
            "rateLimiting": True,
            "usageTracking": True,
        },
    }
