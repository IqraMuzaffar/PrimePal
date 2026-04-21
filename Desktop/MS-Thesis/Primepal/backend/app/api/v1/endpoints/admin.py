"""
Admin endpoints for managing teachers, classrooms, and curriculum.
All endpoints require admin role verification via get_current_admin dependency.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import secrets

from app.core.security import get_current_admin
from app.core.supabase_client import get_supabase, get_supabase_admin

router = APIRouter(prefix="/admin", tags=["admin"])


# ─────────────────────────────────────────────────────────────
# ADMIN INVITE CODES
# ─────────────────────────────────────────────────────────────

class AdminInviteRequest(BaseModel):
    email: str
    expires_in_days: int = 7


@router.post("/invite-code")
async def create_admin_invite(
    req: AdminInviteRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Create an invite code for a new admin (self-service from existing admin)."""
    supabase_admin = get_supabase_admin()

    # Generate secure code
    code = secrets.token_urlsafe(24)

    # Insert invite code
    expires_at = datetime.now(tz=timezone.utc) + timedelta(days=req.expires_in_days)

    try:
        result = supabase_admin.table("admin_invite_codes").insert({
            "code": code,
            "email": req.email,
            "created_by": current_admin["id"],
            "expires_at": expires_at.isoformat(),
        }).execute()

        # Log action
        supabase_admin.table("admin_audit_log").insert({
            "admin_id": current_admin["id"],
            "action": "create_invite_code",
            "resource_type": "admin_invite",
            "resource_id": code,
            "details": {"email": req.email},
        }).execute()

        return {
            "code": code,
            "email": req.email,
            "expires_at": expires_at.isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create invite: {str(e)}")


@router.post("/validate-invite-code")
async def validate_invite_code(code: str):
    """Validate an invite code before signup (public endpoint)."""
    supabase_admin = get_supabase_admin()

    try:
        codes = supabase_admin.table("admin_invite_codes").select("*").eq("code", code).execute()

        if not codes.data:
            raise HTTPException(status_code=400, detail="Invalid invite code")

        code_record = codes.data[0]

        if code_record.get("used_at"):
            raise HTTPException(status_code=400, detail="Invite code already used")

        expires_at = datetime.fromisoformat(code_record["expires_at"])
        if expires_at < datetime.now(tz=timezone.utc):
            raise HTTPException(status_code=400, detail="Invite code expired")

        return {
            "valid": True,
            "email": code_record["email"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")
