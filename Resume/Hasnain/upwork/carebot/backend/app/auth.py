import jwt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security = HTTPBearer()

def create_token(user_id: str, role: str, clinic_id: str, extra: dict | None = None) -> str:
    """Create a JWT token. role is 'patient' or 'staff'."""
    payload = {
        "sub": user_id,
        "role": role,
        "clinic_id": clinic_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "iat": datetime.now(timezone.utc),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> dict:
    """Verify and decode a JWT token. Raises HTTPException on failure."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """FastAPI dependency: returns decoded token payload."""
    return verify_token(credentials.credentials)

async def get_current_patient(user: dict = Depends(get_current_user)) -> dict:
    """FastAPI dependency: ensures user is a patient."""
    if user.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Patient access required")
    return user

async def get_current_staff(user: dict = Depends(get_current_user)) -> dict:
    """FastAPI dependency: ensures user is staff."""
    if user.get("role") != "staff":
        raise HTTPException(status_code=403, detail="Staff access required")
    return user
