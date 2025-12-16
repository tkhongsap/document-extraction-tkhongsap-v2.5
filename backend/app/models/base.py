"""
Base model utilities
"""
import uuid
from datetime import datetime
from app.core.database import Base


def generate_uuid() -> str:
    """Generate a new UUID string"""
    return str(uuid.uuid4())
