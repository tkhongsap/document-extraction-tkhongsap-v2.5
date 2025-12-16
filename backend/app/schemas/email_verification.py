"""
Email Verification Schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class EmailVerificationRequest(BaseModel):
    email: EmailStr


class EmailVerificationResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None


class VerifyTokenRequest(BaseModel):
    token: str


class VerifyTokenResponse(BaseModel):
    success: bool
    message: str
    email: Optional[str] = None
    user_id: Optional[str] = None


class ResendVerificationRequest(BaseModel):
    email: EmailStr