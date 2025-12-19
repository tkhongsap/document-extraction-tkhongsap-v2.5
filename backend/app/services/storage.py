"""
Storage service for database operations
Equivalent to server/storage.ts
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, timedelta

from app.models.user import User
from app.models.document import Document
from app.models.extraction import Extraction
from app.models.usage_history import UsageHistory
from app.schemas.user import UserCreate
from app.schemas.document import DocumentCreate, DocumentWithExtractions
from app.schemas.extraction import ExtractionCreate, ExtractionResponse


# Extraction retention period (3 days)
EXTRACTION_RETENTION_DAYS = 3


def should_reset_usage(last_reset_at: Optional[datetime]) -> bool:
    """
    Check if monthly usage should be reset.
    Compares last_reset_at to current month/year using UTC.
    """
    if not last_reset_at:
        return True
    
    now = datetime.utcnow()
    last_reset = last_reset_at
    
    # Check if last_reset_at is in a previous calendar month (UTC)
    return (
        last_reset.year < now.year or
        (last_reset.year == now.year and last_reset.month < now.month)
    )


class StorageService:
    """Database storage service"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ============ User Operations ============
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def upsert_user(self, user_data: UserCreate) -> User:
        """Insert or update user"""
        existing = await self.get_user(user_data.id)
        
        if existing:
            # Update existing user
            existing.email = user_data.email
            existing.first_name = user_data.first_name
            existing.last_name = user_data.last_name
            existing.profile_image_url = user_data.profile_image_url
            existing.updated_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(existing)
            return existing
        else:
            # Create new user
            user = User(
                id=user_data.id,
                email=user_data.email,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                profile_image_url=user_data.profile_image_url,
            )
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
            return user
    
    async def update_user_usage(self, user_id: str, pages_used: int) -> None:
        """Update user's monthly usage"""
        user = await self.get_user(user_id)
        if not user:
            raise ValueError("User not found")
        
        user.monthly_usage = user.monthly_usage + pages_used
        await self.db.commit()
    
    async def reset_monthly_usage(self, user_id: str) -> None:
        """Reset user's monthly usage"""
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(monthly_usage=0, last_reset_at=datetime.utcnow())
        )
        await self.db.commit()
    
    async def save_usage_history(
        self, 
        user_id: str, 
        month: str, 
        pages_used: int, 
        tier: str, 
        monthly_limit: int
    ) -> None:
        """Save usage history snapshot"""
        history = UsageHistory(
            user_id=user_id,
            month=month,
            pages_used=pages_used,
            tier=tier,
            monthly_limit=monthly_limit,
        )
        self.db.add(history)
        await self.db.commit()
    
    async def update_user_tier(self, user_id: str, new_tier: str) -> User:
        """Update user's tier without resetting usage"""
        user = await self.get_user(user_id)
        if not user:
            raise ValueError("User not found")
        
        # Define tier limits
        tier_limits = {
            "free": 100,
            "pro": 1000,
            "enterprise": 10000
        }
        
        if new_tier not in tier_limits:
            raise ValueError(f"Invalid tier: {new_tier}. Must be one of: free, pro, enterprise")
        
        # Update tier and limit only - keep existing usage
        user.tier = new_tier
        user.monthly_limit = tier_limits[new_tier]
        # Don't reset monthly_usage - carry over from previous tier
        
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def check_and_reset_if_needed(self, user_id: str) -> User:
        """Check if monthly usage needs reset and perform if needed"""
        user = await self.get_user(user_id)
        if not user:
            raise ValueError("User not found")
        
        if should_reset_usage(user.last_reset_at):
            # Save current usage to history before resetting
            if user.last_reset_at and user.monthly_usage > 0:
                month = f"{user.last_reset_at.year}-{str(user.last_reset_at.month).zfill(2)}"
                await self.save_usage_history(
                    user_id, month, user.monthly_usage, user.tier, user.monthly_limit
                )
            
            # Reset usage
            await self.reset_monthly_usage(user_id)
            return await self.get_user(user_id)
        
        return user
    
    async def update_user_language(self, user_id: str, language: str) -> None:
        """Update user's language preference"""
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(language=language)
        )
        await self.db.commit()
    
    # ============ Document Operations ============
    
    async def create_document(self, document_data: DocumentCreate) -> Document:
        """Create a new document record"""
        document = Document(
            user_id=document_data.user_id,
            file_name=document_data.file_name,
            file_size=document_data.file_size,
            mime_type=document_data.mime_type,
            object_path=document_data.object_path,
        )
        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        return document
    
    async def get_documents_by_user_id(
        self, user_id: str, limit: int = 50
    ) -> List[Document]:
        """Get user's documents"""
        result = await self.db.execute(
            select(Document)
            .where(Document.user_id == user_id)
            .order_by(desc(Document.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_document(self, document_id: str) -> Optional[Document]:
        """Get document by ID"""
        result = await self.db.execute(
            select(Document).where(Document.id == document_id)
        )
        return result.scalar_one_or_none()
    
    # ============ Extraction Operations ============
    
    async def create_extraction(self, extraction_data: ExtractionCreate) -> Extraction:
        """Create a new extraction record"""
        extraction = Extraction(
            user_id=extraction_data.user_id,
            document_id=extraction_data.document_id,
            file_name=extraction_data.file_name,
            file_size=extraction_data.file_size,
            document_type=extraction_data.document_type,
            pages_processed=extraction_data.pages_processed,
            extracted_data=extraction_data.extracted_data,
            status=extraction_data.status,
        )
        self.db.add(extraction)
        await self.db.commit()
        await self.db.refresh(extraction)
        return extraction
    
    async def get_extractions_by_user_id(
        self, user_id: str, limit: int = 50
    ) -> List[Extraction]:
        """Get user's extractions"""
        result = await self.db.execute(
            select(Extraction)
            .where(Extraction.user_id == user_id)
            .order_by(desc(Extraction.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_extraction(self, extraction_id: str) -> Optional[Extraction]:
        """Get extraction by ID"""
        result = await self.db.execute(
            select(Extraction).where(Extraction.id == extraction_id)
        )
        return result.scalar_one_or_none()
    
    async def get_extractions_grouped_by_document(
        self, user_id: str, limit: int = 20
    ) -> List[DocumentWithExtractions]:
        """Get extractions grouped by document filename"""
        # Get all extractions for the user
        result = await self.db.execute(
            select(Extraction)
            .where(Extraction.user_id == user_id)
            .order_by(desc(Extraction.created_at))
        )
        all_extractions = list(result.scalars().all())
        
        # Group by filename
        grouped: dict[str, List[Extraction]] = {}
        for extraction in all_extractions:
            key = extraction.file_name
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(extraction)
        
        # Convert to DocumentWithExtractions format
        documents: List[DocumentWithExtractions] = []
        count = 0
        
        for file_name, extractions in grouped.items():
            if count >= limit:
                break
            
            # Sort by created_at descending
            sorted_extractions = sorted(
                extractions, 
                key=lambda x: x.created_at, 
                reverse=True
            )
            
            latest = sorted_extractions[0]
            
            documents.append(DocumentWithExtractions(
                file_name=file_name,
                file_size=latest.file_size,
                document_type=latest.document_type,
                extractions=[
                    ExtractionResponse.model_validate(e) for e in sorted_extractions
                ],
                latest_extraction=ExtractionResponse.model_validate(latest),
                total_extractions=len(sorted_extractions),
            ))
            count += 1
        
        return documents
    
    async def cleanup_old_extractions(self) -> int:
        """Delete extractions older than retention period (3 days)"""
        cutoff_date = datetime.utcnow() - timedelta(days=EXTRACTION_RETENTION_DAYS)
        
        # Count before delete for logging
        count_result = await self.db.execute(
            select(Extraction).where(Extraction.created_at < cutoff_date)
        )
        old_extractions = list(count_result.scalars().all())
        count = len(old_extractions)
        
        if count > 0:
            # Delete old extractions
            await self.db.execute(
                delete(Extraction).where(Extraction.created_at < cutoff_date)
            )
            await self.db.commit()
        
        return count
