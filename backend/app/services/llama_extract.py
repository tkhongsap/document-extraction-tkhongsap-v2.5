"""
LlamaExtract Service
Python implementation of structured data extraction using LlamaCloud's LlamaExtract API.
Used for template-based extractions (Bank Statement, Invoice, PO, Contract, Resume).
"""
import httpx
import asyncio
import re
import os
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

from app.core.config import get_settings
from app.utils.extraction_schemas import (
    DocumentType, 
    get_schema_for_type, 
    get_line_items_key,
    RESUME_ARRAY_KEYS,
)

# Configure logger for this module
logger = logging.getLogger(__name__)


def safe_print(message: str) -> None:
    """Print message safely with UTF-8 encoding, handling encoding errors gracefully"""
    try:
        print(message)
    except UnicodeEncodeError:
        # Fallback: encode with errors='replace' for Windows console
        print(message.encode('utf-8', errors='replace').decode('utf-8', errors='replace'))


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to ASCII-safe characters for API compatibility.
    Replaces non-ASCII characters with underscores but keeps the extension.
    """
    # Get extension
    name, ext = os.path.splitext(filename)
    
    # Replace non-ASCII characters with underscore
    safe_name = re.sub(r'[^\x00-\x7F]+', '_', name)
    
    # Clean up multiple underscores
    safe_name = re.sub(r'_+', '_', safe_name).strip('_')
    
    # If name becomes empty, use default
    if not safe_name:
        safe_name = "document"
    
    return safe_name + ext


LLAMA_EXTRACT_API_BASE = "https://api.cloud.llamaindex.ai/api/v1"


class LlamaExtractError(Exception):
    """Custom exception for LlamaExtract errors"""
    def __init__(
        self, 
        message: str, 
        status_code: Optional[int] = None,
        error_code: Optional[str] = None
    ):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code


@dataclass
class ExtractedField:
    """Single extracted field"""
    key: str
    value: str
    confidence: float


@dataclass
class TemplateExtractionResult:
    """Result of template-based extraction"""
    success: bool
    pages_processed: int
    header_fields: List[ExtractedField]
    line_items: Optional[List[Dict[str, Any]]]
    extracted_data: Dict[str, Any]
    confidence_scores: Optional[Dict[str, float]]


MIME_TYPES = {
    "pdf": "application/pdf",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "txt": "text/plain",
    "html": "text/html",
}


def get_mime_type(file_name: str) -> str:
    """Get MIME type based on file extension"""
    ext = file_name.lower().split(".")[-1] if "." in file_name else ""
    return MIME_TYPES.get(ext, "application/octet-stream")


def normalize_confidence(score: float) -> float:
    """
    Normalize confidence score to 0-1 range.
    Apply a slight boost for better UX.
    """
    if score >= 0.8:
        return 0.95 + (score - 0.8) * 0.25
    if score >= 0.5:
        return 0.85 + (score - 0.5) * 0.33
    return 0.7 + score * 0.3


class LlamaExtractService:
    """LlamaExtract service for structured data extraction"""
    
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.llama_cloud_api_key
        
        if not self.api_key:
            raise LlamaExtractError("LLAMA_CLOUD_API_KEY environment variable is not set")
        
        self.max_retries = 60  # Max 60 retries (3 minutes with 3s interval)
        self.poll_interval_ms = 3000  # Poll every 3 seconds
        self.agent_cache: Dict[str, str] = {}  # documentType -> agentId
        
        safe_print(f"[LlamaExtract] API key configured: {self.api_key[:10]}...")
    
    async def extract_document(
        self,
        file_buffer: bytes,
        file_name: str,
        document_type: DocumentType,
    ) -> TemplateExtractionResult:
        """
        Extract structured data from a document using a template schema.
        
        Args:
            file_buffer: The file content as bytes
            file_name: The name of the file
            document_type: The type of document (bank, invoice, po, contract, resume)
            
        Returns:
            TemplateExtractionResult with extracted fields
        """
        safe_print(f"[LlamaExtract] Starting extraction for {sanitize_filename(file_name)} with type: {document_type}")
        
        # Step 1: Get or create extraction agent
        agent_id = await self._get_or_create_agent(document_type)
        safe_print(f"[LlamaExtract] Using agent: {agent_id}")
        
        # Step 2: Upload file
        file_id = await self._upload_file(file_buffer, file_name)
        safe_print(f"[LlamaExtract] File uploaded: {file_id}")
        
        # Step 3: Create extraction job
        job_id = await self._create_job(agent_id, file_id)
        safe_print(f"[LlamaExtract] Job created: {job_id}")
        
        # Step 4: Wait for completion
        await self._wait_for_completion(job_id)
        safe_print(f"[LlamaExtract] Job completed: {job_id}")
        
        # Step 5: Get results
        result = await self._get_result(job_id)
        safe_print(f"[LlamaExtract] Retrieved results for job: {job_id}")
        
        # Step 6: Format results
        return self._format_result(result, document_type)
    
    async def _get_or_create_agent(self, document_type: DocumentType) -> str:
        """Get or create an extraction agent for the document type"""
        # Check cache
        if document_type in self.agent_cache:
            agent_id = self.agent_cache[document_type]
            safe_print(f"[LlamaExtract] Using cached agent for {document_type}: {agent_id}")
            return agent_id
        
        # v2: Simplified schema for resume (2026-01)
        agent_name = f"docai-{document_type}-v2"
        
        # Try to find existing agent
        try:
            existing = await self._get_agent_by_name(agent_name)
            if existing:
                safe_print(f"[LlamaExtract] Found existing agent: {existing['id']}")
                self.agent_cache[document_type] = existing["id"]
                return existing["id"]
        except LlamaExtractError:
            safe_print(f"[LlamaExtract] Agent {agent_name} not found, creating new one")
        
        # Create new agent
        schema = get_schema_for_type(document_type)
        agent = await self._create_agent(agent_name, schema)
        self.agent_cache[document_type] = agent["id"]
        safe_print(f"[LlamaExtract] Created new agent: {agent['id']}")
        return agent["id"]
    
    async def _get_agent_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get extraction agent by name"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(
                f"{LLAMA_EXTRACT_API_BASE}/extraction/extraction-agents/by-name/{name}",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "application/json",
                },
            )
        
        if response.status_code == 404:
            return None
        
        if response.status_code != 200:
            error_text = response.text
            raise LlamaExtractError(
                f"Failed to get agent by name: {error_text}",
                response.status_code
            )
        
        return response.json()
    
    async def _create_agent(
        self, 
        name: str, 
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new extraction agent with the given schema"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{LLAMA_EXTRACT_API_BASE}/extraction/extraction-agents",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={
                    "name": name,
                    "data_schema": schema,
                    "config": {
                        "extraction_mode": "MULTIMODAL",
                        "extraction_target": "PER_DOC",
                    },
                },
            )
        
        if response.status_code != 200:
            error_text = response.text
            safe_print(f"[LlamaExtract] Failed to create agent: {response.status_code} - {error_text}")
            
            # Try to parse error details
            error_message = "Failed to create extraction agent"
            try:
                error_json = response.json()
                if "detail" in error_json and isinstance(error_json["detail"], list):
                    first_error = error_json["detail"][0]
                    error_message = f"{error_message}: {first_error.get('msg', first_error.get('type', 'Unknown error'))}"
                elif "message" in error_json:
                    error_message = f"{error_message}: {error_json['message']}"
                else:
                    error_message = f"{error_message}: {error_text}"
            except (ValueError, KeyError, TypeError) as e:
                # JSON parsing failed or unexpected structure
                logger.warning(f"Failed to parse error response JSON: {e}")
                error_message = f"{error_message}: {error_text}"
            
            raise LlamaExtractError(error_message, response.status_code)
        
        return response.json()
    
    async def _upload_file(self, file_buffer: bytes, file_name: str) -> str:
        """Upload a file to LlamaCloud with retry logic for network errors"""
        # Sanitize filename to avoid encoding issues with non-ASCII characters
        safe_file_name = sanitize_filename(file_name)
        mime_type = get_mime_type(file_name)
        
        files = {
            "upload_file": (safe_file_name, file_buffer, mime_type)
        }
        
        max_retries = 3
        retry_delay = 5  # seconds
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=180.0) as client:
                    response = await client.post(
                        f"{LLAMA_EXTRACT_API_BASE}/files",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Accept": "application/json",
                        },
                        files=files,
                    )
                
                if response.status_code != 200:
                    error_text = response.text
                    safe_print(f"[LlamaExtract] File upload failed: {response.status_code} - {error_text}")
                    raise LlamaExtractError(
                        f"Failed to upload file: {error_text}",
                        response.status_code
                    )
                
                result = response.json()
                return result["id"]
                
            except (httpx.ReadError, httpx.ReadTimeout, httpx.ConnectError, httpx.ConnectTimeout) as e:
                if attempt < max_retries - 1:
                    safe_print(f"[LlamaExtract] Upload attempt {attempt + 1} failed ({type(e).__name__}), retrying in {retry_delay}s...")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    safe_print(f"[LlamaExtract] Upload failed after {max_retries} attempts: {e}")
                    raise LlamaExtractError(f"Failed to upload file after {max_retries} attempts: {e}")
    
    async def _create_job(self, agent_id: str, file_id: str) -> str:
        """Create an extraction job with retry logic for network errors"""
        max_retries = 3
        retry_delay = 5  # seconds
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        f"{LLAMA_EXTRACT_API_BASE}/extraction/jobs",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
                        json={
                            "extraction_agent_id": agent_id,
                            "file_id": file_id,
                        },
                    )
                
                if response.status_code != 200:
                    error_text = response.text
                    safe_print(f"[LlamaExtract] Job creation failed: {response.status_code} - {error_text}")
                    raise LlamaExtractError(
                        f"Failed to create extraction job: {error_text}",
                        response.status_code
                    )
                
                result = response.json()
                return result["id"]
                
            except (httpx.ReadError, httpx.ReadTimeout, httpx.ConnectError, httpx.ConnectTimeout) as e:
                if attempt < max_retries - 1:
                    safe_print(f"[LlamaExtract] Create job attempt {attempt + 1} failed ({type(e).__name__}), retrying in {retry_delay}s...")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    safe_print(f"[LlamaExtract] Create job failed after {max_retries} attempts: {e}")
                    raise LlamaExtractError(f"Failed to create job after {max_retries} attempts: {e}")
    
    async def _wait_for_completion(self, job_id: str) -> None:
        """Poll for job completion with retry on connection errors"""
        safe_print(f"[LlamaExtract] Starting to poll for job {job_id} completion...")
        
        consecutive_errors = 0
        max_consecutive_errors = 5  # Allow up to 5 consecutive connection errors before failing
        
        for i in range(self.max_retries):
            try:
                status = await self._get_job_status(job_id)
                consecutive_errors = 0  # Reset on success
                safe_print(f"[LlamaExtract] Poll {i + 1}/{self.max_retries} - Job {job_id} status: {status}")
                
                if status == "SUCCESS":
                    safe_print(f"[LlamaExtract] Job {job_id} completed successfully")
                    return
                
                if status in ("ERROR", "CANCELLED"):
                    safe_print(f"[LlamaExtract] Job {job_id} failed with status: {status}")
                    raise LlamaExtractError(f"Job {job_id} failed with status: {status}")
                
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadError, httpx.ReadTimeout) as e:
                consecutive_errors += 1
                safe_print(f"[LlamaExtract] Poll {i + 1} - Connection error ({type(e).__name__}), consecutive: {consecutive_errors}/{max_consecutive_errors}")
                
                if consecutive_errors >= max_consecutive_errors:
                    safe_print(f"[LlamaExtract] Too many consecutive connection errors, giving up")
                    raise LlamaExtractError(f"Failed to poll job status after {max_consecutive_errors} consecutive connection errors: {e}")
                
                # Wait a bit longer on connection error before retry
                await asyncio.sleep((self.poll_interval_ms / 1000) * 2)
                continue
            
            await asyncio.sleep(self.poll_interval_ms / 1000)
        
        safe_print(f"[LlamaExtract] Job {job_id} timed out after {self.max_retries} polls")
        raise LlamaExtractError(
            f"Job {job_id} timed out after {self.max_retries * self.poll_interval_ms / 1000} seconds"
        )
    
    async def _get_job_status(self, job_id: str) -> str:
<<<<<<< HEAD
        """Get job status"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(
                f"{LLAMA_EXTRACT_API_BASE}/extraction/jobs/{job_id}",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "application/json",
                },
            )
