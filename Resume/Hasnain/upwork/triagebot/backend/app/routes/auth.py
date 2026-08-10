import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Header
from app.config import settings
from app.models.schemas import LoginRequest, LoginResponse

router = APIRouter(tags=["auth"])

USERS = {
    "receptionist": bcrypt.hashpw(b"triage123", bcrypt.gensalt()).decode(),
    "admin": bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode(),
}

def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

async def get_current_user(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/auth/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    stored_hash = USERS.get(body.username)
    if not stored_hash or not bcrypt.checkpw(body.password.encode(), stored_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(body.username)
    return LoginResponse(token=token, username=body.username)
