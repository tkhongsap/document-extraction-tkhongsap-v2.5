"""
FastAPI Application Entry Point
Document AI Extractor Backend
"""
import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.sessions import SessionMiddleware
import uvicorn

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import get_settings
from app.core.database import init_db
from app.routes import (
    auth_router,
    documents_router,
    extractions_router,
    objects_router,
    extract_router,
    user_router,
    search_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events - keep fast for health checks!"""
    # Startup - minimal work here to pass health check quickly
    settings = get_settings()
    print(f"[FastAPI] Starting server in {settings.node_env} mode")
    print(f"[FastAPI] API key configured: {settings.llama_cloud_api_key[:10]}..." if settings.llama_cloud_api_key else "[FastAPI] WARNING: No API key configured")
    
    # Don't initialize database here - do it lazily on first request
    # This ensures health check passes immediately
    print("[FastAPI] Server ready (database will init on first request)")
    
    yield
    
    # Shutdown
    print("[FastAPI] Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Document AI Extractor API",
    description="API for extracting structured data from documents using LlamaCloud",
    version="2.5.0",
    lifespan=lifespan,
)

# Get settings
settings = get_settings()

# Add session middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie="session",
    max_age=7 * 24 * 60 * 60,  # 1 week
    same_site="lax" if settings.node_env != "production" else "none",
    https_only=settings.node_env == "production",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.node_env != "production" else [
        "https://*.replit.app",
        "https://*.replit.dev",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log API requests"""
    import time
    from datetime import datetime
    
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    if request.url.path.startswith("/api"):
        timestamp = datetime.now().strftime("%I:%M:%S %p")
        print(f"{timestamp} [fastapi] {request.method} {request.url.path} {response.status_code} in {int(duration * 1000)}ms")
    
    return response


# Include routers
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(extractions_router)
app.include_router(objects_router)
app.include_router(extract_router)
app.include_router(user_router)
app.include_router(search_router)


# Object storage routes for serving files
@app.get("/objects/{object_path:path}")
async def serve_private_object(object_path: str, request: Request):
    """Serve private objects with ACL check"""
    from app.core.auth import get_current_user_id
    from app.services.object_storage import ObjectStorageService, ObjectPermission, ObjectNotFoundError
    
    user_id = await get_current_user_id(request)
    
    if not user_id:
        return JSONResponse(status_code=401, content={"message": "Unauthorized"})
    
    try:
        object_storage = ObjectStorageService()
        blob = await object_storage.get_object_entity_file(f"/objects/{object_path}")
        
        can_access = await object_storage.can_access_object_entity(
            blob,
            user_id,
            ObjectPermission.READ,
        )
        
        if not can_access:
            return JSONResponse(status_code=401, content={"message": "Access denied"})
        
        # Get metadata and stream content
        metadata = object_storage.get_object_metadata(blob)
        content = object_storage.download_object(blob)
        
        return FileResponse(
            str(content),
            media_type=metadata.get("content_type", "application/octet-stream"),
            headers={
                "Cache-Control": "private, max-age=3600",
            }
        )
    except ObjectNotFoundError:
        return JSONResponse(status_code=404, content={"message": "Object not found"})
    except Exception as e:
        print(f"Error serving object: {e}")
        return JSONResponse(status_code=500, content={"message": "Internal server error"})


@app.get("/public-objects/{file_path:path}")
async def serve_public_object(file_path: str):
    """Serve public objects"""
    from app.services.object_storage import ObjectStorageService
    
    try:
        object_storage = ObjectStorageService()
        blob = await object_storage.search_public_object(file_path)
        
        if not blob:
            return JSONResponse(status_code=404, content={"error": "File not found"})
        
        metadata = object_storage.get_object_metadata(blob)
        content = object_storage.download_object(blob)
        
        return FileResponse(
            str(content),
            media_type=metadata.get("content_type", "application/octet-stream"),
            headers={
                "Cache-Control": "public, max-age=3600",
            }
        )
    except Exception as e:
        print(f"Error serving public object: {e}")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


# Root health check for deployment (responds immediately with 200)
@app.get("/")
async def root_health(request: Request):
    """Root endpoint - serves SPA in browser, returns health status for health checks"""
    # Check if this is a browser request (Accept: text/html) vs health check
    accept_header = request.headers.get("accept", "")
    
    # For health checks (non-browser requests), return 200 immediately
    if "text/html" not in accept_header:
        return {"status": "ok", "message": "Document AI Extractor API"}
    
    # For browser requests in production, serve the SPA
    if settings.node_env == "production":
        possible_paths = [
            Path(__file__).parent.parent / "dist" / "public",
            Path(__file__).parent / "dist" / "public",
            Path("/home/runner/workspace/dist/public"),
        ]
        
        for sp in possible_paths:
            index_path = sp / "index.html"
            if index_path.exists():
                return FileResponse(str(index_path))
    
    # Fallback: return simple health response
    return {"status": "ok", "message": "Document AI Extractor API"}


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "document-ai-extractor"}


# Helper function to find static directory
def get_static_path():
    """Find the static files directory"""
    possible_paths = [
        Path(__file__).parent.parent / "dist" / "public",  # /workspace/dist/public
        Path(__file__).parent / "dist" / "public",  # /workspace/backend/dist/public
        Path("/home/runner/workspace/dist/public"),  # Absolute path for Replit
    ]
    
    for path in possible_paths:
        if path.exists() and (path / "index.html").exists():
            print(f"[FastAPI] Found static files at: {path}")
            return path
    
    print(f"[FastAPI] Static files not found. Tried: {possible_paths}")
    return None


# Serve static files in production mode only
if settings.node_env == "production":
    static_path = get_static_path()
    
    if static_path and static_path.exists():
        # Mount assets directory
        assets_path = static_path / "assets"
        if assets_path.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")
            print(f"[FastAPI] Mounted /assets from {assets_path}")
        
        # Serve static files (favicon, opengraph, etc.)
        @app.get("/favicon.png")
        async def serve_favicon():
            favicon_path = static_path / "favicon.png"
            if favicon_path.exists():
                return FileResponse(str(favicon_path))
            return JSONResponse(status_code=404, content={"error": "Not found"})
        
        @app.get("/opengraph.jpg")
        async def serve_opengraph():
            og_path = static_path / "opengraph.jpg"
            if og_path.exists():
                return FileResponse(str(og_path), media_type="image/jpeg")
            return JSONResponse(status_code=404, content={"error": "Not found"})
        
        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            """Serve SPA for all non-API routes"""
            # Skip API routes and object routes
            if full_path.startswith("api/") or full_path.startswith("objects/") or full_path.startswith("public-objects/"):
                return JSONResponse(status_code=404, content={"error": "Not found"})
            
            # Try to serve the exact file first
            file_path = static_path / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))
            
            # Fallback to index.html for SPA routing
            index_path = static_path / "index.html"
            if index_path.exists():
                return FileResponse(str(index_path))
            return JSONResponse(status_code=404, content={"error": "Not found"})
    else:
        print(f"[FastAPI] WARNING: Static files not found for production mode.")


def main():
    """Main entry point"""
    port = settings.port  # Use port from settings (default 5000)
    
    print(f"[FastAPI] Starting server on port {port}")
    
    uvicorn.run(
        app,  # Use the app object directly
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload for stability
        log_level="info",
    )


if __name__ == "__main__":
    main()
