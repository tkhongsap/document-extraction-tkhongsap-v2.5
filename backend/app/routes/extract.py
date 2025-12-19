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
from app.services.resume_service import ResumeService
from app.models.user import User
from app.schemas.document import DocumentCreate
from app.schemas.extraction import ExtractionCreate
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
        
        # Auto-save extraction to database (will be auto-deleted after 3 days)
        extraction = await storage.create_extraction(ExtractionCreate(
            user_id=user.id,
            document_id=document_id,
            file_name=file.filename or "document",
            file_size=file_size,
            document_type=documentType,
            pages_processed=result.pages_processed,
            extracted_data=result.extracted_data,
            status="completed",
        ))
        
        # If document type is resume, also save to resumes table with embedding
        resume_id = None
        if documentType == "resume" and result.extracted_data:
            try:
                resume_service = ResumeService(db)
                resume = await resume_service.create_from_extraction(
                    user_id=user.id,
                    extraction_id=extraction.id,
                    extracted_data=result.extracted_data,
                    source_file_name=file.filename or "document",
                    generate_embedding=True,
                )
                resume_id = resume.id
                safe_print(f"[Template Extraction] Resume saved with ID: {resume_id}")
            except Exception as e:
                safe_print(f"[Template Extraction] Warning: Failed to save resume: {e}")
                # Continue without resume save - extraction is still saved
        
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
            "resumeId": resume_id,
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
        
        # Auto-save extraction to database (will be auto-deleted after 3 days)
        extraction = await storage.create_extraction(ExtractionCreate(
            user_id=user.id,
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


# =============================================================================
# Batch Extraction Endpoints
# =============================================================================

@router.post("/batch/process")
async def batch_template_extraction(
    files: List[UploadFile] = File(...),
    documentType: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(ensure_usage_reset),
):
    """
    Batch process multiple documents using LlamaExtract templates.
    Processes files sequentially to avoid rate limiting.
    """
    safe_print(f"[Batch Template Extraction] Processing {len(files)} files with template: {documentType}")
    
    # Validate document type
    valid_types = ["bank", "invoice", "po", "contract", "resume"]
    if documentType not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document type. Must be one of: {', '.join(valid_types)}"
        )
    
    results = []
    
    for file in files:
        result_item = {
            "fileName": file.filename,
            "success": False,
            "error": None,
            "data": None,
        }
        
        try:
            # Debug: log file info
            safe_print(f"[Batch Template] File: {file.filename}, content_type: {file.content_type}, size: {file.size}")
            
            # Validate file type - handle None content_type by inferring from filename
            content_type = file.content_type
            if not content_type or content_type == "application/octet-stream":
                if file.filename:
                    fname = file.filename.lower()
                    if fname.endswith('.pdf'):
                        content_type = "application/pdf"
                    elif fname.endswith(('.jpg', '.jpeg')):
                        content_type = "image/jpeg"
                    elif fname.endswith('.png'):
                        content_type = "image/png"
            
            if content_type not in ALLOWED_MIMES:
                result_item["error"] = f"Unsupported file type: {content_type}"
                results.append(result_item)
                continue
            
            # Read file content
            content = await file.read()
            file_size = len(content)
            
            # Check file size
            if file_size > MAX_FILE_SIZE:
                result_item["error"] = f"File too large: {file_size / (1024*1024):.1f}MB (max 50MB)"
                results.append(result_item)
                continue
            
            # Reset file position
            await file.seek(0)
            
            # Get page count for PDFs
            page_count = get_pdf_page_count(content)
            
            # Check usage limit
            pages_remaining = current_user.monthly_limit - current_user.monthly_usage
            if pages_remaining < page_count:
                result_item["error"] = f"Insufficient pages remaining ({pages_remaining} < {page_count})"
                results.append(result_item)
                continue
            
            # Upload document and create record
            document_id = await upload_document_and_create_record(
                buffer=content,
                file_name=file.filename or "document",
                file_size=file_size,
                mime_type=content_type,
                user_id=current_user.id,
                db=db,
            )
            
            # Process with LlamaExtract
            extract_service = create_llama_extract_service()
            
            extraction_result = await extract_service.extract_document(
                file_buffer=content,
                file_name=file.filename or "document",
                document_type=documentType,  # Pass string directly, already validated
            )
            
            # Update usage
            current_user.monthly_usage += page_count
            db.add(current_user)
            await db.commit()
            
            # Save extraction to database for history
            storage = StorageService(db)
            extraction = await storage.create_extraction(ExtractionCreate(
                user_id=current_user.id,
                document_id=document_id,
                file_name=file.filename or "document",
                file_size=file_size,
                document_type=documentType,
                pages_processed=page_count,
                extracted_data=extraction_result.extracted_data,
                status="completed",
            ))
            
            # If document type is resume, also save to resumes table with embedding
            resume_id = None
            if documentType == "resume" and extraction_result.extracted_data:
                try:
                    resume_service = ResumeService(db)
                    resume = await resume_service.create_from_extraction(
                        user_id=current_user.id,
                        extraction_id=extraction.id,
                        extracted_data=extraction_result.extracted_data,
                        source_file_name=file.filename or "document",
                        generate_embedding=True,
                    )
                    resume_id = resume.id
                except Exception as e:
                    safe_print(f"[Batch Template] Warning: Failed to save resume: {e}")
            
            result_item["success"] = True
            result_item["data"] = {
                "headerFields": [
                    {"key": f.key, "value": str(f.value) if f.value is not None else "", "confidence": f.confidence}
                    for f in extraction_result.header_fields
                ],
                "lineItems": extraction_result.line_items,
                "extractedData": extraction_result.extracted_data,
                "confidenceScores": extraction_result.confidence_scores,
                "pagesProcessed": page_count,
                "fileSize": file_size,
                "mimeType": content_type,
                "documentId": document_id,
                "extractionId": extraction.id,
                "resumeId": resume_id,
            }
            
        except LlamaExtractError as e:
            result_item["error"] = str(e)
        except Exception as e:
            result_item["error"] = str(e)
        
        results.append(result_item)
    
    # Count successes and failures
    success_count = sum(1 for r in results if r["success"])
    failure_count = len(results) - success_count
    
    safe_print(f"[Batch Template Extraction] Complete: {success_count} success, {failure_count} failed")
    
    return {
        "success": True,
        "totalFiles": len(files),
        "successCount": success_count,
        "failureCount": failure_count,
        "results": results,
    }


@router.post("/batch/general")
async def batch_general_extraction(
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(ensure_usage_reset),
):
    """
    Batch process multiple documents using LlamaParse for general extraction.
    Processes files sequentially to avoid rate limiting.
    """
    safe_print(f"[Batch General Extraction] Processing {len(files)} files")
    
    results = []
    
    for file in files:
        result_item = {
            "fileName": file.filename,
            "success": False,
            "error": None,
            "data": None,
        }
        
        try:
            # Debug: log file info
            safe_print(f"[Batch General] File: {file.filename}, content_type: {file.content_type}, size: {file.size}")
            
            # Validate file type - handle None content_type by inferring from filename
            content_type = file.content_type
            if not content_type or content_type == "application/octet-stream":
                if file.filename:
                    fname = file.filename.lower()
                    if fname.endswith('.pdf'):
                        content_type = "application/pdf"
                    elif fname.endswith(('.jpg', '.jpeg')):
                        content_type = "image/jpeg"
                    elif fname.endswith('.png'):
                        content_type = "image/png"
                    elif fname.endswith('.docx'):
                        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    elif fname.endswith('.xlsx'):
                        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            
            if content_type not in ALLOWED_MIMES:
                result_item["error"] = f"Unsupported file type: {content_type}"
                results.append(result_item)
                continue
            
            # Read file content
            content = await file.read()
            file_size = len(content)
            
            # Check file size
            if file_size > MAX_FILE_SIZE:
                result_item["error"] = f"File too large: {file_size / (1024*1024):.1f}MB (max 50MB)"
                results.append(result_item)
                continue
            
            # Reset file position
            await file.seek(0)
            
            # Get page count for PDFs
            page_count = get_pdf_page_count(content)
            
            # Check usage limit
            pages_remaining = current_user.monthly_limit - current_user.monthly_usage
            if pages_remaining < page_count:
                result_item["error"] = f"Insufficient pages remaining ({pages_remaining} < {page_count})"
                results.append(result_item)
                continue
            
            # Upload document and create record
            document_id = await upload_document_and_create_record(
                buffer=content,
                file_name=file.filename or "document",
                file_size=file_size,
                mime_type=content_type,
                user_id=current_user.id,
                db=db,
            )
            
            # Process with LlamaParse
            parse_service = create_llama_parse_service()
            
            extraction_result = await parse_service.parse_document(
                file_buffer=content,
                file_name=file.filename or "document",
            )
            
            # Update usage
            current_user.monthly_usage += page_count
            db.add(current_user)
            await db.commit()
            
            # Save extraction to database for history
            storage = StorageService(db)
            extraction = await storage.create_extraction(ExtractionCreate(
                user_id=current_user.id,
                document_id=document_id,
                file_name=file.filename or "document",
                file_size=file_size,
                document_type="general",
                pages_processed=extraction_result.page_count,
                extracted_data={
                    "markdown": extraction_result.markdown,
                    "text": extraction_result.text,
                    "pageCount": extraction_result.page_count,
                    "overallConfidence": extraction_result.overall_confidence,
                    "confidenceStats": extraction_result.confidence_stats,
                },
                status="completed",
            ))
            
            result_item["success"] = True
            result_item["data"] = {
                "markdown": extraction_result.markdown,
                "text": extraction_result.text,
                "pageCount": extraction_result.page_count,
                "pages": [
                    {
                        "pageNumber": p.page_number,
                        "markdown": p.markdown,
                        "text": p.text,
                        "confidence": p.confidence,
                    }
                    for p in extraction_result.pages
                ],
                "fileSize": file_size,
                "mimeType": content_type,
                "overallConfidence": extraction_result.overall_confidence,
                "confidenceStats": extraction_result.confidence_stats,
                "documentId": document_id,
                "extractionId": extraction.id,
            }
            
        except LlamaParseError as e:
            result_item["error"] = str(e)
        except Exception as e:
            result_item["error"] = str(e)
        
        results.append(result_item)
    
    # Count successes and failures
    success_count = sum(1 for r in results if r["success"])
    failure_count = len(results) - success_count
    
    safe_print(f"[Batch General Extraction] Complete: {success_count} success, {failure_count} failed")
    
    return {
        "success": True,
        "totalFiles": len(files),
        "successCount": success_count,
        "failureCount": failure_count,
        "results": results,
    }
