"""Reset monthly usage for admin user"""
import asyncio
from sqlalchemy import text
from app.core.database import async_session_maker

async def reset():
    async with async_session_maker() as db:
        await db.execute(text("UPDATE users SET monthly_usage = 0 WHERE email = 'admin@docextract.com'"))
        await db.commit()
        print("✅ Monthly usage reset to 0 for admin@docextract.com")

if __name__ == "__main__":
    asyncio.run(reset())
