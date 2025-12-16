"""
Common Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional


class UploadURLResponse(BaseModel):
    upload_url: str = Field(alias="uploadURL")
    
    class Config:
        populate_by_name = True


class ErrorResponse(BaseModel):
    message: str
    type: Optional[str] = None


class AuthCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None


class MockLoginResponse(BaseModel):
    user: "UserResponse"


# Import for type reference
from .user import UserResponse
MockLoginResponse.model_rebuild()
