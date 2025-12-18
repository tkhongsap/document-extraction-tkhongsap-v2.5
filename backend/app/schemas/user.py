"""
User Schemas
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = Field(default=None, alias="firstName", serialization_alias="firstName")
    last_name: Optional[str] = Field(default=None, alias="lastName", serialization_alias="lastName")
    profile_image_url: Optional[str] = Field(default=None, alias="profileImageUrl", serialization_alias="profileImageUrl")


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
    monthly_usage: int = Field(alias="monthlyUsage", serialization_alias="monthlyUsage")
    monthly_limit: int = Field(alias="monthlyLimit", serialization_alias="monthlyLimit")
    language: str
    created_at: Optional[datetime] = Field(default=None, alias="createdAt", serialization_alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt", serialization_alias="updatedAt")
    
    class Config:
        from_attributes = True
        populate_by_name = True


class UserUpdate(BaseModel):
    language: Optional[str] = None
