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


# --- Teacher auth (Supabase GoTrue JWT) ---
# Imported here (not at the top) to keep all supabase_client imports co-located with
# their consumers and avoid any load-order surprises at import time.
from app.core.supabase_client import get_supabase


def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency — validates a Supabase GoTrue JWT for a teacher session.

    Returns {"id": "<teacher_uuid>"} on success.
    Raises 401 if the token is invalid or expired.
    """
    supabase = get_supabase()
    response = supabase.auth.get_user(credentials.credentials)
    if not response or not response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired teacher session",
        )
    return {"id": str(response.user.id)}


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency — validates an admin JWT.

    Returns {"id": "<admin_uuid>"} on success.
    Raises 403 if user is not admin, 401 if token is invalid.
    """
    supabase = get_supabase()
    response = supabase.auth.get_user(credentials.credentials)
    if not response or not response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    # Query teachers table for role
    try:
        result = supabase.table("teachers").select("role").eq("id", str(response.user.id)).execute()
        if not result.data or result.data[0]["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied — admin role required",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Failed to verify admin role",
        )

    return {"id": str(response.user.id)}
