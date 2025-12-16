"""
User Schemas
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None


class UserCreate(UserBase):
    id: str


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    
    @field_validator('first_name', 'last_name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError('Name cannot be empty')
        if len(v.strip()) > 50:
            raise ValueError('Name cannot be longer than 50 characters')
        return v.strip()


class UserResponse(UserBase):
    id: str
    tier: str
    monthly_usage: int
    monthly_limit: int
    language: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    language: Optional[str] = None
