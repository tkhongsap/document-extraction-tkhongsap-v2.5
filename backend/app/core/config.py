"""
FastAPI Backend Configuration
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "")
    
    # Session
    session_secret: str = os.getenv("SESSION_SECRET", "default-secret-change-me")
    
    # Llama Cloud API
    llama_cloud_api_key: str = os.getenv("LLAMA_CLOUD_API_KEY", "")
    
    # OpenAI API (for embeddings)
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    
    # Object Storage
    private_object_dir: str = os.getenv("PRIVATE_OBJECT_DIR", "")
    public_object_search_paths: str = os.getenv("PUBLIC_OBJECT_SEARCH_PATHS", "")
    
    # Replit Auth (optional)
    issuer_url: str = "https://replit.com/oidc"
    repl_id: str = os.getenv("REPL_ID", "")
    
    # Environment
    node_env: str = os.getenv("NODE_ENV", "development")
    port: int = 8000
    
    # SMTP Email Settings
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    from_email: str = ""
    from_name: str = "Document AI Extractor"
    
    class Config:
        # Look for .env in the project root directory (parent of backend)
        # Path: backend/app/core/config.py -> ../../.. = project root
        env_file = os.path.join(Path(__file__).parent.parent.parent.parent, ".env")
        case_sensitive = False
        extra = "ignore"  # Allow extra fields in .env file


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
