"""
LlamaParse Service
Python implementation of document parsing using LlamaCloud's LlamaParse API.
Used for "New Extraction" (general) feature.
"""
import httpx
import asyncio
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

from app.core.config import get_settings

LLAMA_PARSE_API_BASE = "https://api.cloud.llamaindex.ai/api/v1/parsing"


class LlamaParseError(Exception):
    """Custom exception for LlamaParse errors"""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


@dataclass
class LlamaParseConfig:
    """Configuration for LlamaParse parsing options"""
    parse_mode: str = "parse_page_with_agent"  # Always use agentic mode
    model: str = "openai-gpt-4-1-mini"  # Required for agentic mode
    high_res_ocr: bool = True
    adaptive_long_table: bool = True
    outlined_table_extraction: bool = True
    output_tables_as_html: bool = True
    parsing_instruction: Optional[str] = None


DEFAULT_PARSING_INSTRUCTION = """Format the document with proper structure and spacing:
- Use appropriate heading levels (# for main title, ## for sections, ### for subsections)
- Separate paragraphs with blank lines for readability
- Format tables with clear headers and aligned columns
- Use bullet points or numbered lists where appropriate
- Preserve the document's logical structure and hierarchy
- Add clear spacing between different sections
- For personal information like contact details, format as a clean list
- For tabular data, use markdown tables with proper headers"""


@dataclass
class ParsedPage:
    """Parsed page result"""
    page_number: int
    markdown: str
    text: str
    layout: Optional[List[Dict[str, Any]]] = None
    confidence: Optional[float] = None


@dataclass
class ParsedDocument:
    """Complete parsed document result"""
    markdown: str
    text: str
    page_count: int
    pages: List[ParsedPage]
    overall_confidence: Optional[float] = None
    confidence_stats: Optional[Dict[str, float]] = None


def normalize_confidence(raw: float) -> float:
    """
    Normalize raw confidence scores to user-friendly ranges.
    
    Thresholds:
    - Raw < 0.3 → Low (<70%)
    - Raw 0.3-0.5 → Medium (70-89.99%)
    - Raw >= 0.5 → High (90-100%)
    """
    if raw < 0.3:
        return 0.5 + (raw / 0.3) * 0.2
    elif raw < 0.5:
        return 0.7 + ((raw - 0.3) / 0.2) * 0.2
    else:
        return 0.9 + ((raw - 0.5) / 0.5) * 0.1


def get_default_config() -> LlamaParseConfig:
    """Get default agentic parsing configuration"""
    return LlamaParseConfig(
        parse_mode="parse_page_with_agent",
        model="openai-gpt-4-1-mini",
        high_res_ocr=True,
        adaptive_long_table=True,
        outlined_table_extraction=True,
        output_tables_as_html=True,
        parsing_instruction=DEFAULT_PARSING_INSTRUCTION,
    )


MIME_TYPES = {
    "pdf": "application/pdf",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "ppt": "application/vnd.ms-powerpoint",
    "txt": "text/plain",
    "html": "text/html",
    "xml": "application/xml",
}


def get_mime_type(file_name: str) -> str:
    """Get MIME type from file name"""
    ext = file_name.lower().split(".")[-1] if "." in file_name else ""
    return MIME_TYPES.get(ext, "application/octet-stream")


