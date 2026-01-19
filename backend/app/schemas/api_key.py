"""
API Key Schemas
Pydantic models for API key request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============================================================================
# Request Schemas
# ============================================================================

class ApiKeyCreate(BaseModel):
    """Request schema for creating a new API key"""
    name: str = Field(..., min_length=1, max_length=255, description="Friendly name for the key")
    monthly_limit: int = Field(default=1000, ge=1, le=100000, description="Monthly usage limit")
    scopes: Optional[str] = Field(default="extract,read", description="Comma-separated permissions")
    expires_at: Optional[datetime] = Field(default=None, description="Optional expiration date")


class ApiKeyUpdate(BaseModel):
    """Request schema for updating an API key"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="New name")
    monthly_limit: Optional[int] = Field(None, ge=1, le=100000, description="New monthly limit")
    scopes: Optional[str] = Field(None, description="New scopes")
    is_active: Optional[bool] = Field(None, description="Active status")
    expires_at: Optional[datetime] = Field(None, description="New expiration date")


# ============================================================================
# Response Schemas
# ============================================================================

class ApiKeyResponse(BaseModel):
    """Response schema for API key (without sensitive data)"""
    id: str
    user_id: str = Field(alias="userId")
    name: str
    prefix: str  # First 8 chars for identification
    monthly_limit: int = Field(alias="monthlyLimit")
    monthly_usage: int = Field(alias="monthlyUsage")
    is_active: bool = Field(alias="isActive")
    scopes: List[str]  # Converted from comma-separated string
    expires_at: Optional[datetime] = Field(alias="expiresAt")
    last_used_at: Optional[datetime] = Field(alias="lastUsedAt")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    
    class Config:
        populate_by_name = True
        from_attributes = True
        by_alias = True
    
    @classmethod
    def from_model(cls, api_key) -> "ApiKeyResponse":
        """Create response from ApiKey model"""
        return cls(
            id=api_key.id,
            userId=api_key.user_id,
            name=api_key.name,
            prefix=api_key.prefix,
            monthlyLimit=api_key.monthly_limit,
            monthlyUsage=api_key.monthly_usage,
            isActive=api_key.is_active,
            scopes=api_key.scopes.split(",") if api_key.scopes else [],
            expiresAt=api_key.expires_at,
            lastUsedAt=api_key.last_used_at,
            createdAt=api_key.created_at,
            updatedAt=api_key.updated_at,
        )


class ApiKeyCreateResponse(BaseModel):
    """Response schema for newly created API key (includes plain key)"""
    success: bool = True
    message: str = "API key created successfully"
    api_key: ApiKeyResponse = Field(alias="apiKey")
    plain_key: str = Field(alias="plainKey", description="⚠️ Store this key securely! It will not be shown again.")
    
    class Config:
        populate_by_name = True
        by_alias = True


class ApiKeyListResponse(BaseModel):
    """Response schema for listing API keys"""
    success: bool = True
    api_keys: List[ApiKeyResponse] = Field(alias="apiKeys")
    total: int
    
    class Config:
        populate_by_name = True
        by_alias = True


class ApiKeyDeleteResponse(BaseModel):
    """Response schema for deleting an API key"""
    success: bool = True
    message: str = "API key deleted successfully"


class ApiKeyRegenerateResponse(BaseModel):
    """Response schema for regenerating an API key"""
    success: bool = True
    message: str = "API key regenerated successfully"
    api_key: ApiKeyResponse = Field(alias="apiKey")
    plain_key: str = Field(alias="plainKey", description="⚠️ Store this key securely! It will not be shown again.")
    
    class Config:
        populate_by_name = True
        by_alias = True


class ApiKeyUsageStatsResponse(BaseModel):
    """Response schema for API key usage statistics"""
    success: bool = True
    stats: dict
    
    class Config:
        populate_by_name = True
