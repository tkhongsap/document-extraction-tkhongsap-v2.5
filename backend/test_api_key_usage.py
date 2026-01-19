"""
Test API Key Usage - ทดสอบการใช้งาน API key จริง
"""
import asyncio
import httpx
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

# Import from app
from app.services.api_key_service import ApiKeyService
from app.models.api_key import ApiKey
from app.core.database import Base
from app.core.config import get_settings


async def test_api_key_flow():
    """ทดสอบ flow การสร้างและใช้ API key"""
    
    print("=" * 60)
    print("🔑 TEST API KEY USAGE")
    print("=" * 60)
    
    settings = get_settings()
    
    # Connect to actual database
    engine = create_async_engine(
        settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
        echo=False
    )
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as db:
        service = ApiKeyService(db)
        
        # 1. Generate new API key
        print("\n📝 Step 1: Generate new API key")
        plain_key, key_hashes, prefix = service.generate_api_key()
        
        print(f"   Plain Key: {plain_key}")
        print(f"   Prefix: {prefix}")
        print(f"   Private Key 1 (len): {len(key_hashes['private_key_1'])}")
        print(f"   Public Key 1: {key_hashes['public_key_1'][:16]}...")
        print(f"   Private Key 2: {key_hashes['private_key_2'][:16]}...")
        print(f"   Public Key 2: {key_hashes['public_key_2'][:16]}...")
        
        # 2. Create API key record in database
        print("\n📝 Step 2: Save API key to database")
        
        # First, we need a user_id. For testing, we'll create a temp one or use existing
        from sqlalchemy import text
        result = await db.execute(text("SELECT id FROM users LIMIT 1"))
        user_row = result.fetchone()
        
        if not user_row:
            print("   ⚠️ No users found. Creating test will use mock user_id")
            user_id = str(uuid.uuid4())
        else:
            user_id = user_row[0]
            print(f"   Found user: {user_id[:8]}...")
        
        # Create API key in database
        api_key_record = ApiKey(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name="Test API Key",
            prefix=prefix,
            private_key_1=key_hashes['private_key_1'],
            public_key_1=key_hashes['public_key_1'],
            private_key_2=key_hashes['private_key_2'],
            public_key_2=key_hashes['public_key_2'],
            scopes="read,extract",
            monthly_limit=100,
            monthly_usage=0,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            last_reset_at=datetime.utcnow(),
        )
        
        db.add(api_key_record)
        await db.commit()
        print(f"   ✅ API Key saved with ID: {api_key_record.id[:8]}...")
        
        # 3. Validate API key
        print("\n📝 Step 3: Validate API key")
        validated_key = await service.validate_api_key(plain_key)
        
        if validated_key:
            print(f"   ✅ API Key validated successfully!")
            print(f"   - ID: {validated_key.id[:8]}...")
            print(f"   - Name: {validated_key.name}")
            print(f"   - Scopes: {validated_key.scopes}")
            print(f"   - Monthly Limit: {validated_key.monthly_limit}")
            print(f"   - Monthly Usage: {validated_key.monthly_usage}")
            print(f"   - Is Active: {validated_key.is_active}")
        else:
            print("   ❌ API Key validation FAILED!")
            
        # 4. Test with wrong key
        print("\n📝 Step 4: Test with wrong key")
        wrong_key = "dk_this_is_a_wrong_key_12345678"
        validated_wrong = await service.validate_api_key(wrong_key)
        
        if validated_wrong is None:
            print(f"   ✅ Correctly rejected wrong key")
        else:
            print(f"   ❌ Should have rejected wrong key!")
            
        # 5. Test increment usage
        print("\n📝 Step 5: Test increment usage")
        await service.increment_usage(api_key_record, pages=1)
        await db.refresh(api_key_record)
        print(f"   Usage after increment: {api_key_record.monthly_usage}")
        
        # 6. Cleanup - delete test API key
        print("\n📝 Step 6: Cleanup")
        await db.delete(api_key_record)
        await db.commit()
        print("   ✅ Test API key deleted")
        
    await engine.dispose()
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print(f"\n💡 Your API key format: {plain_key}")
    print("   Use this in X-API-Key header or Authorization: Bearer header")


async def test_api_endpoint():
    """ทดสอบเรียก API endpoint จริงด้วย API key (ต้องมี server รัน)"""
    
    print("\n" + "=" * 60)
    print("🌐 TEST API ENDPOINT (requires running server on port 8000)")
    print("=" * 60)
    
    # ต้องมี API key ที่ถูกสร้างไว้ใน database แล้ว
    # ถ้ายังไม่มี ให้รัน test_api_key_flow() ก่อน แล้วเก็บ key ไว้
    
    # ตัวอย่าง: ถ้าคุณมี API key อยู่แล้ว
    # api_key = "dk_your_actual_key_here"
    
    print("\n⚠️  ถ้าต้องการทดสอบ API endpoint จริง:")
    print("   1. รัน 'npm run dev' ให้ server ทำงาน")
    print("   2. สร้าง API key ผ่าน UI หรือรัน test_api_key_flow()")
    print("   3. ใช้ curl หรือ Postman ทดสอบ:")
    print()
    print("   curl -X GET http://localhost:8000/api/v1/public/extract/status \\")
    print("        -H 'X-API-Key: dk_your_key_here'")


if __name__ == "__main__":
    asyncio.run(test_api_key_flow())
    asyncio.run(test_api_endpoint())
