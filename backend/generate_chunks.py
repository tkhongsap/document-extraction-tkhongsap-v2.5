"""
Script to generate chunks for all resumes
Run this from the backend directory with: python generate_chunks.py
"""
import asyncio
import sys
from app.core.database import engine
from app.services.chunking_service import ChunkingService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

async def generate_chunks_for_all():
    """Generate chunks for all resumes that don't have chunks yet"""
    async with AsyncSession(engine) as db:
        # Get all resumes with their data
        result = await db.execute(text("""
            SELECT r.id, r.user_id, r.extraction_id, r.name, r.raw_extracted_data
            FROM resumes r
            WHERE NOT EXISTS (
                SELECT 1 FROM document_chunks dc 
                WHERE dc.extraction_id = r.extraction_id
            )
        """))
        resumes_without_chunks = result.fetchall()
        
        print(f"Found {len(resumes_without_chunks)} resumes without chunks")
        
        if not resumes_without_chunks:
            # Check total chunks
            total_result = await db.execute(text("SELECT COUNT(*) FROM document_chunks"))
            total = total_result.scalar()
            print(f"All resumes have chunks. Total chunks: {total}")
            return
        
        chunking_service = ChunkingService(db)
        total_chunks = 0
        
        for resume_id, user_id, extraction_id, name, raw_data in resumes_without_chunks:
            if not raw_data:
                print(f"Skipping {name}: No raw data")
                continue
                
            try:
                chunks = await chunking_service.chunk_and_save_resume(
                    user_id=user_id,
                    extraction_id=extraction_id,
                    extracted_data=raw_data,
                    document_id=None,
                    generate_embeddings=True
                )
                total_chunks += len(chunks)
                print(f"Generated {len(chunks)} chunks for: {name}")
            except Exception as e:
                print(f"Error for {name}: {e}")
        
        print(f"\nTotal chunks generated: {total_chunks}")
        
        # Final count
        final_result = await db.execute(text("SELECT COUNT(*) FROM document_chunks"))
        final_count = final_result.scalar()
        print(f"Total chunks in database: {final_count}")

if __name__ == "__main__":
    asyncio.run(generate_chunks_for_all())
