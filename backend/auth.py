from fastapi import Header, HTTPException, Depends
from typing import Optional
import jwt
import os
from database import get_database, COLLECTIONS
from models import UserRole

# Supabase JWT secret - will be used to validate tokens
SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET', '')

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Validate Supabase JWT token and return user info
    For now, simplified - in production, validate against Supabase
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    try:
        # Extract token from "Bearer <token>"
        token = authorization.replace("Bearer ", "")
        
        # For development: Simple token validation
        # In production: Validate Supabase JWT
        if SUPABASE_JWT_SECRET:
            payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get('sub')
        else:
            # Development mode: Accept token as user_id
            user_id = token
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user from database
        db = get_database()
        user = await db[COLLECTIONS['users']].find_one({'supabase_user_id': user_id})
        
        if not user:
            # Auto-create user if doesn't exist (first login)
            # This is simplified - in production, sync with Supabase properly
            raise HTTPException(status_code=404, detail="User not found. Please complete registration.")
        
        return user
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def require_role(required_roles: list[UserRole]):
    """Dependency to require specific user roles"""
    async def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get('role')
        if user_role not in [r.value for r in required_roles]:
            raise HTTPException(
                status_code=403, 
                detail=f"Insufficient permissions. Required roles: {[r.value for r in required_roles]}"
            )
        return current_user
    return role_checker

async def get_current_vendor(current_user: dict = Depends(get_current_user)) -> dict:
    """Get vendor profile for current user"""
    db = get_database()
    vendor = await db[COLLECTIONS['vendors']].find_one({'user_id': current_user['id']})
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    
    return vendor

async def require_approved_vendor(current_user: dict = Depends(get_current_user)) -> dict:
    """Require user to be an approved vendor"""
    vendor = await get_current_vendor(current_user)
    
    if not vendor.get('is_approved'):
        raise HTTPException(
            status_code=403, 
            detail="Vendor account pending approval"
        )
    
    return vendor

async def optional_auth(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Optional authentication - returns user if authenticated, None otherwise"""
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization)
    except:
        return None
