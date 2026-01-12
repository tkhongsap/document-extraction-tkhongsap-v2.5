"""Fix usage_history table columns"""
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def fix_table():
    async with engine.begin() as conn:
        statements = [
            "ALTER TABLE usage_history ALTER COLUMN plan_type DROP NOT NULL",
            "ALTER TABLE usage_history ALTER COLUMN plan_type SET DEFAULT 'free'",
            "ALTER TABLE usage_history ALTER COLUMN pages_limit DROP NOT NULL",
            "ALTER TABLE usage_history ALTER COLUMN pages_limit SET DEFAULT 100",
            "ALTER TABLE usage_history ALTER COLUMN overage_pages DROP NOT NULL",
            "ALTER TABLE usage_history ALTER COLUMN overage_pages SET DEFAULT 0",
        ]
        
        for stmt in statements:
            try:
                await conn.execute(text(stmt))
                print(f"OK: {stmt[:60]}...")
            except Exception as e:
                print(f"Error: {str(e)[:80]}")
        
        print("Done!")

if __name__ == "__main__":
    asyncio.run(fix_table())
