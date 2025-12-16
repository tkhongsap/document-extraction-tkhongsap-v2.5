"""
Session Model - Required for Replit Auth
"""
from sqlalchemy import Column, String, DateTime, Index, JSON

from app.core.database import Base


class Session(Base):
    """Session storage table (required for Replit Auth)"""
    __tablename__ = "sessions"
    
    sid = Column(String, primary_key=True)
    sess = Column(JSON, nullable=False)
    expire = Column(DateTime, nullable=False)
    
    __table_args__ = (
        Index("IDX_session_expire", expire),
    )
