"""
Authentication Schemas
"""
from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    """Login request with username and password"""
    username: str
    password: str


class LoginResponse(BaseModel):
    """Login response"""
    success: bool
    message: str
    user: Optional["UserResponse"] = None


# Import for type reference
from app.schemas.user import UserResponse
LoginResponse.model_rebuild()
