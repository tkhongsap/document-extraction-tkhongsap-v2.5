"""
Public Extract API Routes
Public endpoints for document extraction using API Key authentication
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import httpx
import io
import json
import uuid

from pypdf import PdfReader

from app.core.database import get_db
from app.middlewares.api_auth import verify_api_key, check_api_key_quota, ApiKeyPlaceholder
from app.services.storage import StorageService
from app.services.object_storage import ObjectStorageService, ObjectAclPolicy
from app.services.llama_parse import create_llama_parse_service, LlamaParseError
from app.services.llama_extract import create_llama_extract_service, LlamaExtractError
from app.services.api_key_service import ApiKeyService
from app.services.embedding_service import get_embedding_service
from app.schemas.document import DocumentCreate
from app.schemas.extraction import ExtractionCreate
from app.utils.extraction_schemas import DocumentType

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
    api_key: ApiKeyPlaceholder = Depends(verify_api_key),
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
        
        # Update API key usage in database
        api_key_service = ApiKeyService(db)
        await api_key_service.increment_usage(api_key, result.pages_processed)
        
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
        
        # For resume type, return database schema format (like Batch_resume.py)
        if documentType == "resume":
            extracted_data = result.extracted_data or {}
            now = datetime.utcnow()
            
            # Parse extracted data to match database schema
            name = extracted_data.get("full_name") or extracted_data.get("name") or "Unknown"
            current_role = extracted_data.get("desired_position") or extracted_data.get("currentRole") or ""
            location = _parse_location(extracted_data)
            years_experience = _safe_int(extracted_data.get("total_years_experience") or extracted_data.get("yearsExperience"))
            skills = _parse_skills(extracted_data.get("skills", []))
            education = extracted_data.get("education", []) or None
            experience = extracted_data.get("work_experience") or extracted_data.get("experience", []) or None
            certifications = _parse_certifications(extracted_data.get("certifications", []))
            languages = _parse_languages(extracted_data.get("languages", []))
            languages_with_proficiency = _parse_languages_with_proficiency(extracted_data.get("languages", []))
            summary = extracted_data.get("professional_summary") or extracted_data.get("summary") or ""
            
            # Build output structure matching database schema exactly
            output_data = {
                "id": str(uuid.uuid4()),
                "user_id": api_key.user_id,
                "extraction_id": extraction.id,
                "name": name,
                "email": extracted_data.get("email"),
                "phone": extracted_data.get("phone"),
                "location": location,
                "current_role": current_role,
                "years_experience": years_experience,
                "skills": skills,
                "education": education,
                "experience": experience,
                "certifications": certifications,
                "languages": languages,
                "languages_with_proficiency": languages_with_proficiency,
                "summary": summary,
                "salary_expectation": _safe_int(extracted_data.get("desired_salary") or extracted_data.get("salaryExpectation")),
                "availability_date": _parse_availability_date(extracted_data.get("availability") or extracted_data.get("availabilityDate")),
                "gender": extracted_data.get("gender"),
                "nationality": extracted_data.get("nationality") or "",
                "birth_year": _safe_int(extracted_data.get("birth_year") or extracted_data.get("birthYear")),
                "has_car": _safe_bool(extracted_data.get("has_car") or extracted_data.get("hasCar")),
                "has_license": _safe_bool(extracted_data.get("has_license") or extracted_data.get("hasLicense")),
                "willing_to_travel": _safe_bool(extracted_data.get("willing_to_travel") or extracted_data.get("willingToTravel")),
                "embedding": None,
                "embedding_model": None,
                "embedding_text": None,
                "source_file_name": file.filename,
                "raw_extracted_data": extracted_data,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
            
            # Generate embedding text
            embedding_text = generate_embedding_text(output_data)
            output_data["embedding_text"] = embedding_text
            
            # Generate embedding
            try:
                embedding_service = get_embedding_service()
                embedding_vector = await embedding_service.create_embedding(embedding_text)
                output_data["embedding"] = embedding_vector
                output_data["embedding_model"] = embedding_service.model
            except Exception as e:
                output_data["embedding_error"] = str(e)
            
            # Generate output filename from source file
            source_name = file.filename or "resume"
            if source_name.lower().endswith('.pdf'):
                output_filename = source_name[:-4] + ".json"
            else:
                output_filename = source_name + ".json"
            
            # Return as downloadable JSON file (same format as Batch_resume.py output)
            return Response(
                content=json.dumps(output_data, indent=2, ensure_ascii=False),
                media_type="application/json",
                headers={
                    "Content-Disposition": f'attachment; filename="{output_filename}"'
                }
            )
        
        # For other document types, return original format
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
    api_key: ApiKeyPlaceholder = Depends(verify_api_key),
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
        
        # Update API key usage in database
        api_key_service = ApiKeyService(db)
        await api_key_service.increment_usage(api_key, result.page_count)
        
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


# ============================================================================
# RESUME EXTRACTION WITH DATABASE SCHEMA FORMAT (like Batch_resume.py output)
# ============================================================================

def _safe_int(value) -> Optional[int]:
    """Safely convert to int or return None"""
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _safe_bool(value) -> Optional[bool]:
    """Safely convert to bool or return None"""
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', 'yes', '1')
    return bool(value)


def _parse_location(data: Dict) -> Optional[str]:
    """Parse location from various formats"""
    location = data.get("location")
    if location:
        return location
    
    address = data.get("address")
    if isinstance(address, dict):
        parts = [address.get("city"), address.get("country")]
        return ", ".join(filter(None, parts)) or None
    elif address:
        return str(address)
    
    return None


def _parse_skills(skills_raw: List) -> Optional[List[str]]:
    """Parse skills to list of strings"""
    if not skills_raw:
        return None
    skills = []
    if isinstance(skills_raw, list):
        for skill in skills_raw:
            if isinstance(skill, dict):
                skill_name = skill.get("skill_name") or skill.get("name") or skill.get("skill")
                if skill_name:
                    skills.append(str(skill_name))
            elif skill:
                skills.append(str(skill))
    return skills if skills else None


def _parse_certifications(certs_raw: List) -> Optional[List[str]]:
    """Parse certifications to list of strings"""
    if not certs_raw:
        return None
    certs = []
    if isinstance(certs_raw, list):
        for cert in certs_raw:
            if isinstance(cert, dict):
                cert_name = cert.get("name") or cert.get("title")
                if cert_name:
                    certs.append(str(cert_name))
            elif cert:
                certs.append(str(cert))
    return certs if certs else None


def _parse_languages(langs_raw: List) -> Optional[List[str]]:
    """Parse languages to list of strings"""
    if not langs_raw:
        return None
    languages = []
    if isinstance(langs_raw, list):
        for lang in langs_raw:
            if isinstance(lang, dict):
                lang_name = lang.get("language") or lang.get("name", "")
                if lang_name:
                    languages.append(str(lang_name))
            elif lang:
                languages.append(str(lang))
    return languages if languages else None


def _parse_languages_with_proficiency(langs_raw: List) -> Optional[List[Dict]]:
    """Parse languages with proficiency levels"""
    if not langs_raw:
        return None
    languages = []
    if isinstance(langs_raw, list):
        for lang in langs_raw:
            if isinstance(lang, dict):
                lang_name = lang.get("language") or lang.get("name", "")
                lang_level = lang.get("level") or lang.get("proficiency", "")
                if lang_name:
                    languages.append({"language": lang_name, "level": lang_level})
    return languages if languages else None


def _parse_availability_date(value) -> Optional[str]:
    """Parse availability date to ISO format string"""
    if not value:
        return None
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        try:
            parsed = datetime.strptime(value, "%Y-%m-%d")
            return parsed.date().isoformat()
        except ValueError:
            return value
    return None


def generate_embedding_text(data: Dict[str, Any]) -> str:
    """Generate text for embedding from resume fields"""
    parts = []
    
    if data.get("name"):
        parts.append(f"Name: {data['name']}")
    if data.get("current_role"):
        parts.append(f"Current Role: {data['current_role']}")
    if data.get("location"):
        parts.append(f"Location: {data['location']}")
    if data.get("years_experience"):
        parts.append(f"Years of Experience: {data['years_experience']}")
    if data.get("summary"):
        parts.append(f"Summary: {data['summary']}")
    
    # Skills
    if data.get("skills"):
        skill_texts = []
        for skill in data["skills"]:
            if isinstance(skill, dict):
                skill_texts.append(skill.get('name', skill.get('skill', str(skill))))
            else:
                skill_texts.append(str(skill))
        parts.append(f"Skills: {', '.join(skill_texts)}")
    
    # Certifications
    if data.get("certifications"):
        cert_texts = []
        for cert in data["certifications"]:
            if isinstance(cert, dict):
                cert_texts.append(cert.get('name', cert.get('title', str(cert))))
            else:
                cert_texts.append(str(cert))
        parts.append(f"Certifications: {', '.join(cert_texts)}")
    
    # Languages
    if data.get("languages"):
        lang_texts = []
        for lang in data["languages"]:
            if isinstance(lang, dict):
                lang_name = lang.get('language', lang.get('name', ''))
                lang_level = lang.get('level', lang.get('proficiency', ''))
                if lang_level:
                    lang_texts.append(f"{lang_name} ({lang_level})")
                else:
                    lang_texts.append(str(lang_name))
            else:
                lang_texts.append(str(lang))
        parts.append(f"Languages: {', '.join(lang_texts)}")
    
    # Education
    if data.get("education"):
        edu_texts = []
        for edu in data["education"]:
            if isinstance(edu, dict):
                edu_text = f"{edu.get('degree', '')} in {edu.get('field', '')} from {edu.get('institution', '')}"
                edu_texts.append(edu_text.strip())
        if edu_texts:
            parts.append(f"Education: {'; '.join(edu_texts)}")
    
    # Experience
    if data.get("experience"):
        exp_texts = []
        for exp in data["experience"]:
            if isinstance(exp, dict):
                exp_text = f"{exp.get('title', exp.get('job_title', ''))} at {exp.get('company', exp.get('company_name', ''))}: {exp.get('description', exp.get('responsibilities', ''))}"
                exp_texts.append(exp_text.strip())
        if exp_texts:
            parts.append(f"Experience: {'; '.join(exp_texts)}")
    
    return "\n".join(parts)


@router.get("/health")
async def public_health():
    """
    Public health check endpoint
    
    No authentication required
    """
    return {
        "status": "healthy",
        "service": "public-extract-api",
        "version": "1.0.0",
    }

