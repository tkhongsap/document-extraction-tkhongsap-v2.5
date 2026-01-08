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

# Get database URL - try multiple approaches
database_url = os.environ.get("DATABASE_URL", "")

# If DATABASE_URL is empty or just whitespace, construct from PG* variables
if not database_url or not database_url.strip():
    pg_host = os.environ.get("PGHOST")
    pg_port = os.environ.get("PGPORT", "5432")
    pg_user = os.environ.get("PGUSER")
    pg_password = os.environ.get("PGPASSWORD")
    pg_database = os.environ.get("PGDATABASE")
    
    if pg_host and pg_user and pg_password and pg_database:
        database_url = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
        print(f"[Database] Constructed URL from PG* variables")
    else:
        # Fallback to settings
        database_url = settings.database_url

# Ensure async driver is used
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgresql://") and "+asyncpg" not in database_url:
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
    # asyncpg doesn't support sslmode in URL - need to handle it separately
    from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
    
    parsed = urlparse(database_url)
    query_params = parse_qs(parsed.query)
    
    # Extract sslmode and remove it from URL (asyncpg doesn't support it as URL param)
    ssl_mode = query_params.pop('sslmode', ['disable'])[0] if 'sslmode' in query_params else None
    
    # Rebuild URL without sslmode
    new_query = urlencode(query_params, doseq=True)
    database_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment
    ))
    
    # Determine SSL configuration for asyncpg
    connect_args = {}
    if ssl_mode == 'disable':
        connect_args['ssl'] = False
    elif ssl_mode in ('require', 'prefer', 'verify-ca', 'verify-full'):
        import ssl
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args['ssl'] = ssl_context
    elif ssl_mode is None:
        # Default: require SSL for external connections (non-localhost)
        if "localhost" not in database_url and "helium" not in database_url:
            import ssl
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            connect_args['ssl'] = ssl_context
    
    sanitized_url = database_url.split('@')[-1] if '@' in database_url else database_url
    print(f"[Database] Connecting to: {sanitized_url}")

    engine = create_async_engine(
        database_url,
        echo=_enable_echo,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        connect_args=connect_args,
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
    from sqlalchemy import text
    
    async with engine.begin() as conn:
        # Enable pgvector extension for vector embeddings
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        print("[Database] pgvector extension enabled")
        
        await conn.run_sync(Base.metadata.create_all)
    
    print(f"[Database] Tables created: {list(Base.metadata.tables.keys())}")
