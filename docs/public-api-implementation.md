# Public Extract API & Usage Tracking

## Overview
This implementation provides a complete public API system with usage tracking, ready to be integrated with API Key authentication when the schema is available.

## Components Created

### 1. API Key Authentication Middleware
**File**: `backend/app/middlewares/api_auth.py`

- ✅ Placeholder for API Key validation
- ✅ Quota checking logic
- ✅ Ready to integrate with API Key service
- ⏳ **Pending**: API Key schema & CRUD service

**Usage**:
```python
from app.middlewares.api_auth import verify_api_key

@router.post("/endpoint")
async def my_endpoint(
    api_key: ApiKeyPlaceholder = Depends(verify_api_key)
):
    # api_key contains user_id, monthly_limit, monthly_usage
    pass
```

---

### 2. Public Extract Endpoints
**File**: `backend/app/routes/public_extract.py`

#### Endpoints:
- `POST /api/v1/public/extract/process` - Template-based extraction
- `POST /api/v1/public/extract/general` - General document parsing
- `GET /api/v1/public/extract/health` - Health check (no auth required)

#### Features:
- ✅ API Key authentication (placeholder)
- ✅ Quota checking before processing
- ✅ File validation and size limits
- ✅ Usage tracking integration
- ✅ Detailed error responses

#### Example Request:
```bash
curl -X POST "http://localhost:8000/api/v1/public/extract/process" \
  -H "X-API-Key: your-api-key-here" \
  -F "file=@resume.pdf" \
  -F "documentType=resume"
```

#### Example Response:
```json
{
  "success": true,
  "extractedData": { ... },
  "pagesProcessed": 2,
  "apiKeyUsage": {
    "used": 102,
    "limit": 1000,
    "remaining": 898
  }
}
```

---

### 3. Usage Logging Service
**File**: `backend/app/services/usage_logging_service.py`

#### Features:
- ✅ Log every API request to `api_usage_logs` table
- ✅ Track response times, pages processed, errors
- ✅ Analytics queries (stats by endpoint, time period)
- ✅ Recent logs retrieval

#### Methods:
- `log_request()` - Log a single API request
- `get_api_key_usage_stats()` - Get usage statistics
- `get_endpoint_usage_stats()` - Stats grouped by endpoint
- `get_recent_logs()` - Get recent request logs

#### Example Usage:
```python
logging_service = UsageLoggingService(db)
await logging_service.log_request(
    api_key_id="key-123",
    endpoint="/api/v1/public/extract/process",
    method="POST",
    status_code=200,
    response_time_ms=1234,
    pages_processed=2,
    request_metadata={"document_type": "resume"},
)
```

---

### 4. Usage Logging Middleware
**File**: `backend/app/middlewares/usage_logging.py`

#### Features:
- ✅ Automatic logging for all `/api/v1/public/*` endpoints
- ✅ Tracks request/response times
- ✅ Captures client IP and user agent
- ✅ Error tracking
- ✅ Helper function for manual detailed logging

#### Integration:
Already integrated in `main.py`:
```python
app.add_middleware(UsageLoggingMiddleware)
```

---

### 5. Monthly Usage Reset Scheduler
**File**: `backend/app/tasks/scheduler.py`

#### Features:
- ✅ APScheduler-based cron job
- ✅ Runs on 1st of every month at 00:00 UTC
- ✅ Resets `monthly_usage` for Users
- ✅ Ready to reset API Keys (commented until schema exists)
- ✅ Daily health check job
- ✅ Manual test function

#### Jobs:
1. **Monthly Reset** - Cron: `0 0 1 * *` (1st day, midnight)
   - Resets `users.monthly_usage` to 0
   - Updates `last_reset_at` timestamp
   - Ready for `api_keys.monthly_usage` reset

2. **Health Check** - Cron: `0 0 * * *` (daily, midnight)
   - Prints scheduler status
   - Shows next run times

#### Manual Testing:
```bash
cd backend
python -m app.tasks.scheduler
```

#### Integration:
Already integrated in `main.py` lifespan:
```python
from app.tasks.scheduler import get_scheduler
scheduler = get_scheduler()
scheduler.start()  # On startup
scheduler.shutdown()  # On shutdown
```

---

## Database Schema Requirements

### Current Status
✅ `api_usage_logs` table already exists in schema
⏳ `api_keys` table **NOT YET CREATED** - waiting for schema migration

### Required for Full Functionality

#### api_keys table (from existing model)
```python
class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String(255))
    prefix = Column(String(8))  # e.g., "dae_abc1"
    hashed_key = Column(String(255), unique=True)
    
    monthly_limit = Column(Integer, default=1000)
    monthly_usage = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    scopes = Column(Text, default="extract,read")
    
    last_used_at = Column(DateTime)
    last_reset_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
```

---

## What's Next: Integration Steps

