"""
Authentication Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_user_id
from app.services.storage import StorageService
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate
from app.schemas.auth import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Mockup users for development
MOCK_USERS = {
    "admin": {
        "password": "admin123",
        "id": "1",
        "email": "admin@docextract.com",
        "first_name": "Admin",
        "last_name": "User",
        "profile_image_url": None,
    },
    "demo": {
        "password": "demo123",
        "id": "2",
        "email": "demo@docextract.com",
        "first_name": "Demo",
        "last_name": "User",
        "profile_image_url": None,
    },
    "test": {
        "password": "test123",
        "id": "36691541",
        "email": "test@docextract.com",
        "first_name": "Test",
        "last_name": "User",
        "profile_image_url": None,
    },
}


@router.get("/user")
async def get_auth_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated user"""
    user_data = request.session.get("user")
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user_data.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Get user from database
    storage = StorageService(db)
    user = await storage.get_user(user_id)
    
    if not user:
        # Clear invalid session
        request.session.clear()
        raise HTTPException(status_code=401, detail="User not found")
    
    return UserResponse.model_validate(user)


@router.get("/me")
async def get_current_user_info(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get current user info (alias for /user)"""
    return await get_auth_user(request, db)


@router.post("/login")
async def login(
    login_data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Login with username and password (mockup)"""
    username = login_data.username.lower()
    password = login_data.password
    
    # Check if user exists in mock users
    if username not in MOCK_USERS:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    mock_user = MOCK_USERS[username]
    
    # Verify password
    if mock_user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Get or create user in database
    storage = StorageService(db)
    user = await storage.get_user(mock_user["id"])
    
    if not user:
        # Create user if not exists
        user = await storage.upsert_user(UserCreate(
            id=mock_user["id"],
            email=mock_user["email"],
            first_name=mock_user["first_name"],
            last_name=mock_user["last_name"],
            profile_image_url=mock_user["profile_image_url"],
        ))
    
    # Set session
    request.session["user"] = {
        "sub": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profile_image_url": user.profile_image_url,
    }
    
    print(f"[Login] Successfully logged in as: {user.email}")
    
    return {
        "success": True,
        "message": "Login successful",
        "user": UserResponse.model_validate(user),
    }


@router.post("/mock-login")
async def mock_login(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Mock login for development (auto-login as test user)"""
    from app.core.config import get_settings
    settings = get_settings()
    
    if settings.node_env == "production":
        raise HTTPException(status_code=403, detail="Mock login disabled in production")
    
    # Use test user
    mock_user = MOCK_USERS["test"]
    
    # Get or create user in database
    storage = StorageService(db)
    user = await storage.get_user(mock_user["id"])
    
    if not user:
        user = await storage.upsert_user(UserCreate(
            id=mock_user["id"],
            email=mock_user["email"],
            first_name=mock_user["first_name"],
            last_name=mock_user["last_name"],
            profile_image_url=mock_user["profile_image_url"],
        ))
    
    # Set session
    request.session["user"] = {
        "sub": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profile_image_url": user.profile_image_url,
    }
    
    print(f"[Mock Login] Successfully logged in as: {user.email}")
    return {"user": UserResponse.model_validate(user)}


@router.post("/logout")
async def logout(request: Request):
    """Logout and clear session"""
    request.session.clear()
    print("[Logout] Session cleared")
    return {"success": True, "message": "Logged out successfully"}


@router.get("/session")
async def get_session(request: Request):
    """Debug: Get session info"""
    user_data = request.session.get("user")
    return {
        "authenticated": user_data is not None,
        "user": user_data,
    }


# ============ Replit OAuth Routes ============

@router.get("/replit")
async def replit_oauth_redirect(request: Request):
    """Redirect to Replit OAuth"""
    from fastapi.responses import RedirectResponse
    from app.core.config import get_settings
    import urllib.parse
    
    settings = get_settings()
    
    # Check if running on Replit
    if not settings.repl_id:
        raise HTTPException(
            status_code=400, 
            detail="Replit OAuth is only available when running on Replit"
        )
    
    # Build the authorization URL
    # Replit uses OpenID Connect
    base_url = settings.issuer_url
    redirect_uri = f"https://{request.headers.get('host')}/api/auth/replit/callback"
    
    params = {
        "client_id": settings.repl_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid profile email",
    }
    
    auth_url = f"{base_url}/authorize?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/replit/callback")
async def replit_oauth_callback(
    request: Request,
    code: str = None,
    error: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle Replit OAuth callback"""
    from fastapi.responses import RedirectResponse
    from app.core.config import get_settings
    import httpx
    
    if error:
        print(f"[Replit OAuth] Error: {error}")
        return RedirectResponse(url="/login?error=oauth_failed")
    
    if not code:
        return RedirectResponse(url="/login?error=no_code")
    
    settings = get_settings()
    redirect_uri = f"https://{request.headers.get('host')}/api/auth/replit/callback"
    
    try:
        # Exchange code for token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                f"{settings.issuer_url}/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": settings.repl_id,
                },
            )
            
            if token_response.status_code != 200:
                print(f"[Replit OAuth] Token error: {token_response.text}")
                return RedirectResponse(url="/login?error=token_failed")
            
            tokens = token_response.json()
            
            # Get user info
            userinfo_response = await client.get(
                f"{settings.issuer_url}/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            
            if userinfo_response.status_code != 200:
                print(f"[Replit OAuth] Userinfo error: {userinfo_response.text}")
                return RedirectResponse(url="/login?error=userinfo_failed")
            
            userinfo = userinfo_response.json()
        
        # Create or update user
        storage = StorageService(db)
        user_id = str(userinfo.get("sub", userinfo.get("id")))
        
        user = await storage.get_user(user_id)
        if not user:
            user = await storage.upsert_user(UserCreate(
                id=user_id,
                email=userinfo.get("email", f"{user_id}@replit.user"),
                first_name=userinfo.get("given_name", userinfo.get("name", "Replit")),
                last_name=userinfo.get("family_name", "User"),
                profile_image_url=userinfo.get("picture"),
            ))
        
        # Set session
        request.session["user"] = {
            "sub": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "profile_image_url": user.profile_image_url,
        }
        
        print(f"[Replit OAuth] Successfully logged in as: {user.email}")
        return RedirectResponse(url="/dashboard")
        
    except Exception as e:
        print(f"[Replit OAuth] Exception: {e}")
        return RedirectResponse(url="/login?error=oauth_exception")
