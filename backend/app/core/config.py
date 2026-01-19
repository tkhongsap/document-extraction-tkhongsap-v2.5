"""
FastAPI Backend Configuration
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database - prioritize environment variables
    database_url: str = "postgresql+asyncpg://docex:docex_password@localhost:5433/docex"
    
    # Session
    session_secret: str = "default-secret-change-me"
    
    # Llama Cloud API
    llama_cloud_api_key: str = ""
    
    # OpenAI API (for embeddings)
    openai_api_key: str = ""
    
    # Object Storage
    private_object_dir: str = "/docextract-storage/private"
    public_object_search_paths: str = "/docextract-storage/public"
    
    # Replit Auth (optional)
    issuer_url: str = "https://replit.com/oidc"
    repl_id: str = ""
    
    # Environment - read from NODE_ENV or default to development
    node_env: str = os.environ.get("NODE_ENV", "development")
    port: int = int(os.environ.get("PORT", "5000"))  # Default to 5000 for Replit deployment
    
    # SMTP Email Settings
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    from_email: str = ""
    from_name: str = "Document AI Extractor"
    
    model_config = {
        "env_file": os.path.join(Path(__file__).parent.parent.parent.parent, ".env"),
        "extra": "ignore",
        "case_sensitive": False
    }

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    # Create an initial settings object to get defaults
    settings = Settings()
    
    # Force loading from environment variables to override defaults
    if os.environ.get("DATABASE_URL"):
        settings.database_url = str(os.environ.get("DATABASE_URL"))
    if os.environ.get("SESSION_SECRET"):
        settings.session_secret = str(os.environ.get("SESSION_SECRET"))
    if os.environ.get("LLAMA_CLOUD_API_KEY"):
        settings.llama_cloud_api_key = str(os.environ.get("LLAMA_CLOUD_API_KEY"))
    if os.environ.get("OPENAI_API_KEY"):
        settings.openai_api_key = str(os.environ.get("OPENAI_API_KEY"))
    if os.environ.get("NODE_ENV"):
        settings.node_env = str(os.environ.get("NODE_ENV"))
    if os.environ.get("PORT"):
        try:
            settings.port = int(str(os.environ.get("PORT")))
        except ValueError:
            pass
            
    return settings
