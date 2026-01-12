"""
Test 2-Tier API Key Hashing System
Tests the security of the new 2-tier API key hashing implementation.
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, Index
from sqlalchemy.orm import declarative_base
from datetime import datetime, timedelta

from app.services.api_key_service import ApiKeyService


# Test database URL (use in-memory SQLite for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create a minimal Base for testing (isolated from main app)
TestBase = declarative_base()


class TestApiKey(TestBase):
    """Minimal ApiKey model for testing"""
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True)
    user_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    prefix = Column(String(8), nullable=False)  # Required by service
    
    # Legacy hashing (backward compatibility)
    hashed_key = Column(String(64), nullable=True)
    
    # 2-tier hashing (new security system)
    private_key_1 = Column(Text, nullable=True)  # Most secure
    public_key_1 = Column(String(64), nullable=True)
    private_key_2 = Column(String(64), nullable=True)  # For verification
    public_key_2 = Column(String(64), nullable=True)  # For display
    
    scopes = Column(Text, nullable=False, default="read")
    
    # Required by ApiKeyService
    monthly_limit = Column(Integer, nullable=False, default=1000)
    monthly_usage = Column(Integer, nullable=False, default=0)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    last_reset_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index('idx_api_keys_hashed_key', 'hashed_key'),
        Index('idx_api_keys_private_key_2', 'private_key_2'),
        Index('idx_api_keys_public_key_2', 'public_key_2'),
    )
    
    def is_valid(self) -> bool:
        """Check if API key is valid (active and not expired)"""
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False
        return True


@pytest_asyncio.fixture
async def db_engine():
    """Create test database engine"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    # Create tables using TestBase
    async with engine.begin() as conn:
        await conn.run_sync(TestBase.metadata.create_all)
    
    yield engine
    
    # Cleanup
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    """Create test database session"""
    async_session = sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        # Monkey patch ApiKey to use TestApiKey
        import app.models.api_key
        original_api_key = app.models.api_key.ApiKey
        app.models.api_key.ApiKey = TestApiKey
        
        yield session
        
        # Restore original
        app.models.api_key.ApiKey = original_api_key


@pytest_asyncio.fixture
async def api_key_service(db_session, monkeypatch):
    """Create ApiKeyService instance with test secrets"""
    # Set test secrets for 2-tier hashing
    monkeypatch.setenv("API_KEY_SECRET_TIER_1", "test-tier1-secret-super-secure-key")
    monkeypatch.setenv("API_KEY_SECRET_TIER_2", "test-tier2-secret-verification-key")
    
    # Reload config to pick up new env vars
    from app.core import config
    import importlib
    importlib.reload(config)
    
    service = ApiKeyService(db_session)
    # Force reload secrets in service
    service._SECRET_TIER_1 = "test-tier1-secret-super-secure-key"
    service._SECRET_TIER_2 = "test-tier2-secret-verification-key"
    
    return service


