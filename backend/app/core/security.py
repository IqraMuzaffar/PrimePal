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
from app.core.cache import cache_get, cache_set

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
from app.core.supabase_client import get_supabase, get_supabase_admin


async def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency — validates a Supabase GoTrue JWT for a teacher session.

    Returns {"id": "<teacher_uuid>", "role": str, "is_admin": bool} on success.
    Raises 401 if the token is invalid or expired.
    Role is cached in Redis for 1 hour to avoid repeated DB queries.
    """
    supabase = get_supabase()
    try:
        response = supabase.auth.get_user(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired teacher session")
    if not response or not response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired teacher session")

    user_id = str(response.user.id)

    cached_role = await cache_get(f"teacher_role:{user_id}")
    if cached_role:
        return {"id": user_id, "role": cached_role, "is_admin": cached_role == "admin"}

    try:
        admin_client = get_supabase_admin()
        result = (
            admin_client.table("teachers")
            .select("role")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        role = result.data.get("role", "teacher") if result.data else "teacher"
    except Exception:
        role = "teacher"
    await cache_set(f"teacher_role:{user_id}", role, ttl=3600)

    return {"id": user_id, "role": role, "is_admin": role == "admin"}


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency — validates an admin JWT.

    Returns {"id": "<admin_uuid>"} on success.
    Raises 403 if user is not admin, 401 if token is invalid.
    Role is cached in Redis for 1 hour to avoid repeated DB queries.
    """
    supabase = get_supabase()
    try:
        response = supabase.auth.get_user(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )
    if not response or not response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    user_id = str(response.user.id)

    cached_role = await cache_get(f"teacher_role:{user_id}")
    if cached_role:
        if cached_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied — admin role required",
            )
        return {"id": user_id}

    # Cache miss — query DB (use admin client to bypass RLS)
    try:
        admin_client = get_supabase_admin()
        result = admin_client.table("teachers").select("role").eq("id", user_id).execute()
        if not result.data or result.data[0]["role"] != "admin":
            # Cache the non-admin role so subsequent calls are fast
            if result.data:
                await cache_set(f"teacher_role:{user_id}", result.data[0].get("role", "teacher"), ttl=3600)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied — admin role required",
            )
        await cache_set(f"teacher_role:{user_id}", "admin", ttl=3600)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Failed to verify admin role",
        )

    return {"id": user_id}
