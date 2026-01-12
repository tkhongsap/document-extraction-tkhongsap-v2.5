# 2-Tier API Key Security System

## Overview
This document describes the implementation of the 2-tier API key hashing system for enhanced security.

## Architecture

### Key Derivation Process

```
Plain API Key (dk_xxx...)
    ↓
┌─────────────────────────────────────┐
│         ROUND 1 (Tier 1)            │
│                                     │
│  Input: plain_key                   │
│  Secret: API_KEY_SECRET_TIER_1      │
│                                     │
│  private_key_1 = HMAC-SHA256(       │
│      secret=TIER_1,                 │
│      msg=plain_key                  │
│  )  ← MOST SECURE, NEVER EXPOSED    │
│                                     │
│  public_key_1 = SHA256(plain_key)   │
│                                     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         ROUND 2 (Tier 2)            │
│                                     │
│  Input: public_key_1                │
│  Secret: API_KEY_SECRET_TIER_2      │
│                                     │
│  private_key_2 = HMAC-SHA256(       │
│      secret=TIER_2,                 │
│      msg=public_key_1               │
│  )  ← USED FOR VERIFICATION         │
│                                     │
│  public_key_2 = SHA256(public_key_1)│
│     ← DISPLAYED TO USERS            │
│                                     │
└─────────────────────────────────────┘
```

## Database Schema

### ApiKey Table Columns

| Column | Type | Description | Security Level |
|--------|------|-------------|----------------|
| `private_key_1` | TEXT | HMAC-SHA256 with TIER_1 secret | **MOST SECURE** - Encrypted at rest |
| `public_key_1` | VARCHAR(64) | SHA256 hash of plain key | Used as input for Tier 2 |
| `private_key_2` | VARCHAR(64) | HMAC-SHA256 with TIER_2 secret | **VERIFICATION KEY** - Indexed |
| `public_key_2` | VARCHAR(64) | SHA256 hash of public_key_1 | **DISPLAYED TO USERS** |
| `hashed_key` | VARCHAR(64) | Legacy SHA256 hash (nullable) | Backward compatibility |

### Indexes

```sql
CREATE INDEX idx_api_keys_private_key_2 ON api_keys(private_key_2);
CREATE INDEX idx_api_keys_public_key_2 ON api_keys(public_key_2);
```

### Constraints

```sql
-- Ensure uniqueness of verification key
ALTER TABLE api_keys ADD CONSTRAINT uq_api_keys_private_key_2 UNIQUE (private_key_2);

-- Ensure either legacy or new keys are present
ALTER TABLE api_keys ADD CONSTRAINT chk_api_keys_has_hash CHECK (
    (hashed_key IS NOT NULL) OR 
    (private_key_2 IS NOT NULL AND public_key_2 IS NOT NULL)
);
```

## Configuration

### Environment Variables

Add to `.env`:

```bash
# API Key Security Secrets (2-Tier Hashing)
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(64))"
API_KEY_SECRET_TIER_1=your-tier1-secret-for-private-key-1-most-secure
API_KEY_SECRET_TIER_2=your-tier2-secret-for-verification
```

**IMPORTANT**: 
- Use different secrets for each tier
- TIER_1 secret must be the most secure (highest entropy)
- Never commit secrets to version control
- Rotate secrets periodically

## Security Properties

### 1. Private Key 1 (Most Secure)
- Uses HMAC-SHA256 with SECRET_TIER_1
- **Never** used directly for verification
- Stored encrypted in database
- Only accessible to administrators
- Cannot be derived from public_key_1 alone

### 2. Public Key 1 (Intermediate)
- Simple SHA256 of plain key
- Used as input for Round 2
- Not exposed to end users
- Cannot reverse to plain key

### 3. Private Key 2 (Verification)
- Uses HMAC-SHA256 with SECRET_TIER_2
- **Primary verification key**
- Indexed for fast lookups
- Unique constraint enforced
- Cannot be derived without SECRET_TIER_2

### 4. Public Key 2 (Display)
- Simple SHA256 of public_key_1
- **Safe to show to users**
- Used for key identification
- Cannot reverse to any secrets

## API Usage

### Creating API Keys

```python
from app.services.api_key_service import ApiKeyService

api_key_service = ApiKeyService(db_session)

# Create new key with 2-tier security
key_data = await api_key_service.create_api_key(
    user_id=1,
    name="Production API Key",
    scopes=["read", "write"],
    expires_in_days=365
)

# Show to user (ONLY TIME plain key is available)
print(f"API Key: {key_data['plain_key']}")
print(f"Public Key (for reference): {key_data['key'].public_key_2}")

# Key is now stored with:
# - private_key_1: HMAC(TIER_1, plain_key) [most secure]
# - public_key_1: SHA256(plain_key)
# - private_key_2: HMAC(TIER_2, public_key_1) [verification]
# - public_key_2: SHA256(public_key_1) [display]
```

### Validating API Keys

