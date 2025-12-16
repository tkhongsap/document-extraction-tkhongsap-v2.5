"""
FastAPI Backend Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str
    
    # Session
    session_secret: str
    
    # Llama Cloud API
    llama_cloud_api_key: str
    
    # Object Storage
    private_object_dir: str = ""
    public_object_search_paths: str = ""
    
    # Replit Auth (optional)
    issuer_url: str = "https://replit.com/oidc"
    repl_id: str = ""
    
    # Environment
    node_env: str = "development"
    port: int = 5000
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
