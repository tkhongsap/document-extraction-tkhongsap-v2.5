"""
Database connection and session management
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import event
from typing import AsyncGenerator
import os

from .config import get_settings

settings = get_settings()

# Disable SQL echo in production for performance
_enable_echo = settings.node_env == "development"

# Get database URL and ensure async driver is used
# ALWAYS prioritize os.environ.get("DATABASE_URL")
database_url = os.environ.get("DATABASE_URL")

# Check if it's the default local one and try to find a better one if available
if not database_url or "localhost:5433" in database_url:
    # Look for other PG environment variables that might contain the real URL
    replit_db_url = os.environ.get("DATABASE_URL")
    if replit_db_url and "localhost:5433" not in replit_db_url:
         database_url = replit_db_url
    else:
         database_url = settings.database_url

if not database_url:
    # Fallback to a last resort if everything else fails
    database_url = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"

# Ensure async driver is used
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Handle different database types
if database_url.startswith("sqlite"):
    # SQLite - use aiosqlite
    engine = create_async_engine(
        database_url,
        echo=_enable_echo,
        connect_args={"check_same_thread": False},
    )
else:
    # PostgreSQL with asyncpg
    # Always require SSL for external connections (non-localhost)
    if "sslmode=" not in database_url and "localhost" not in database_url:
        if "?" in database_url:
            database_url += "&sslmode=require"
        else:
            database_url += "?sslmode=require"
    
    sanitized_url = database_url.split('@')[-1] if '@' in database_url else database_url
    print(f"[Database] Connecting to: {sanitized_url}")

    engine = create_async_engine(
        database_url,
        echo=_enable_echo,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base class for models
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    # Import all models to register them with Base
    from app.models import User, Document, Extraction
    
    async with engine.begin() as conn:
        # Check if pgvector extension is needed and available
        # This app uses vector search based on LLamaCloud
        await conn.run_sync(Base.metadata.create_all)
    
    print(f"[Database] Tables created: {list(Base.metadata.tables.keys())}")
