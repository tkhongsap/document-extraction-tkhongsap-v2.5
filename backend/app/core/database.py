"""
Database connection and session management
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import event
from typing import AsyncGenerator

from .config import get_settings

settings = get_settings()

# Disable SQL echo in production for performance
_enable_echo = settings.node_env == "development"

# Convert postgres:// to postgresql+asyncpg:// for async support
database_url = settings.database_url

# Handle different database types
if database_url.startswith("sqlite"):
    # SQLite - use aiosqlite
    engine = create_async_engine(
        database_url,
        echo=_enable_echo,
        connect_args={"check_same_thread": False},
    )
elif database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(
        database_url,
        echo=_enable_echo,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,  # Check connection health
    )
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(
        database_url,
        echo=_enable_echo,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,  # Check connection health
    )
else:
    # Default - assume PostgreSQL with asyncpg
    engine = create_async_engine(
        database_url,
        echo=_enable_echo,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,  # Check connection health
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
        await conn.run_sync(Base.metadata.create_all)
    
    print(f"[Database] Tables created: {list(Base.metadata.tables.keys())}")
