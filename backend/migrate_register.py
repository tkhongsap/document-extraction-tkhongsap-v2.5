"""
Database migration to add password and email verification fields
"""
from sqlalchemy import text
from app.core.database import get_db
import asyncio


async def migrate_database():
    """Add new columns to users table for registration functionality"""
    
    async def run_migration():
        async for db in get_db():
            try:
                # Add password_hash column
                await db.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS password_hash VARCHAR;
                """))
                
                # Add email_verified column
                await db.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
                """))
                
                # Create email_verifications table
                await db.execute(text("""
                    CREATE TABLE IF NOT EXISTS email_verifications (
                        id VARCHAR PRIMARY KEY,
                        email VARCHAR NOT NULL,
                        token VARCHAR NOT NULL UNIQUE,
                        user_id VARCHAR,
                        expires_at TIMESTAMP NOT NULL,
                        verified BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                
                # Create index for faster lookups
                await db.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_email_verifications_token 
                    ON email_verifications(token);
                """))
                
                await db.commit()
                print("✅ Database migration completed successfully")
                break
                
            except Exception as e:
                print(f"❌ Migration error: {e}")
                await db.rollback()
                raise
    
    await run_migration()


if __name__ == "__main__":
    asyncio.run(migrate_database())