### Step 1: Create API Key Schema & Migration
**Required**:
1. Create Alembic migration for `api_keys` table
2. Run migration to create table
3. Update `ApiKeyPlaceholder` to use real `ApiKey` model

### Step 2: Implement API Key CRUD Service
**File to create**: `backend/app/services/api_key_service.py`

**Required methods**:
- `create_api_key(user_id, name)` - Generate new API key
- `validate_api_key(raw_key)` - Validate and return ApiKey object
- `update_usage(api_key_id, pages)` - Update usage counter
- `list_user_api_keys(user_id)` - List user's API keys
- `revoke_api_key(api_key_id)` - Deactivate key
- `reset_monthly_usage(api_key_id)` - Reset usage counter

### Step 3: Update API Auth Middleware
**File**: `backend/app/middlewares/api_auth.py`

Replace placeholder logic with:
```python
from app.services.api_key_service import ApiKeyService

async def verify_api_key(x_api_key: str, db: AsyncSession):
    api_key_service = ApiKeyService(db)
    api_key = await api_key_service.validate_api_key(x_api_key)
    
    if not api_key or not api_key.is_active:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Update last_used_at
    await api_key_service.update_last_used(api_key.id)
    
    return api_key
```

### Step 4: Update Scheduler
**File**: `backend/app/tasks/scheduler.py`

Uncomment API Keys reset logic:
```python
# Line ~55: Uncomment this block
api_key_result = await db.execute(
    text("""
        UPDATE api_keys 
        SET monthly_usage = 0, 
            last_reset_at = :reset_time
        WHERE monthly_usage > 0
    """),
    {"reset_time": datetime.utcnow()}
)
api_keys_reset = api_key_result.rowcount
```

### Step 5: Test End-to-End
1. Generate API key via service
2. Call public endpoint with X-API-Key header
3. Verify usage logged to `api_usage_logs`
4. Check quota enforcement
5. Test monthly reset (manual trigger)

---

## Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `DATABASE_URL` - For logging and scheduler
- `LLAMA_CLOUD_API_KEY` - For extraction services
- `OPENAI_API_KEY` - For embeddings (optional)

### Dependencies Added
**File**: `backend/requirements.txt`

Added:
```
apscheduler==3.10.4  # For monthly reset cron job
```

Install:
```bash
cd backend
pip install -r requirements.txt
```

---

## Testing

### Test Public Endpoint (will return 501 until API Key service ready)
```bash
curl -X GET "http://localhost:8000/api/v1/public/extract/health"

# Expected response:
{
  "status": "healthy",
  "service": "public-extract-api",
  "version": "1.0.0",
  "note": "API Key authentication pending schema implementation"
}
```

### Test with API Key (after implementation)
```bash
curl -X POST "http://localhost:8000/api/v1/public/extract/process" \
  -H "X-API-Key: dae_your_key_here" \
  -F "file=@document.pdf" \
  -F "documentType=invoice"
```

### Test Monthly Reset Scheduler
```bash
cd backend
python -m app.tasks.scheduler
```

### Check Scheduler Logs
Start the server and check console:
```
[Scheduler] Monthly reset scheduler started
  - Reset monthly usage counters: next run at 2025-01-01 00:00:00
  - Scheduler health check: next run at 2025-12-30 00:00:00
```

---

## API Documentation

Once API Keys are enabled, full API documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

Endpoints will show up under the `public-extract` tag.

---

## Security Notes

1. **API Key Format**: Should use prefix for identification (e.g., `dae_abc123xyz`)
2. **Hashing**: Store SHA-256 hash of API key, not plain text
3. **Rate Limiting**: Consider adding rate limiting per API key
4. **CORS**: Update CORS settings for production domains
5. **HTTPS**: Always use HTTPS in production for API key transmission

---

## Monitoring & Analytics

### Usage Statistics
Query `api_usage_logs` table for:
- Total requests per API key
- Average response times
- Error rates
- Most used endpoints
- Peak usage times

### Example Query:
```sql
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_requests,
    AVG(response_time_ms) as avg_response_time,
    SUM(pages_processed) as total_pages
FROM api_usage_logs
WHERE api_key_id = 'key-123'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

---

## Summary

### ✅ Completed
1. API Key authentication middleware (placeholder)
2. Public extract endpoints (2 endpoints)
3. Usage logging service
4. Usage logging middleware
5. Monthly reset scheduler
6. Integration with main.py
7. Health check endpoint

### ⏳ Pending (Blocked by API Key Schema)
1. API Key table creation
2. API Key CRUD service
3. Real API key validation
4. API key generation UI/endpoints
5. Full end-to-end testing

### 🎯 Ready State
The system is **fully prepared** to receive API Key functionality. Once the schema and service are implemented, simply:
1. Remove `ApiKeyPlaceholder`
2. Import real `ApiKey` model
3. Uncomment API key reset in scheduler
4. Test end-to-end

**Estimated integration time**: 1-2 hours after API Key service is ready.
