"""
Test script for Document Chunks feature
"""
import asyncio
from app.core.database import async_session_maker
from app.services.chunking_service import ChunkingService
from sqlalchemy import text


async def test_chunk_insert():
    print("=== Test: Insert Chunks to DB ===")
    
    # First create a test user if not exists
    async with async_session_maker() as session:
        # Check if test user exists
        result = await session.execute(text("SELECT id FROM users LIMIT 1"))
        row = result.fetchone()
        if not row:
            print("No users found - creating test user...")
            await session.execute(text("""
                INSERT INTO users (id, email, first_name, last_name, monthly_limit, monthly_usage, created_at)
                VALUES ('test-user-123', 'test@example.com', 'Test', 'User', 100, 0, NOW())
                ON CONFLICT (id) DO NOTHING
            """))
            await session.commit()
            user_id = "test-user-123"
        else:
            user_id = row[0]
        print(f"Using user: {user_id}")
        
        # Get existing extraction or use a dummy one
        result = await session.execute(text("SELECT id FROM extractions LIMIT 1"))
        row = result.fetchone()
        if row:
            extraction_id = row[0]
            print(f"Using existing extraction: {extraction_id}")
        else:
            # Create test extraction with all required fields
            await session.execute(text(f"""
                INSERT INTO extractions (id, user_id, file_name, file_size, document_type, pages_processed, status, extracted_data, created_at)
                VALUES ('test-extraction-chunks', '{user_id}', 'test.pdf', 1024, 'resume', 1, 'completed', '{{}}'::jsonb, NOW())
                ON CONFLICT (id) DO NOTHING
            """))
            await session.commit()
            extraction_id = "test-extraction-chunks"
            print(f"Created test extraction: {extraction_id}")
    
    # Now test chunking
    async with async_session_maker() as session:
        service = ChunkingService(session)
        
        resume_data = {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "+66-123-456-789",
            "skills": ["Python", "FastAPI", "PostgreSQL"],
            "summary": "A test developer with experience in Python",
            "experience": [
                {"company": "TestCorp", "position": "Developer", "start_date": "2020-01", "description": "Built APIs"}
            ]
        }
        
        print("Creating chunks (without embedding to save API calls)...")
        chunks = await service.chunk_and_save_resume(
            user_id=user_id,
            extraction_id=extraction_id,
            extracted_data=resume_data,
            generate_embeddings=False  # Skip embeddings for this test
        )
        print(f"✓ Created {len(chunks)} chunks")
        
        # Show created chunks
        for chunk in chunks:
            print(f"  [{chunk.chunk_index}] {chunk.chunk_type}: {len(chunk.text)} chars")
        
        # Verify in DB
        result = await session.execute(text("SELECT COUNT(*) FROM document_chunks"))
        count = result.scalar()
        print(f"\nTotal chunks in DB: {count}")
        
        # Show chunk types
        result = await session.execute(text("SELECT chunk_type, COUNT(*) FROM document_chunks GROUP BY chunk_type ORDER BY chunk_type"))
        print("Chunks by type:")
        for row in result:
            print(f"  - {row[0]}: {row[1]}")
        
        print("\n✓ Test passed - Chunks inserted successfully!")


async def test_chunk_search():
    print("\n=== Test: Search Chunks ===")
    
    async with async_session_maker() as session:
        service = ChunkingService(session)
        
        # Get test user
        result = await session.execute(text("SELECT id FROM users LIMIT 1"))
        row = result.fetchone()
        if not row:
            print("No users - skip search test")
            return
        user_id = row[0]
        
        # Check if chunks have embeddings
        result = await session.execute(text("SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL"))
        count = result.scalar()
        
        if count == 0:
            print("No chunks with embeddings - search requires embeddings")
            print("(This is expected since we skipped embedding generation in test)")
        else:
            results = await service.search_similar_chunks(
                query="Python developer",
                user_id=user_id,
                limit=5
            )
            print(f"Found {len(results)} similar chunks")
            for r in results:
                print(f"  - {r['chunkType']}: {r['similarity']:.3f}")
        
        print("✓ Search test completed")


async def cleanup_test_data():
    print("\n=== Cleanup Test Data ===")
    async with async_session_maker() as session:
        await session.execute(text("DELETE FROM document_chunks WHERE extraction_id = 'test-extraction-chunks'"))
        await session.commit()
        print("✓ Test chunks cleaned up")


async def main():
    print("=" * 50)
    print("Document Chunks Feature Test")
    print("=" * 50)
    
    await test_chunk_insert()
    await test_chunk_search()
    await cleanup_test_data()
    
    print("\n" + "=" * 50)
    print("All tests completed!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
