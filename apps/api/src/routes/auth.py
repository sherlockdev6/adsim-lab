"""
Authentication endpoints (MVP mock implementation).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
from jose import jwt
import uuid

from src.core.config import settings

router = APIRouter()


class LoginRequest(BaseModel):
    """Mock login request schema."""
    email: EmailStr


class LoginResponse(BaseModel):
    """Login response with JWT token."""
    access_token: str
    token_type: str
    expires_in: int
    user: dict


class UserResponse(BaseModel):
    """User information response."""
    id: str
    email: str
    name: str


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.jwt_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


@router.post("/mock-login", response_model=LoginResponse)
async def mock_login(request: LoginRequest) -> LoginResponse:
    """
    Mock login endpoint for MVP.
    
    In production, this would validate credentials against a database.
    For MVP, any valid email gets a token with a generated user ID.
    """
    # Generate deterministic user ID from email (for consistency)
    user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, request.email))
    
    # Create user data
    user_data = {
        "id": user_id,
        "email": request.email,
        "name": request.email.split("@")[0].replace(".", " ").title(),
    }
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user_id, "email": request.email},
        expires_delta=timedelta(minutes=settings.jwt_expire_minutes),
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expire_minutes * 60,
        user=user_data,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user():
    """
    Get current user information.
    
    Note: In production, this would decode the JWT from the Authorization header.
    For MVP, returns a placeholder.
    """
    # TODO: Implement proper JWT validation
    raise HTTPException(
        status_code=401,
        detail="Authorization header required",
        headers={"WWW-Authenticate": "Bearer"},
    )