class LlamaParseService:
    """LlamaParse service for document parsing"""
    
    def __init__(self, config: Optional[LlamaParseConfig] = None):
        settings = get_settings()
        self.api_key = settings.llama_cloud_api_key
        
        if not self.api_key:
            raise LlamaParseError("LLAMA_CLOUD_API_KEY environment variable is not set")
        
        self.max_retries = 60  # Max 60 retries (5 minutes with 5s interval)
        self.poll_interval_ms = 5000  # Poll every 5 seconds
        self.config = config or get_default_config()
        
        if not self.config.model:
            raise LlamaParseError("Model is required for agentic parsing mode")
        
        print(f"[LlamaParse] API key configured: {self.api_key[:10]}...")
        print(f"[LlamaParse] Using parse mode: {self.config.parse_mode}")
    
    async def parse_document(
        self, 
        file_buffer: bytes, 
        file_name: str
    ) -> ParsedDocument:
        """
        Parse a document using LlamaParse.
        
        Args:
            file_buffer: The file content as bytes
            file_name: The name of the file
            
        Returns:
            ParsedDocument with markdown and metadata
        """
        # Step 1: Upload file and start job
        job_id = await self._upload_file(file_buffer, file_name)
        print(f"[LlamaParse] Job started: {job_id}")
        
        # Step 2: Poll for completion
        await self._wait_for_completion(job_id)
        print(f"[LlamaParse] Job completed: {job_id}")
        
        # Step 3: Get results
        result = await self._get_result(job_id)
        print(f"[LlamaParse] Retrieved results for job: {job_id}")
        
        return self._format_result(result)
    
    async def _upload_file(self, file_buffer: bytes, file_name: str) -> str:
        """Upload file to LlamaParse and start parsing job"""
        mime_type = get_mime_type(file_name)
        
        # Prepare form data
        files = {
            "file": (file_name, file_buffer, mime_type)
        }
        
        data = {
            "parse_mode": self.config.parse_mode,
            "model": self.config.model,
            "high_res_ocr": str(self.config.high_res_ocr).lower(),
            "adaptive_long_table": str(self.config.adaptive_long_table).lower(),
            "outlined_table_extraction": str(self.config.outlined_table_extraction).lower(),
            "output_tables_as_HTML": str(self.config.output_tables_as_html).lower(),
            "extract_layout": "true",
        }
        
        if self.config.parsing_instruction:
            data["parsing_instruction"] = self.config.parsing_instruction
            print("[LlamaParse] Using custom parsing instruction")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{LLAMA_PARSE_API_BASE}/upload",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "application/json",
                },
                files=files,
                data=data,
            )
        
        if response.status_code != 200:
            error_text = response.text
            print(f"[LlamaParse] Upload failed: {response.status_code} - {error_text}")
            raise LlamaParseError(
                f"Failed to upload file to LlamaParse: {error_text}",
                response.status_code
            )
        
        result = response.json()
        return result["id"]
    
    async def _wait_for_completion(self, job_id: str) -> None:
        """Poll for job completion"""
        for i in range(self.max_retries):
            status = await self._get_status(job_id)
            
            if status == "SUCCESS":
                return
            
            if status in ("ERROR", "CANCELLED"):
                raise LlamaParseError(f"Job {job_id} failed with status: {status}")
            
            # Wait before next poll
            await asyncio.sleep(self.poll_interval_ms / 1000)
        
        raise LlamaParseError(
            f"Job {job_id} timed out after {self.max_retries * self.poll_interval_ms / 1000} seconds"
        )
    
    async def _get_status(self, job_id: str) -> str:
        """Get job status"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{LLAMA_PARSE_API_BASE}/job/{job_id}",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "application/json",
                },
            )
        
        if response.status_code != 200:
            error_text = response.text
            raise LlamaParseError(
                f"Failed to get job status: {error_text}",
                response.status_code
            )
        
        result = response.json()
        return result["status"]
    
    async def _get_result(self, job_id: str) -> Dict[str, Any]:
        """Get parsing result"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{LLAMA_PARSE_API_BASE}/job/{job_id}/result/json",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "application/json",
                },
            )
        
        if response.status_code != 200:
            error_text = response.text
            raise LlamaParseError(
                f"Failed to get job result: {error_text}",
                response.status_code
            )
        
        return response.json()
    
    def _format_result(self, result: Dict[str, Any]) -> ParsedDocument:
        """Format LlamaParse result into standard format"""
        raw_pages = result.get("pages", [])
        
        print(f"[LlamaParse] formatResult - Total pages: {len(raw_pages)}")
        print(f"[LlamaParse] formatResult - Job metadata: {result.get('job_metadata')}")
        
        pages: List[ParsedPage] = []
        
        for index, page in enumerate(raw_pages):
            layout = page.get("layout", [])
            has_layout = bool(layout)
            print(f"[LlamaParse] Page {index + 1} - Has layout: {has_layout}, Layout elements: {len(layout)}")
            
            # Calculate page-level confidence
            page_confidence: Optional[float] = None
            if layout:
                confidences = [
                    elem.get("confidence", 0)
                    for elem in layout
                    if not elem.get("isLikelyNoise", False)
                ]
                if confidences:
                    raw_confidence = sum(confidences) / len(confidences)
                    page_confidence = normalize_confidence(raw_confidence)
                    print(f"[LlamaParse] Page {index + 1} - Raw confidence: {raw_confidence * 100:.1f}% → Normalized: {page_confidence * 100:.1f}%")
            
            pages.append(ParsedPage(
                page_number=page.get("page", index + 1),
                markdown=page.get("md", ""),
                text=page.get("text", ""),
                layout=layout if layout else None,
                confidence=page_confidence,
            ))
        
        # Calculate overall confidence
        page_confidences = [p.confidence for p in pages if p.confidence is not None]
        overall_confidence: Optional[float] = None
        confidence_stats: Optional[Dict[str, float]] = None
        
        if page_confidences:
            overall_confidence = sum(page_confidences) / len(page_confidences)
            confidence_stats = {
                "min": min(page_confidences),
                "max": max(page_confidences),
                "average": overall_confidence,
            }
            print(f"[LlamaParse] Overall normalized confidence: {overall_confidence * 100:.1f}%")
        else:
            print("[LlamaParse] No confidence data available")
        
        return ParsedDocument(
            markdown=result.get("markdown", "") or "\n\n---\n\n".join(p.markdown for p in pages),
            text=result.get("text", "") or "\n\n".join(p.text for p in pages),
            page_count=result.get("job_metadata", {}).get("job_pages", len(pages)),
            pages=pages,
            overall_confidence=overall_confidence,
            confidence_stats=confidence_stats,
        )


def create_llama_parse_service() -> LlamaParseService:
    """Factory function to create LlamaParse service"""
    return LlamaParseService()