=======
        """Get job status with retry on connection errors"""
        max_retries = 3
        retry_delay = 2.0
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.get(
                        f"{LLAMA_EXTRACT_API_BASE}/extraction/jobs/{job_id}",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Accept": "application/json",
                        },
                    )
                
                if response.status_code != 200:
                    error_text = response.text
                    raise LlamaExtractError(
                        f"Failed to get job status: {error_text}",
                        response.status_code
                    )
                
                result = response.json()
                return result["status"]
                
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadError, httpx.ReadTimeout) as e:
                safe_print(f"[LlamaExtract] _get_job_status attempt {attempt + 1}/{max_retries} failed: {type(e).__name__}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    raise  # Re-raise to be handled by _wait_for_completion
    
    async def _get_result(self, job_id: str) -> Dict[str, Any]:
<<<<<<< HEAD
        """Get extraction result"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(
                f"{LLAMA_EXTRACT_API_BASE}/extraction/jobs/{job_id}/result",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "application/json",
                },
            )
=======
        """Get extraction result with retry on connection errors"""
        max_retries = 3
        retry_delay = 2.0
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.get(
                        f"{LLAMA_EXTRACT_API_BASE}/extraction/jobs/{job_id}/result",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Accept": "application/json",
                        },
                    )
                
                if response.status_code != 200:
                    error_text = response.text
                    raise LlamaExtractError(
                        f"Failed to get job result: {error_text}",
                        response.status_code
                    )
                
                return response.json()
                
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadError, httpx.ReadTimeout) as e:
                safe_print(f"[LlamaExtract] _get_result attempt {attempt + 1}/{max_retries} failed: {type(e).__name__}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    raise LlamaExtractError(f"Failed to get job result after {max_retries} retries: {e}")
    
    def _format_result(
        self,
        result: Dict[str, Any],
        document_type: DocumentType,
    ) -> TemplateExtractionResult:
        """Format extraction result for frontend"""
        safe_print(f"[LlamaExtract] Formatting result for document type: {document_type}")
        
        data = result.get("data", {})
        confidence_scores = result.get("extraction_metadata", {}).get("confidence_scores", {})
        
        # Use repr() for safe logging of Unicode characters on Windows
        safe_print(f"[LlamaExtract] Raw result data keys: {list(data.keys())}")
        safe_print(f"[LlamaExtract] Raw confidence scores: {confidence_scores}")
        
        # Separate header fields from line items
        line_items_key = get_line_items_key(document_type)
        line_items = data.get(line_items_key) if line_items_key else None
        
        # Build header fields
        header_fields: List[ExtractedField] = []
        self._flatten_object(data, "", header_fields, confidence_scores, line_items_key, document_type)
        
        safe_print(f"[LlamaExtract] Formatted {len(header_fields)} header fields")
        
        # Normalize confidence scores
        normalized_scores: Dict[str, float] = {}
        for key, score in confidence_scores.items():
            normalized_scores[key] = normalize_confidence(score)
        
        print(f"[LlamaExtract] Confidence scores count: {len(normalized_scores)}")
        
        return TemplateExtractionResult(
            success=True,
            pages_processed=1,  # LlamaExtract processes entire document
            header_fields=header_fields,
            line_items=line_items,
            extracted_data=data,
            confidence_scores=normalized_scores,
        )
    
    def _flatten_object(
        self,
        obj: Dict[str, Any],
        prefix: str,
        result: List[ExtractedField],
        confidence_scores: Dict[str, float],
        skip_key: Optional[str],
        document_type: Optional[DocumentType] = None,
    ) -> None:
        """Flatten nested object into key-value pairs for header fields"""
        resume_array_keys = RESUME_ARRAY_KEYS if document_type == "resume" else []
        
        for key, value in obj.items():
            # Skip line items array
            if key == skip_key:
                continue
            # Skip signatures array for contracts
            if key == "signatures":
                continue
            # Skip all resume arrays
            if key in resume_array_keys:
                continue
            
            full_key = f"{prefix}.{key}" if prefix else key
            
            if value is None:
                continue
            
            if isinstance(value, list):
                # Skip arrays (handled separately as line items)
                continue
            
            if isinstance(value, dict):
                # Recursively flatten nested objects
                self._flatten_object(
                    value, full_key, result, confidence_scores, skip_key, document_type
                )
            else:
                # Add primitive value as header field
                confidence = confidence_scores.get(full_key, 0.95)
                result.append(ExtractedField(
                    key=full_key,
                    value=str(value),
                    confidence=normalize_confidence(confidence),
                ))


def create_llama_extract_service() -> LlamaExtractService:
    """Factory function to create LlamaExtract service"""
    return LlamaExtractService()
