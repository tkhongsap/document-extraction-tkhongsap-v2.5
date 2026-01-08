"""
FastAPI Application Entry Point
Document AI Extractor Backend
"""
import os
import sys
import io
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager

# Fix Windows console encoding for UTF-8 support (Thai, Chinese, etc.)
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['PYTHONUTF8'] = '1'

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.sessions import SessionMiddleware
import uvicorn

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import get_settings
from app.core.database import async_session_maker
from app.services.storage import StorageService
from app.routes import (
    auth_router,
    documents_router,
    extractions_router,
    docs_with_extractions_router,
    objects_router,
    extract_router,
    user_router,
)


# Background task for cleanup
async def cleanup_old_extractions_task():
    """Background task to cleanup old extractions every 6 hours"""
    while True:
        try:
            await asyncio.sleep(6 * 60 * 60)  # Run every 6 hours
            async with async_session_maker() as db:
                storage = StorageService(db)
                deleted_count = await storage.cleanup_old_extractions()
                if deleted_count > 0:
                    print(f"[Cleanup] Deleted {deleted_count} old extractions (older than 3 days)")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Cleanup] Error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup - keep this fast for health checks!
    settings = get_settings()
    print(f"[FastAPI] Starting server in {settings.node_env} mode")
    print(f"[FastAPI] API key configured: {settings.llama_cloud_api_key[:10]}..." if settings.llama_cloud_api_key else "[FastAPI] WARNING: No API key configured")
    
    # Start background cleanup task (delayed to not block startup)
    async def delayed_cleanup_start():
        # Wait 30 seconds before starting cleanup task to not interfere with startup
        await asyncio.sleep(30)
        await cleanup_old_extractions_task()
    
    cleanup_task = asyncio.create_task(delayed_cleanup_start())
    print("[FastAPI] Scheduled extraction cleanup background task (starts in 30s, runs every 6 hours)")
    
    yield
    
    # Shutdown
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
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
    
    # Log incoming request for debugging
    if request.url.path.startswith("/api/extract"):
        content_type = request.headers.get("content-type", "")
        content_length = request.headers.get("content-length", "0")
        print(f"[DEBUG] Incoming request to {request.url.path}")
        print(f"[DEBUG] Content-Type: {content_type}")
        print(f"[DEBUG] Content-Length: {content_length}")
    
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
app.include_router(docs_with_extractions_router)
app.include_router(objects_router)
app.include_router(extract_router)
app.include_router(user_router)


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
            content,
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
            content,
            media_type=metadata.get("content_type", "application/octet-stream"),
            headers={
                "Cache-Control": "public, max-age=3600",
            }
        )
    except Exception as e:
        print(f"Error serving public object: {e}")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


# Health check endpoint - MUST respond quickly with 200 for deployment
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "document-ai-extractor"}


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
        static_path = Path(__file__).parent.parent.parent / "dist" / "public"
        index_path = static_path / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))
    
    # Fallback: return simple health response
    return {"status": "ok", "message": "Document AI Extractor API"}


# Serve static files in production
if settings.node_env == "production":
    # Static path is relative to workspace root: /workspace/dist/public
    static_path = Path(__file__).parent.parent.parent / "dist" / "public"
    print(f"[FastAPI] Production mode - looking for static files at: {static_path}")
    
    if static_path.exists():
        print(f"[FastAPI] Serving static assets from {static_path}")
        # Mount assets directory
        assets_path = static_path / "assets"
        if assets_path.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")
        
        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            """Serve SPA for all non-API routes"""
            # Don't intercept API routes
            if full_path.startswith("api/") or full_path.startswith("objects/"):
                return JSONResponse(status_code=404, content={"error": "Not found"})
            
            index_path = static_path / "index.html"
            if index_path.exists():
                return FileResponse(str(index_path))
            return JSONResponse(status_code=404, content={"error": "Not found"})
    else:
        print(f"[FastAPI] WARNING: Static path not found at {static_path}")


def main():
    """Main entry point"""
    port = settings.port
    
    print(f"[FastAPI] Starting server on port {port}")
    
    uvicorn.run(
        app,  # Use the app object directly, not string import
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload in all environments for stability
        log_level="info",
    )


if __name__ == "__main__":
    main()
