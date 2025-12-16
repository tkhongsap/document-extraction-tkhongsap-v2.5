"""
API Routes
"""
from .auth import router as auth_router
from .user import router as user_router
from .documents import router as documents_router
from .extractions import router as extractions_router
from .extract import router as extract_router
from .objects import router as objects_router

__all__ = [
    "auth_router",
    "user_router",
    "documents_router",
    "extractions_router",
    "extract_router",
    "objects_router",
]