```python
# User provides plain API key in request header
plain_key = request.headers.get("X-API-Key")

# Validate using 2-tier system
api_key = await api_key_service.validate_api_key(plain_key)

if api_key:
    # Key is valid, proceed with request
    print(f"Authenticated as user {api_key.user_id}")
else:
    # Invalid or expired key
    raise HTTPException(status_code=401, detail="Invalid API key")
```

### Verification Flow

```
1. User provides: dk_abc123...
2. System derives: private_key_2 = HMAC(TIER_2, SHA256(dk_abc123...))
3. Database lookup: SELECT * FROM api_keys WHERE private_key_2 = ?
4. If found and active: Authentication successful
5. If not found: Try legacy hashed_key (backward compatibility)
```

## Migration Guide

### Step 1: Run Database Migration

```bash
cd backend
psql $DATABASE_URL -f migrations/add_two_tier_api_key_columns.sql
```

Or manually:

```sql
-- Add new columns
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS private_key_1 TEXT,
ADD COLUMN IF NOT EXISTS public_key_1 VARCHAR(64),
ADD COLUMN IF NOT EXISTS private_key_2 VARCHAR(64),
ADD COLUMN IF NOT EXISTS public_key_2 VARCHAR(64);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_private_key_2 ON api_keys(private_key_2);
CREATE INDEX IF NOT EXISTS idx_api_keys_public_key_2 ON api_keys(public_key_2);

-- Add constraints
ALTER TABLE api_keys ADD CONSTRAINT uq_api_keys_private_key_2 UNIQUE (private_key_2);
ALTER TABLE api_keys ALTER COLUMN hashed_key DROP NOT NULL;
```

### Step 2: Update Configuration

Add secrets to `.env`:

```bash
API_KEY_SECRET_TIER_1=$(python -c "import secrets; print(secrets.token_urlsafe(64))")
API_KEY_SECRET_TIER_2=$(python -c "import secrets; print(secrets.token_urlsafe(64))")
```

### Step 3: Deploy Updated Code

The service automatically handles:
- ✅ New keys created with 2-tier hashing
- ✅ Legacy keys still validated via `hashed_key`
- ✅ Backward compatibility maintained

### Step 4: (Optional) Migrate Legacy Keys

To migrate existing keys, users must regenerate them (plain keys cannot be recovered):

1. Notify users to regenerate API keys
2. Provide grace period for transition
3. Eventually deprecate legacy `hashed_key` column

## Security Best Practices

### DO ✅
- Use separate, high-entropy secrets for each tier
- Store `private_key_1` encrypted at rest
- Rotate `SECRET_TIER_1` and `SECRET_TIER_2` periodically
- Show only `public_key_2` to users for identification
- Log authentication attempts with rate limiting
- Use HTTPS for all API requests
- Implement key expiration (expires_at)
- Support key revocation (is_active = false)

### DON'T ❌
- Never expose `private_key_1` or `private_key_2`
- Never use the same secret for both tiers
- Never commit secrets to version control
- Never log plain API keys
- Never reuse API keys across systems
- Never allow plain keys in URLs or GET parameters
- Never skip HTTPS in production

## Testing

Run the test suite:

```bash
cd backend
pytest test_two_tier_api_keys.py -v
```

Expected output:
```
test_derive_two_tier_keys PASSED
test_derive_two_tier_keys_deterministic PASSED
test_derive_two_tier_keys_unique_per_input PASSED
test_create_api_key_stores_two_tier_keys PASSED
test_validate_api_key_with_two_tier_system PASSED
test_validate_api_key_with_wrong_key PASSED
test_validate_inactive_key PASSED
test_validate_expired_key PASSED
test_private_key_1_most_secure PASSED
test_public_keys_are_sha256_only PASSED
test_get_api_key_by_private_key_2 PASSED
test_legacy_key_backward_compatibility PASSED
```

## Performance Considerations

### Lookup Performance
- `private_key_2` is indexed → O(log n) lookup time
- No performance degradation vs. legacy system
- HMAC computation is fast (< 1ms)

### Database Impact
- 4 additional columns per API key
- 2 additional indexes
- Minimal storage overhead (~256 bytes per key)
- Backward compatible with existing keys

## Threat Model

### Attack Scenarios

| Attack | Protection |
|--------|-----------|
| Database breach | `private_key_1` requires `SECRET_TIER_1` to use |
| Rainbow table | HMAC with secret prevents precomputation |
| Timing attacks | Use constant-time comparison in validation |
| Brute force | Rate limiting + high-entropy keys (32 chars) |
| Key reuse | Each key has unique derivation |
| Replay attacks | Add request signing (future enhancement) |

## Future Enhancements

1. **Key Rotation**: Automatic secret rotation without invalidating keys
2. **Request Signing**: Add HMAC signatures to API requests
3. **Key Scopes**: Fine-grained permission control per key
4. **Audit Logging**: Track all key usage and validation attempts
5. **Key Families**: Group related keys with hierarchical permissions

## References

- [HMAC-SHA256 Specification](https://tools.ietf.org/html/rfc2104)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Key Management Best Practices](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
