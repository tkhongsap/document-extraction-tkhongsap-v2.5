"""
Document AI Extractor - FastAPI Application Package
"""
from app.core import get_settings, get_db, init_db
from app.routes import (
    auth_router, 
    user_router, 
    documents_router, 
    extractions_router,
    extract_router,
    objects_router,
)

__all__ = [
    # Core
    "get_settings",
    "get_db",
    "init_db",
    # Routers
    "auth_router",
    "user_router",
    "documents_router",
    "extractions_router",
    "extract_router",
    "objects_router",
]
