
import asyncio
import os
import sys
import json
from sqlalchemy import text

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import async_session_maker

async def inspect_extraction():
    print("=== Inspect Extraction Data ===")
    
    async with async_session_maker() as session:
        # Get the resume extraction
        result = await session.execute(text("SELECT id, extracted_data FROM extractions WHERE document_type = 'resume' LIMIT 1"))
        row = result.fetchone()
        
        if not row:
            print("No resume extraction found.")
            return
            
        extraction_id = row[0]
        extracted_data = row[1]
        
        print(f"Extraction ID: {extraction_id}")
        print("Extracted Data Structure:")
        print(json.dumps(extracted_data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(inspect_extraction())
