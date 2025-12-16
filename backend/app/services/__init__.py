"""
Business Logic Services
"""
from .storage import StorageService

# Object storage - optional (requires google-cloud-storage)
try:
    from .object_storage import (
        ObjectStorageService, 
        ObjectPermission, 
        ObjectAclPolicy, 
        ObjectNotFoundError
    )
except ImportError:
    # Dummy classes for when GCS is not available
    ObjectStorageService = None
    ObjectPermission = None
    ObjectAclPolicy = None
    ObjectNotFoundError = Exception

from .llama_parse import (
    LlamaParseService, 
    LlamaParseError,
    create_llama_parse_service,
    ParsedDocument,
    ParsedPage,
)
from .llama_extract import (
    LlamaExtractService,
    LlamaExtractError, 
    create_llama_extract_service,
    TemplateExtractionResult,
    ExtractedField,
)

__all__ = [
    # Storage
    "StorageService",
    # Object Storage
    "ObjectStorageService",
    "ObjectPermission",
    "ObjectAclPolicy",
    "ObjectNotFoundError",
    # LlamaParse
    "LlamaParseService",
    "LlamaParseError",
    "create_llama_parse_service",
    "ParsedDocument",
    "ParsedPage",
    # LlamaExtract
    "LlamaExtractService",
    "LlamaExtractError",
    "create_llama_extract_service",
    "TemplateExtractionResult",
    "ExtractedField",
]
