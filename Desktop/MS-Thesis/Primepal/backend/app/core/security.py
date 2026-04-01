"""
Feature 1: JWT utilities for student authentication.
Teachers authenticate via Supabase Auth (GoTrue) — no custom JWT needed for them.
Students use a custom HS256 JWT because they are not Supabase Auth users.
"""
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

_bearer = HTTPBearer(auto_error=True)

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def create_student_token(student_id: str, classroom_id: str) -> str:
    """Mint a signed JWT for a student session."""
    payload = {
        "sub": student_id,
        "classroom_id": classroom_id,
        "role": "student",
        "exp": datetime.now(tz=timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, settings.STUDENT_JWT_SECRET, algorithm=ALGORITHM)


def decode_student_token(token: str) -> dict:
    """Decode and validate a student JWT. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(
            token,
            settings.STUDENT_JWT_SECRET,
            algorithms=[ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Student token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid student token",
        )

    if payload.get("role") != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token is not a student token",
        )

    return payload


def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency — extracts and validates the student JWT from the Authorization header."""
    return decode_student_token(credentials.credentials)
