"""
API Routes
"""
from .auth import router as auth_router
from .user import router as user_router
from .documents import router as documents_router
from .extractions import router as extractions_router
from .extractions import docs_with_extractions_router
from .extract import router as extract_router
from .objects import router as objects_router
from .search import router as search_router
from .chunks import router as chunks_router
<<<<<<< HEAD
=======
from .api_keys import router as api_keys_router
from .public_extract import router as public_extract_router
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd


__all__ = [
    "auth_router",
    "user_router",
    "documents_router",
    "extractions_router",
    "docs_with_extractions_router",
    "extract_router",
    "objects_router",
    "search_router",
    "chunks_router",
<<<<<<< HEAD
    "chunks_router",
=======
    "api_keys_router",
    "public_extract_router",
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
]