class TestTwoTierApiKeyHashing:
    """Test 2-tier API key hashing system"""
    
    @pytest.mark.asyncio
    async def test_derive_two_tier_keys(self, api_key_service):
        """Test 2-tier key derivation produces expected structure"""
        plain_key = "dk_test_key_12345678901234567890"
        
        keys = api_key_service.derive_two_tier_keys(plain_key)
        
        # Check all keys are present
        assert "private_key_1" in keys
        assert "public_key_1" in keys
        assert "private_key_2" in keys
        assert "public_key_2" in keys
        
        # Check all keys are 64-char hex strings (SHA256)
        assert len(keys["private_key_1"]) == 64
        assert len(keys["public_key_1"]) == 64
        assert len(keys["private_key_2"]) == 64
        assert len(keys["public_key_2"]) == 64
        
        # Check all keys are unique
        key_values = list(keys.values())
        assert len(key_values) == len(set(key_values))
    
    @pytest.mark.asyncio
    async def test_derive_two_tier_keys_deterministic(self, api_key_service):
        """Test that same input always produces same output"""
        plain_key = "dk_test_key_deterministic"
        
        keys1 = api_key_service.derive_two_tier_keys(plain_key)
        keys2 = api_key_service.derive_two_tier_keys(plain_key)
        
        assert keys1["private_key_1"] == keys2["private_key_1"]
        assert keys1["public_key_1"] == keys2["public_key_1"]
        assert keys1["private_key_2"] == keys2["private_key_2"]
        assert keys1["public_key_2"] == keys2["public_key_2"]
    
    @pytest.mark.asyncio
    async def test_derive_two_tier_keys_unique_per_input(self, api_key_service):
        """Test that different inputs produce different outputs"""
        plain_key1 = "dk_test_key_unique_1"
        plain_key2 = "dk_test_key_unique_2"
        
        keys1 = api_key_service.derive_two_tier_keys(plain_key1)
        keys2 = api_key_service.derive_two_tier_keys(plain_key2)
        
        # All derived keys should be different
        assert keys1["private_key_1"] != keys2["private_key_1"]
        assert keys1["public_key_1"] != keys2["public_key_1"]
        assert keys1["private_key_2"] != keys2["private_key_2"]
        assert keys1["public_key_2"] != keys2["public_key_2"]
    
    @pytest.mark.asyncio
    async def test_create_api_key_stores_two_tier_keys(self, api_key_service, db_session):
        """Test that created API key contains all 2-tier keys"""
        user_id = 1
        key_data = await api_key_service.create_api_key(
            user_id=user_id,
            name="Test 2-Tier Key",
            scopes="read,write"  # String, not list
        )
        
        # Get returned data - key_data is tuple (api_key, plain_key)
        api_key, plain_key = key_data
        
        # Check returned data contains plain key
        assert plain_key is not None
        assert plain_key.startswith("dk_")
        
        # Check key object in database
        assert api_key.private_key_1 is not None
        assert api_key.public_key_1 is not None
        assert api_key.private_key_2 is not None
        assert api_key.public_key_2 is not None
        
        # Check all are 64-char hex strings
        assert len(api_key.private_key_1) == 64
        assert len(api_key.public_key_1) == 64
        assert len(api_key.private_key_2) == 64
        assert len(api_key.public_key_2) == 64
        
        # Check they're all unique
        keys = [
            api_key.private_key_1,
            api_key.public_key_1,
            api_key.private_key_2,
            api_key.public_key_2
        ]
        assert len(keys) == len(set(keys))
    
    @pytest.mark.asyncio
    async def test_validate_api_key_with_two_tier_system(self, api_key_service, db_session):
        """Test API key validation using 2-tier verification"""
        user_id = 1
        api_key, plain_key = await api_key_service.create_api_key(
            user_id=user_id,
            name="Test Validation Key",
            scopes="read"
        )
        
        # Validate with correct key
        validated_key = await api_key_service.validate_api_key(plain_key)
        
        assert validated_key is not None
        assert validated_key.user_id == user_id
        assert validated_key.name == "Test Validation Key"
        assert validated_key.is_active is True
    
    @pytest.mark.asyncio
    async def test_validate_api_key_with_wrong_key(self, api_key_service, db_session):
        """Test API key validation fails with wrong key"""
        user_id = 1
        await api_key_service.create_api_key(
            user_id=user_id,
            name="Test Key",
            scopes="read"
        )
        
        # Try to validate with wrong key
        wrong_key = "dk_wrong_key_12345678901234567890"
        validated_key = await api_key_service.validate_api_key(wrong_key)
        
        assert validated_key is None
    
    @pytest.mark.asyncio
    async def test_validate_inactive_key(self, api_key_service, db_session):
        """Test validation fails for inactive keys"""
        user_id = 1
        api_key, plain_key = await api_key_service.create_api_key(
            user_id=user_id,
            name="Test Inactive Key",
            scopes="read"
        )
        
        # Deactivate the key
        api_key.is_active = False
        await db_session.commit()
        
        # Try to validate
        validated_key = await api_key_service.validate_api_key(plain_key)
        
        assert validated_key is None
    
    @pytest.mark.asyncio
    async def test_validate_expired_key(self, api_key_service, db_session):
        """Test validation fails for expired keys"""
        user_id = 1
        api_key, plain_key = await api_key_service.create_api_key(
            user_id=user_id,
            name="Test Expired Key",
            scopes="read"
        )
        
        # Set expiration to past
        api_key.expires_at = datetime.utcnow() - timedelta(days=1)
        await db_session.commit()
        
        # Try to validate
        validated_key = await api_key_service.validate_api_key(plain_key)
        
        assert validated_key is None
    
    @pytest.mark.asyncio
    async def test_private_key_1_most_secure(self, api_key_service):
        """Test that private_key_1 uses HMAC (most secure)"""
        plain_key = "dk_test_security_key"
        
        keys = api_key_service.derive_two_tier_keys(plain_key)
        
        # private_key_1 should be different from simple SHA256 hash
        import hashlib
        simple_hash = hashlib.sha256(plain_key.encode()).hexdigest()
        
        # HMAC output should be different from simple hash
        assert keys["private_key_1"] != simple_hash
        
        # private_key_2 should also be different (uses public_key_1 as input)
        assert keys["private_key_2"] != simple_hash
        assert keys["private_key_2"] != keys["private_key_1"]
    
    @pytest.mark.asyncio
    async def test_public_keys_are_sha256_only(self, api_key_service):
        """Test that public keys use SHA256 (no HMAC)"""
        plain_key = "dk_test_public_keys"
        
        keys = api_key_service.derive_two_tier_keys(plain_key)
        
        import hashlib
        
        # public_key_1 should be SHA256 of plain_key
        expected_public_key_1 = hashlib.sha256(plain_key.encode()).hexdigest()
        assert keys["public_key_1"] == expected_public_key_1
        
        # public_key_2 should be SHA256 of public_key_1
        expected_public_key_2 = hashlib.sha256(keys["public_key_1"].encode()).hexdigest()
        assert keys["public_key_2"] == expected_public_key_2
    
    @pytest.mark.asyncio
    async def test_get_api_key_by_private_key_2(self, api_key_service, db_session):
        """Test lookup by private_key_2"""
        user_id = 1
        api_key, plain_key = await api_key_service.create_api_key(
            user_id=user_id,
            name="Test Lookup Key",
            scopes="read"
        )
        
        private_key_2 = api_key.private_key_2
        
        # Lookup by private_key_2
        found_key = await api_key_service.get_api_key_by_private_key_2(private_key_2)
        
        assert found_key is not None
        assert found_key.id == api_key.id
        assert found_key.user_id == user_id
    
    @pytest.mark.asyncio
    async def test_legacy_key_backward_compatibility(self, api_key_service, db_session):
        """Test that legacy keys (hashed_key only) still work"""
        # Create a legacy key manually
        legacy_plain_key = "dk_legacy_key_12345678901234567890"
        legacy_hashed_key = api_key_service.hash_key(legacy_plain_key)
        
        import uuid
        legacy_key = TestApiKey(
            id=str(uuid.uuid4()),
            user_id=1,
            name="Legacy Key",
            prefix=legacy_plain_key[:8],
            hashed_key=legacy_hashed_key,
            scopes="read",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            last_reset_at=datetime.utcnow()
        )
        
        db_session.add(legacy_key)
        await db_session.commit()
        
        # Validate legacy key
        validated_key = await api_key_service.validate_api_key(legacy_plain_key)
        
        assert validated_key is not None
        assert validated_key.user_id == 1
        assert validated_key.name == "Legacy Key"
        assert validated_key.private_key_2 is None  # Legacy keys don't have 2-tier keys


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
