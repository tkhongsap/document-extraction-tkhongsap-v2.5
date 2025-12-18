"""
Extract Routes - Template and General Extraction
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import httpx
import io

from pypdf import PdfReader

from app.core.database import get_db
from app.core.auth import ensure_usage_reset
from app.services.storage import StorageService
from app.services.object_storage import ObjectStorageService, ObjectAclPolicy
from app.services.llama_parse import create_llama_parse_service, LlamaParseError
from app.services.llama_extract import create_llama_extract_service, LlamaExtractError
from app.models.user import User
from app.schemas.document import DocumentCreate
from app.utils.extraction_schemas import DocumentType

router = APIRouter(prefix="/api/extract", tags=["extract"])


def safe_print(message: str) -> None:
    """Print message safely with UTF-8 encoding, handling encoding errors gracefully"""
    try:
        print(message)
    except UnicodeEncodeError:
        # Fallback: encode with errors='replace' for Windows console
        print(message.encode('utf-8', errors='replace').decode('utf-8', errors='replace'))


# Allowed MIME types for upload
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
        return 1  # Default to 1 page for non-PDF or errors


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
            raise Exception(f"Failed to upload file to GCS: {response.text}")

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
        safe_print(f"[Upload] Failed to store document: {e}")
        return None


@router.post("/process")
async def template_extraction(
    file: UploadFile = File(...),
    documentType: str = Form(...),
    user: User = Depends(ensure_usage_reset),
    db: AsyncSession = Depends(get_db),
):
    """
    Template-based extraction using LlamaExtract.
    Used for Bank Statement, Invoice, Purchase Order, Contract, and Resume templates.
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
    
    # Check monthly limit
    new_usage = user.monthly_usage + 1
    if new_usage > user.monthly_limit:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Monthly page limit exceeded",
                "usage": user.monthly_usage,
                "limit": user.monthly_limit,
            }
        )
    
    try:
        # Upload document
        document_id = await upload_document_and_create_record(
            buffer, file.filename or "document", file_size, file.content_type or "application/octet-stream",
            user.id, db
        )

        # Extract using LlamaExtract
        llama_extract = create_llama_extract_service()
        result = await llama_extract.extract_document(
            buffer,
            file.filename or "document",
            documentType  # type: ignore
        )
        
        # Update usage
        storage = StorageService(db)
        await storage.update_user_usage(user.id, result.pages_processed)
        
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
        }
    except LlamaExtractError as e:
        safe_print(f"[Template Extraction] Error: {e}")
        raise HTTPException(
            status_code=e.status_code or 500,
            detail={"message": str(e), "type": "LlamaExtractError"}
        )
    except Exception as e:
        safe_print(f"[Template Extraction] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/general")
async def general_extraction(
    file: UploadFile = File(...),
    user: User = Depends(ensure_usage_reset),
    db: AsyncSession = Depends(get_db),
):
    """
    General extraction using LlamaParse.
    This is for the "New Extraction" feature (type='general').
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
    
    # Get page count before calling LlamaParse API
    page_count = get_pdf_page_count(buffer) if file.content_type == "application/pdf" else 1
    
    # Check monthly limit with actual page count
    new_usage = user.monthly_usage + page_count
    if new_usage > user.monthly_limit:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Monthly page limit exceeded",
                "usage": user.monthly_usage,
                "limit": user.monthly_limit,
                "pagesRequired": page_count,
            }
        )
    
    try:
        # Upload document
        document_id = await upload_document_and_create_record(
            buffer, file.filename or "document", file_size, file.content_type or "application/octet-stream",
            user.id, db
        )

        # Parse using LlamaParse
        llama_parse = create_llama_parse_service()
        result = await llama_parse.parse_document(
            buffer,
            file.filename or "document"
        )
        
        # Update usage
        storage = StorageService(db)
        await storage.update_user_usage(user.id, result.page_count)
        
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
        }
    except LlamaParseError as e:
        safe_print(f"[General Extraction] Error: {e}")
        raise HTTPException(
            status_code=e.status_code or 500,
            detail={"message": str(e), "type": "LlamaParseError"}
        )
    except Exception as e:
        safe_print(f"[General Extraction] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
