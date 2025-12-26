"""
Script to clean up duplicate resumes based on email.
Keeps the most recently updated resume for each unique email per user.
"""
import asyncio
import os
import sys
from sqlalchemy import text, select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add parent to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.resume import Resume

async def cleanup_duplicates():
    # Get database URL from environment
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is not set")
        return
    
    # Convert to async URL if needed
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    
    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Find all duplicate emails (grouped by user_id and email)
        dup_query = """
            SELECT user_id, email, COUNT(*) as count, array_agg(id ORDER BY updated_at DESC) as ids
            FROM resumes
            WHERE email IS NOT NULL AND email != ''
            GROUP BY user_id, email
            HAVING COUNT(*) > 1
        """
        result = await session.execute(text(dup_query))
        duplicates = result.fetchall()
        
        if not duplicates:
            print("No duplicate resumes found!")
            return
        
        print(f"Found {len(duplicates)} groups of duplicate resumes:")
        
        total_deleted = 0
        for user_id, email, count, ids in duplicates:
            print(f"\n  Email: {email}")
            print(f"  User ID: {user_id}")
            print(f"  Count: {count}")
            print(f"  IDs: {ids}")
            
            # Keep the first ID (most recently updated), delete the rest
            keep_id = ids[0]
            delete_ids = ids[1:]
            
            print(f"  Keeping ID: {keep_id}")
            print(f"  Deleting IDs: {delete_ids}")
            
            # Delete duplicates
            delete_query = text("DELETE FROM resumes WHERE id = ANY(:ids)")
            await session.execute(delete_query, {"ids": delete_ids})
            total_deleted += len(delete_ids)
        
        await session.commit()
        print(f"\n✅ Deleted {total_deleted} duplicate resumes!")

if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
